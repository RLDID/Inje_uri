import type { NextRequest } from 'next/server';
import {
  clearAppAccessCookie,
  clearPreSignupCookie,
  clearSessionCookie,
  resolveCurrentUser,
} from '@/server/lib/auth';
import { ApiError } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { logout } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

function withNoStore<T extends Response>(response: T): T {
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveCurrentUser(request);

    if (auth) {
      await logout(auth.session.id);
    }

    const response = ok({ loggedOut: true });
    clearSessionCookie(response);
    clearAppAccessCookie(response);
    clearPreSignupCookie(response);
    return withNoStore(response);
  } catch (error) {
    if (error instanceof ApiError) return withNoStore(fail(error.code, error.message));
    console.error('[POST /api/auth/logout]', error);
    return withNoStore(fail('INTERNAL_SERVER_ERROR', '로그아웃 처리 중 오류가 발생했습니다.'));
  }
}
