import { createHash, randomInt } from 'node:crypto';
import { ApiError, ERROR } from '@/server/lib/errors';
import {
  createEmailVerification,
  expireOtherPendingEmailVerifications,
  expirePendingEmailVerifications,
  findLatestPendingEmailVerification,
  markEmailVerificationExpired,
  markEmailVerificationVerified,
} from '@/server/repositories/auth/email-verification.repository';

export const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 10;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isSchoolEmail(email: string): boolean {
  return /@([a-z0-9-]+\.)*inje\.ac\.kr$/i.test(email);
}

function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function requestEmailVerification(input: {
  userId: number;
  requestedEmail: string;
}) {
  const schoolEmail = normalizeEmail(input.requestedEmail);

  if (!schoolEmail) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학교 이메일을 입력해주세요.');
  }

  if (!isSchoolEmail(schoolEmail)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학교 이메일 형식이 아닙니다.');
  }

  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000);

  await expirePendingEmailVerifications(input.userId, schoolEmail);
  await createEmailVerification({
    userId: input.userId,
    schoolEmail,
    codeHash,
    expiresAt,
  });

  return {
    schoolEmail,
    expiresAt,
    debugCode: process.env.NODE_ENV === 'production' ? undefined : code,
  };
}

export async function confirmEmailVerification(input: {
  userId: number;
  schoolEmail: string;
  code: string;
}) {
  const schoolEmail = normalizeEmail(input.schoolEmail);
  const code = input.code.trim();

  if (!schoolEmail || !code) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학교 이메일과 인증 코드를 모두 입력해주세요.');
  }

  if (!isSchoolEmail(schoolEmail)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학교 이메일 형식이 아닙니다.');
  }

  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '인증 코드는 6자리 숫자여야 합니다.');
  }

  const verification = await findLatestPendingEmailVerification(input.userId, schoolEmail);

  if (!verification) {
    throw new ApiError(ERROR.NOT_FOUND, '유효한 인증 요청을 찾을 수 없습니다.');
  }

  const now = new Date();
  if (verification.expires_at.getTime() <= now.getTime()) {
    await markEmailVerificationExpired(verification.id);
    throw new ApiError(ERROR.VALIDATION_ERROR, '인증 코드가 만료되었습니다. 다시 요청해주세요.');
  }

  const inputHash = hashVerificationCode(code);
  if (inputHash !== verification.code_hash) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '인증 코드가 올바르지 않습니다.');
  }

  const verifiedAt = new Date();
  await markEmailVerificationVerified(verification.id, verifiedAt);
  await expireOtherPendingEmailVerifications(input.userId, schoolEmail, verification.id);

  return {
    verified: true,
    schoolEmail,
    verifiedAt,
  };
}
