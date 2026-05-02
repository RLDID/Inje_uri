import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  type UserPatchBody,
} from '@/server/services/user/user.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');
    return ok(await getCurrentUserProfile(user.id));
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[GET /api/users/me]', error);
    return fail('INTERNAL_SERVER_ERROR', '사용자 정보 조회 중 오류가 발생했습니다.');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');

    let body: UserPatchBody;
    try {
      body = await request.json();
    } catch {
      return fail(ERROR.VALIDATION_ERROR, '요청 형식을 확인해주세요.');
    }

    return ok(await updateCurrentUserProfile(user.id, body));
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[PATCH /api/users/me]', error);
    return fail('INTERNAL_SERVER_ERROR', '사용자 정보 수정 중 오류가 발생했습니다.');
  }
}
