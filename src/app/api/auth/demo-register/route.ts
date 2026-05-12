import {
  attachSessionCookie,
  clearAppAccessCookie,
} from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { registerDemoUser, type DemoRegisterInput } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

interface DemoRegisterRequestBody {
  name?: unknown;
  department?: unknown;
  bio?: unknown;
  gender?: unknown;
  age?: unknown;
  studentYear?: unknown;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGender(value: unknown): DemoRegisterInput['gender'] {
  return value === 'male' ? 'male' : 'female';
}

function toInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function parseDemoRegisterInput(body: DemoRegisterRequestBody): DemoRegisterInput {
  const name = normalizeString(body.name);
  const department = normalizeString(body.department);
  const bio = normalizeString(body.bio);
  const age = toInteger(body.age);
  const studentYear = toInteger(body.studentYear);

  if (name.length < 2 || name.length > 50) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '이름은 2자 이상 50자 이하로 입력해주세요.');
  }

  if (!department || department.length > 100) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학과를 입력해주세요.');
  }

  if (bio.length > 500) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '간단 프로필은 500자 이하로 입력해주세요.');
  }

  if (age !== undefined && (age < 18 || age > 100)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '나이 범위를 확인해주세요.');
  }

  if (studentYear !== undefined && (studentYear < 1 || studentYear > 8)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학년 범위를 확인해주세요.');
  }

  return {
    name,
    department,
    bio: bio || undefined,
    gender: normalizeGender(body.gender),
    age,
    studentYear,
  };
}

export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== 'true') {
    return fail(ERROR.FORBIDDEN, 'Demo mode is disabled.', 403);
  }

  try {
    let body: DemoRegisterRequestBody;
    try {
      body = await request.json() as DemoRegisterRequestBody;
    } catch {
      throw new ApiError(ERROR.VALIDATION_ERROR, '요청 형식을 확인해주세요.');
    }

    const result = await registerDemoUser(parseDemoRegisterInput(body));
    const response = ok({
      registered: result.registered,
      nextPath: result.nextPath,
      user: result.user,
      sessionExpiresAt: result.expiresAt.toISOString(),
    }, { status: 201 });

    attachSessionCookie(response, result.token, result.expiresAt);
    clearAppAccessCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.code, error.message);
    }

    console.error('[POST /api/auth/demo-register]', error);
    return fail(ERROR.INTERNAL_SERVER_ERROR, '시연용 프로필 등록 중 오류가 발생했습니다.', 500);
  }
}
