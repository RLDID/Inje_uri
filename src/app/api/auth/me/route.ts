import type { NextRequest } from 'next/server';
import {
  ensureActiveUser,
  resolveCurrentUser,
  toAuthUserSummary,
} from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveCurrentUser(request);
    if (!auth) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');
    ensureActiveUser(auth.user);

    return ok({
      user: toAuthUserSummary(auth.user),
      sessionExpiresAt: auth.session.expires_at.toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[GET /api/auth/me]', error);
    return fail('INTERNAL_SERVER_ERROR', '인증 정보 조회 중 오류가 발생했습니다.');
  }
}
