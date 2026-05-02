import {
  attachSessionCookie,
  clearAppAccessCookie,
} from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { ok, fail } from '@/server/lib/response';
import { login } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

interface LoginRequestBody {
  loginId?: unknown;
  studentId?: unknown;
  password?: unknown;
}

function normalizeCredential(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    let body: LoginRequestBody;
    try {
      body = await request.json() as LoginRequestBody;
    } catch {
      throw new ApiError(ERROR.VALIDATION_ERROR, '요청 형식을 확인해주세요.');
    }

    const loginId = normalizeCredential(body.loginId ?? body.studentId);
    const password = normalizeCredential(body.password);

    if (!loginId || !password) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '아이디와 비밀번호를 모두 입력해주세요.');
    }

    const result = await login({ loginId, password });
    const response = ok({
      user: result.user,
      sessionExpiresAt: result.expiresAt.toISOString(),
    });

    attachSessionCookie(response, result.token, result.expiresAt);
    clearAppAccessCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.code, error.message);
    }
    console.error('[POST /api/auth/login]', error);
    return fail('INTERNAL_SERVER_ERROR', '로그인 처리 중 오류가 발생했습니다.');
  }
}
