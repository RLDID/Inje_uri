import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import {
  BUS_INJE_CHECK_ENDPOINT,
  INJE_CHECK_FAIL_MESSAGE,
} from '@/lib/auth/constants';
import {
  createUserSession,
  hashBirth,
  issueAccountRecoveryToken,
  verifyAccountRecoveryToken,
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
  findUserForAccountRecovery,
  findUserByLoginId,
  findUserByNickname,
  findUserByStudentNumber,
  updateUserPasswordHash,
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

export interface DemoRegisterInput {
  name: string;
  department: string;
  bio?: string;
  gender: 'male' | 'female';
  age?: number;
  studentYear?: number;
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
  const user = await createUser({
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
  const { token, expiresAt } = await createUserSession(user.id);

  return {
    registered: true,
    nextPath: '/register?step=categories',
    token,
    expiresAt,
    user: toAuthUserSummary(user),
  };
}

function createDemoUniqueId(): string {
  return randomUUID().replace(/-/g, '');
}

async function createUniqueDemoNickname(name: string): Promise<string> {
  const baseNickname = name.trim().slice(0, 50);

  if (!(await findUserByNickname(baseNickname))) {
    return baseNickname;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = createDemoUniqueId().slice(0, 6);
    const candidate = `${baseNickname.slice(0, 43)}-${suffix}`;

    if (!(await findUserByNickname(candidate))) {
      return candidate;
    }
  }

  return `${baseNickname.slice(0, 39)}-${Date.now().toString(36)}`;
}

export async function registerDemoUser(input: DemoRegisterInput) {
  const uniqueId = createDemoUniqueId();
  const nickname = await createUniqueDemoNickname(input.name);
  const passwordHash = await bcrypt.hash(createDemoUniqueId(), 10);
  const user = await createUser({
    login_id: `demo_${uniqueId.slice(0, 32)}`,
    real_name: input.name,
    age: input.age ?? 22,
    email: `demo-${uniqueId}@demo.injeuri.local`,
    password_hash: passwordHash,
    nickname,
    gender: input.gender,
    university: '인제대학교',
    department: input.department,
    student_year: input.studentYear ?? 3,
    bio: input.bio ?? null,
    onboarding_completed: true,
    last_active_at: new Date(),
  });

  const { token, expiresAt } = await createUserSession(user.id);

  return {
    registered: true,
    nextPath: '/match',
    token,
    expiresAt,
    user: toAuthUserSummary(user),
  };
}

export interface AccountRecoveryVerificationResult {
  loginId: string;
  token: string;
}

export async function logout(sessionId: number) {
  await deleteAuthSessionById(sessionId).catch(() => undefined);
  return { loggedOut: true };
}

export async function verifyAccountRecoveryIdentity(input: {
  studentNumber: string;
  birth: string;
}): Promise<AccountRecoveryVerificationResult> {
  const studentNumber = input.studentNumber.trim();
  const birth = input.birth.trim();

  if (!studentNumber) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학번을 입력해주세요.');
  }

  if (!/^\d{6}$/.test(birth)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '생년월일 6자리를 입력해주세요.');
  }

  const user = await findUserForAccountRecovery(studentNumber);
  if (!user || !user.login_id || !user.birth_hash || user.birth_hash !== hashBirth(birth)) {
    throw new ApiError(ERROR.INVALID_VERIFICATION, '입력한 정보와 일치하는 계정을 찾을 수 없습니다.');
  }

  if (user.deleted_at !== null || user.status === WITHDRAWN_USER_STATUS) {
    throw new ApiError(ERROR.ACCOUNT_WITHDRAWN, '탈퇴한 계정입니다.');
  }

  if (user.status === SUSPENDED_USER_STATUS) {
    throw new ApiError(ERROR.ACCOUNT_SUSPENDED, '정지된 계정입니다.');
  }

  return {
    loginId: user.login_id,
    token: issueAccountRecoveryToken(user.id),
  };
}

export async function resetPasswordWithRecoveryToken(input: {
  token: string | null;
  newPassword: string;
}) {
  const payload = verifyAccountRecoveryToken(input.token);
  if (!payload) {
    throw new ApiError(ERROR.UNAUTHORIZED, '본인 확인이 만료되었습니다. 다시 인증해주세요.');
  }

  const newPassword = input.newPassword.trim();
  if (newPassword.length < 8) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '비밀번호는 8자 이상이어야 합니다.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordHash(payload.userId, passwordHash);

  return { passwordReset: true };
}
