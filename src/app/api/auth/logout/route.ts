import type { NextRequest } from 'next/server';
import {
  clearAppAccessCookie,
  clearPreSignupCookie,
  clearSessionCookie,
  ensureActiveUser,
  resolveCurrentUser,
} from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { logout } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveCurrentUser(request);
    if (!auth) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');
    ensureActiveUser(auth.user);

    const data = await logout(auth.session.id);
    const response = ok(data);
    clearSessionCookie(response);
    clearAppAccessCookie(response);
    clearPreSignupCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[POST /api/auth/logout]', error);
    return fail('INTERNAL_SERVER_ERROR', '로그아웃 처리 중 오류가 발생했습니다.');
  }
}
