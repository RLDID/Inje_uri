import bcrypt from 'bcrypt';
import {
  BUS_INJE_CHECK_ENDPOINT,
  INJE_CHECK_FAIL_MESSAGE,
} from '@/lib/auth/constants';
import {
  createUserSession,
  hashBirth,
  issuePreSignupVerification,
  SUSPENDED_USER_STATUS,
  toAuthUserSummary,
  WITHDRAWN_USER_STATUS,
  clearPreSignupVerificationToken,
  consumePreSignupVerificationToken,
} from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { deleteAuthSessionById } from '@/server/repositories/auth/session.repository';
import {
  createUser,
  findUserByEmail,
  findUserByLoginId,
  findUserByNickname,
  findUserByStudentNumber,
} from '@/server/repositories/user/user.repository';

export interface RegisterInput {
  loginId: string;
  password: string;
  nickname: string;
  birth: string;
  age: number;
  studentYear: number;
  department: string;
  gender: 'male' | 'female';
  realName: string;
  email: string;
  university: string;
}

function parseUpstreamInjeBody(rawText: string): { status?: string; message?: string } | null {
  try {
    return JSON.parse(rawText) as { status?: string; message?: string };
  } catch {
    const jsonStart = rawText.lastIndexOf('{');
    if (jsonStart < 0) {
      return null;
    }

    try {
      return JSON.parse(rawText.slice(jsonStart)) as { status?: string; message?: string };
    } catch {
      return null;
    }
  }
}

function normalizeUpstreamMessage(message: string | undefined): string {
  if (!message) {
    return '';
  }

  return message.replace(/\\\//g, '/').trim();
}

export async function verifyInjeStudent(studentNumber: string, birth: string) {
  let upstreamBody: { status?: string; message?: string } | null = null;

  try {
    const upstreamResponse = await fetch(BUS_INJE_CHECK_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        idx: studentNumber,
        birth,
        check: 'N',
      }),
      cache: 'no-store',
    });

    upstreamBody = parseUpstreamInjeBody(await upstreamResponse.text());
  } catch {
    throw new Error('인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }

  if (!upstreamBody) {
    throw new Error('인증 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  const upstreamMessage = normalizeUpstreamMessage(upstreamBody.message);
  if (upstreamMessage === INJE_CHECK_FAIL_MESSAGE) {
    throw new ApiError(ERROR.INVALID_CREDENTIALS, '입력한 정보를 찾을수 없습니다.');
  }

  const token = await issuePreSignupVerification(studentNumber, birth);
  const existingUser = await findUserByStudentNumber(studentNumber);

  return {
    token,
    data: {
      verified: true,
      nextStep: existingUser ? 'login' : 'register',
    },
  };
}

export async function login(input: { loginId: string; password: string }) {
  const user = await findUserByLoginId(input.loginId);

  if (!user) {
    throw new ApiError(ERROR.INVALID_CREDENTIALS, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  const isPasswordMatched = await bcrypt.compare(input.password, user.password_hash);
  if (!isPasswordMatched) {
    throw new ApiError(ERROR.INVALID_CREDENTIALS, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  if (user.deleted_at !== null || user.status === WITHDRAWN_USER_STATUS) {
    throw new ApiError(ERROR.ACCOUNT_WITHDRAWN, '탈퇴한 계정입니다.');
  }

  if (user.status === SUSPENDED_USER_STATUS) {
    throw new ApiError(ERROR.ACCOUNT_SUSPENDED, '정지된 계정입니다.');
  }

  const { token, expiresAt } = await createUserSession(user.id);

  return {
    token,
    expiresAt,
    user: toAuthUserSummary(user),
  };
}

export async function register(input: RegisterInput, preSignupToken: string | null) {
  const preSignup = await consumePreSignupVerificationToken(preSignupToken);
  if (!preSignup) {
    throw new ApiError(ERROR.UNAUTHORIZED, '인증이 만료되었습니다. 다시 인증해주세요.');
  }

  const [loginIdDuplicated, emailDuplicated, nicknameDuplicated, studentDuplicated] = await Promise.all([
    findUserByLoginId(input.loginId),
    findUserByEmail(input.email),
    findUserByNickname(input.nickname),
    findUserByStudentNumber(preSignup.studentNumber),
  ]);

  if (loginIdDuplicated) {
    throw new ApiError(ERROR.CONFLICT, '이미 사용 중인 아이디입니다.');
  }

  if (emailDuplicated) {
    throw new ApiError(ERROR.CONFLICT, '이미 사용 중인 이메일입니다.');
  }

  if (nicknameDuplicated) {
    throw new ApiError(ERROR.NICKNAME_ALREADY_EXISTS, '이미 사용 중인 닉네임입니다.');
  }

  if (studentDuplicated) {
    throw new ApiError(ERROR.CONFLICT, '이미 가입된 학번입니다. 로그인해주세요.');
  }

  const inputBirthHash = hashBirth(input.birth);
  if (preSignup.birthHash !== inputBirthHash) {
    throw new ApiError(ERROR.INVALID_VERIFICATION, '인증 정보와 생년월일이 일치하지 않습니다.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  await createUser({
    login_id: input.loginId,
    real_name: input.realName,
    age: input.age,
    email: input.email,
    password_hash: passwordHash,
    birth: input.birth,
    birth_hash: inputBirthHash,
    nickname: input.nickname,
    gender: input.gender,
    university: input.university,
    department: input.department,
    student_year: input.studentYear,
    student_number: preSignup.studentNumber,
  });

  await clearPreSignupVerificationToken(preSignupToken);

  return {
    registered: true,
    nextPath: '/login',
  };
}

export async function logout(sessionId: number) {
  await deleteAuthSessionById(sessionId).catch(() => undefined);
  return { loggedOut: true };
}
