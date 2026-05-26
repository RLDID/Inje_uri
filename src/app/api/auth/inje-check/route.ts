import {
  attachPreSignupCookie,
} from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { verifyInjeStudent } from '@/server/services/auth/auth.service';
import {
  assertAuthRateLimitAllowed,
  buildAuthRateLimitSet,
  clearAuthRateLimitFailures,
  recordAuthRateLimitFailure,
} from '@/server/services/auth/rate-limit.service';

export const runtime = 'nodejs';

interface InjeCheckBody {
  studentNumber?: unknown;
  birth?: unknown;
}

const MIN_ALLOWED_STUDENT_AGE = 20;
const MAX_ALLOWED_STUDENT_AGE = 35;
const INVALID_INJE_CHECK_MESSAGE = '입력한 정보를 찾을수 없습니다.';

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function resolveAllowedBirthYear(birth: string, referenceYear: number): number | null {
  const twoDigitYear = Number(birth.slice(0, 2));
  const candidates = [1900 + twoDigitYear, 2000 + twoDigitYear];

  return candidates.find((candidateYear) => {
    const age = referenceYear - candidateYear;
    return age >= MIN_ALLOWED_STUDENT_AGE && age <= MAX_ALLOWED_STUDENT_AGE;
  }) ?? null;
}

function validateStudentBirth(birth: string, referenceDate = new Date()): string | null {
  if (!/^\d{6}$/.test(birth)) {
    return INVALID_INJE_CHECK_MESSAGE;
  }

  const month = Number(birth.slice(2, 4));
  const day = Number(birth.slice(4, 6));
  const birthYear = resolveAllowedBirthYear(birth, referenceDate.getFullYear());

  if (!birthYear || !isRealCalendarDate(birthYear, month, day)) {
    return INVALID_INJE_CHECK_MESSAGE;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    let body: InjeCheckBody;

    try {
      body = await request.json() as InjeCheckBody;
    } catch {
      throw new ApiError(ERROR.VALIDATION_ERROR, '요청 형식을 확인해주세요.');
    }

    const studentNumber = normalizeValue(body.studentNumber);
    const birth = normalizeValue(body.birth);

    if (!studentNumber) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '학번을 입력해주세요.');
    }

    const rateLimitSet = buildAuthRateLimitSet('inje-check', request, studentNumber);
    await assertAuthRateLimitAllowed(rateLimitSet.checkBuckets);

    let result: Awaited<ReturnType<typeof verifyInjeStudent>>;
    try {
      const birthValidationError = validateStudentBirth(birth);
      if (birthValidationError) {
        throw new ApiError(ERROR.INVALID_CREDENTIALS, birthValidationError);
      }

      result = await verifyInjeStudent(studentNumber, birth);
      await clearAuthRateLimitFailures(rateLimitSet.resetBuckets);
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR.INVALID_CREDENTIALS) {
        await recordAuthRateLimitFailure(rateLimitSet.checkBuckets);
        await assertAuthRateLimitAllowed(rateLimitSet.checkBuckets);
      }

      throw error;
    }

    const response = ok(result.data);
    attachPreSignupCookie(response, result.token);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('인증 서버')) {
      return fail('INTERNAL_ERROR', error.message);
    }
    if (error instanceof Error && error.message.startsWith('인증 응답')) {
      return fail('INTERNAL_ERROR', error.message);
    }
    if (error instanceof ApiError) {
      return fail(error.code, error.message, error.code === ERROR.RATE_LIMITED ? 429 : 400);
    }
    console.error('[POST /api/auth/inje-check]', error);
    return fail('INTERNAL_SERVER_ERROR', '인제 학생 인증 처리 중 오류가 발생했습니다.');
  }
}
