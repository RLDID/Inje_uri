import { randomInt } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import {
  BUS_INJE_CHECK_ENDPOINT,
  INJE_CHECK_FAIL_MESSAGE,
} from '@/lib/auth/constants';
import { PROFILE_CATEGORY_CODES, type KeywordSelectionPayload, type ProfileCategoryCode } from '@/lib/types';
import {
  createUserSession,
  hashBirth,
  hashStudentNumber,
  issueAccountRecoveryToken,
  isBirthHashMatch,
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
import { findCategoriesWithKeywordsByCodes } from '@/server/repositories/user/keyword-selection.repository';
import {
  createUserWithKeywordSelections,
  findUserByEmail,
  findUserForAccountRecovery,
  findUserByLoginId,
  findUserByNickname,
  findUserByStudentNumber,
  updateUserPasswordHash,
} from '@/server/repositories/user/user.repository';

type UpstreamInjeBody = {
  status?: unknown;
  message?: unknown;
};

type InjeCheckSuccessResponse = {
  status: string;
  message: string;
};

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
  keywordSelections: unknown;
}

interface KeywordSelectionInput {
  categoryCode?: unknown;
  keywordCodes?: unknown;
}

type CategoryWithKeywords = {
  category_id: number;
  category_code: string;
  selection_type: string;
  max_select_count: number;
  keywords: Array<{
    keyword_id: number;
    keyword_code: string;
  }>;
};

const PROFILE_CATEGORY_CODE_SET = new Set<string>(PROFILE_CATEGORY_CODES);

function toOptionalCode(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeRegisterKeywordSelections(rawValue: unknown): KeywordSelectionPayload[] {
  if (!Array.isArray(rawValue)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '성향 정보를 모두 선택해주세요.');
  }

  const selections = rawValue.map((item) => {
    const selection = item as KeywordSelectionInput;
    const categoryCode = toOptionalCode(selection.categoryCode);

    if (!categoryCode || !PROFILE_CATEGORY_CODE_SET.has(categoryCode) || !Array.isArray(selection.keywordCodes)) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '성향 정보 형식을 확인해주세요.');
    }

    const keywordCodes = [...new Set(
      selection.keywordCodes
        .map((keywordCode) => toOptionalCode(keywordCode))
        .filter((keywordCode): keywordCode is string => Boolean(keywordCode)),
    )];

    return {
      categoryCode: categoryCode as ProfileCategoryCode,
      keywordCodes,
    };
  });

  const categoryCodes = selections.map((selection) => selection.categoryCode);
  if (new Set(categoryCodes).size !== categoryCodes.length) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '중복된 성향 카테고리는 허용되지 않습니다.');
  }

  const missingCategoryCodes = PROFILE_CATEGORY_CODES.filter((categoryCode) => !categoryCodes.includes(categoryCode));
  if (missingCategoryCodes.length > 0) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '성향 정보를 모두 선택해주세요.');
  }

  return PROFILE_CATEGORY_CODES.map((categoryCode) => {
    const selection = selections.find((item) => item.categoryCode === categoryCode);
    if (!selection) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '성향 정보를 모두 선택해주세요.');
    }

    return selection;
  });
}

async function resolveRegisterKeywordSelectionRows(rawValue: unknown) {
  const selections = normalizeRegisterKeywordSelections(rawValue);
  const categories = await findCategoriesWithKeywordsByCodes(selections.map((selection) => selection.categoryCode));
  const categoryMap = new Map(
    (categories as CategoryWithKeywords[]).map((category) => [category.category_code, category]),
  );

  if (categoryMap.size !== PROFILE_CATEGORY_CODES.length) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '존재하지 않는 성향 카테고리가 포함되어 있습니다.');
  }

  return selections.flatMap((selection) => {
    const category = categoryMap.get(selection.categoryCode);
    const keywordCodes = selection.keywordCodes;

    if (!category) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '존재하지 않는 성향 카테고리가 포함되어 있습니다.');
    }

    if (keywordCodes.length < 1) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '성향 정보를 모두 선택해주세요.');
    }

    if (category.selection_type === 'single' && keywordCodes.length !== 1) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '단일 선택 항목은 하나만 선택해주세요.');
    }

    if (keywordCodes.length > category.max_select_count) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '선택 가능한 키워드 개수를 초과했습니다.');
    }

    const keywordMap = new Map(category.keywords.map((keyword) => [keyword.keyword_code, keyword.keyword_id]));
    const keywordIds = keywordCodes
      .map((keywordCode) => keywordMap.get(keywordCode))
      .filter((keywordId): keywordId is number => typeof keywordId === 'number');

    if (keywordIds.length !== keywordCodes.length) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '카테고리와 맞지 않는 키워드가 포함되어 있습니다.');
    }

    return keywordIds.map((keywordId) => ({
      category_id: category.category_id,
      keyword_id: keywordId,
    }));
  });
}

const DEFAULT_PROFILE_IMAGE_DIRS = [
  {
    publicUrlPrefix: '/bear-example',
    directory: path.join(process.cwd(), 'public', 'bear-example'),
  },
  {
    publicUrlPrefix: '/brand/bear-example',
    directory: path.join(process.cwd(), 'public', 'brand', 'bear-example'),
  },
];
const DEFAULT_PROFILE_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

async function getRandomDefaultProfileImageUrl(): Promise<string | null> {
  for (const source of DEFAULT_PROFILE_IMAGE_DIRS) {
    const entries = await readdir(source.directory, { withFileTypes: true }).catch(() => []);
    const imageFileNames = entries
      .filter((entry) => entry.isFile() && DEFAULT_PROFILE_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

    if (imageFileNames.length > 0) {
      const fileName = imageFileNames[randomInt(imageFileNames.length)];
      return `${source.publicUrlPrefix}/${encodeURIComponent(fileName)}`;
    }
  }

  return null;
}

function getKSTServiceDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 9) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  return kst.toISOString().split('T')[0];
}

async function generateTodayRecommendationsAfterRegister(userId: number) {
  const { generateRecommendationsForUser } = await import('@/server/services/matching/recommendation.service');
  const result = await generateRecommendationsForUser(userId, getKSTServiceDateString());

  if (!result.generated) {
    console.warn(
      `[POST /api/auth/register recommendations] skipped: userId=${userId}, reason=${result.reason}, candidateCount=${result.candidateCount}`,
    );
  }
}

function parseUpstreamInjeBody(rawText: string): UpstreamInjeBody | null {
  try {
    return JSON.parse(rawText) as UpstreamInjeBody;
  } catch {
    const jsonStart = rawText.lastIndexOf('{');
    if (jsonStart < 0) {
      return null;
    }

    try {
      return JSON.parse(rawText.slice(jsonStart)) as UpstreamInjeBody;
    } catch {
      return null;
    }
  }
}

function normalizeUpstreamStatus(status: unknown): string {
  if (status === undefined || status === null) {
    return '';
  }

  return String(status).trim().toLowerCase();
}

function normalizeUpstreamMessage(message: unknown): string {
  if (message === undefined || message === null) {
    return '';
  }

  return String(message).replace(/\\\//g, '/').trim();
}

function parseInjeCheckSuccessAllowlistJson(rawValue: string): InjeCheckSuccessResponse[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error('INJE_CHECK_SUCCESS_RESPONSES must be a JSON array.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('INJE_CHECK_SUCCESS_RESPONSES must be a JSON array.');
  }

  return parsed
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const status = normalizeUpstreamStatus(record.status);
      const message = normalizeUpstreamMessage(record.message);

      return status && message ? { status, message } : null;
    })
    .filter((item): item is InjeCheckSuccessResponse => item !== null);
}

function getInjeCheckSuccessAllowlist(): InjeCheckSuccessResponse[] {
  const rawJsonAllowlist = process.env.INJE_CHECK_SUCCESS_RESPONSES?.trim();
  if (rawJsonAllowlist) {
    return parseInjeCheckSuccessAllowlistJson(rawJsonAllowlist);
  }

  const status = normalizeUpstreamStatus(process.env.INJE_CHECK_SUCCESS_STATUS);
  const message = normalizeUpstreamMessage(process.env.INJE_CHECK_SUCCESS_MESSAGE);

  return status && message ? [{ status, message }] : [];
}

function isAllowedInjeCheckSuccessResponse(upstreamBody: UpstreamInjeBody): boolean {
  const allowlist = getInjeCheckSuccessAllowlist();
  if (allowlist.length === 0) {
    return false;
  }

  const upstreamStatus = normalizeUpstreamStatus(upstreamBody.status);
  const upstreamMessage = normalizeUpstreamMessage(upstreamBody.message);

  return allowlist.some((allowed) => (
    allowed.status === upstreamStatus && allowed.message === upstreamMessage
  ));
}

export async function verifyInjeStudent(studentNumber: string, birth: string) {
  let upstreamBody: UpstreamInjeBody | null = null;

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
  if (upstreamMessage === normalizeUpstreamMessage(INJE_CHECK_FAIL_MESSAGE)) {
    throw new ApiError(ERROR.INVALID_CREDENTIALS, '입력한 정보를 찾을수 없습니다.');
  }

  if (!isAllowedInjeCheckSuccessResponse(upstreamBody)) {
    console.warn('[POST /api/auth/inje-check] rejected non-allowlisted upstream response', {
      status: normalizeUpstreamStatus(upstreamBody.status),
      message: upstreamMessage,
    });
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
  if (!isBirthHashMatch(preSignup.birthHash, input.birth)) {
    throw new ApiError(ERROR.INVALID_VERIFICATION, '인증 정보와 생년월일이 일치하지 않습니다.');
  }

  const keywordSelectionRows = await resolveRegisterKeywordSelectionRows(input.keywordSelections);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const defaultProfileImageUrl = await getRandomDefaultProfileImageUrl();
  const user = await createUserWithKeywordSelections({
    login_id: input.loginId,
    real_name: input.realName,
    age: input.age,
    email: input.email,
    password_hash: passwordHash,
    birth: input.birth,
    birth_hash: inputBirthHash,
    nickname: input.nickname,
    bio: `안녕하세요. ${input.nickname}입니다.`,
    gender: input.gender,
    university: input.university,
    department: input.department,
    student_year: input.studentYear,
    student_number: preSignup.studentNumber,
    student_number_hash: hashStudentNumber(preSignup.studentNumber),
    onboarding_completed: true,
    ...(defaultProfileImageUrl
      ? {
          userProfileImages: {
            create: {
              image_url: defaultProfileImageUrl,
              sort_order: 1,
              is_primary: true,
            },
          },
        }
      : {}),
  }, keywordSelectionRows);

  await generateTodayRecommendationsAfterRegister(user.id).catch((error) => {
    console.error('[POST /api/auth/register recommendations]', error);
  });

  await clearPreSignupVerificationToken(preSignupToken);
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
  token: string | null;
}

export async function logout(sessionId: number) {
  await deleteAuthSessionById(sessionId).catch(() => undefined);
  return { loggedOut: true };
}

export async function verifyAccountRecoveryIdentity(input: {
  mode?: 'id' | 'password';
  studentNumber: string;
  birth: string;
  realName: string;
  email?: string;
}): Promise<AccountRecoveryVerificationResult> {
  const mode = input.mode ?? 'id';
  const studentNumber = input.studentNumber.trim();
  const birth = input.birth.trim();
  const realName = input.realName.trim();
  const email = input.email?.trim().toLowerCase() ?? '';

  if (!studentNumber) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학번을 입력해주세요.');
  }

  if (!/^\d{6}$/.test(birth)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '생년월일 6자리를 입력해주세요.');
  }

  if (!realName) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '이름을 입력해주세요.');
  }

  if (mode === 'password' && !email) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '가입할 때 작성한 이메일을 입력해주세요.');
  }

  if (mode === 'password' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '이메일 형식을 확인해주세요.');
  }

  const user = await findUserForAccountRecovery(studentNumber);
  if (!user || !user.login_id || !isBirthHashMatch(user.birth_hash, birth)) {
    throw new ApiError(ERROR.INVALID_VERIFICATION, '입력한 정보와 일치하는 계정을 찾을 수 없습니다.');
  }

  const normalizeName = (value: string) => value.replace(/\s+/g, '').toLowerCase();
  if (normalizeName(user.real_name) !== normalizeName(realName)) {
    throw new ApiError(ERROR.INVALID_VERIFICATION, '입력한 정보와 일치하는 계정을 찾을 수 없습니다.');
  }

  if (mode === 'password' && user.email.toLowerCase() !== email) {
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
    token: mode === 'password' ? issueAccountRecoveryToken(user.id) : null,
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
