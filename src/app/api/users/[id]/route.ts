import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { getUserProfileDetail } from '@/server/services/user/user.service';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.', 401);

    const { id } = await params;
    const targetUserId = Number(id);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return fail(ERROR.VALIDATION_ERROR, '유효하지 않은 사용자 ID입니다.');
    }

    return ok(await getUserProfileDetail(authUser.id, targetUserId));
  } catch (error) {
    if (error instanceof ApiError) {
      const status = error.code === ERROR.NOT_FOUND ? 404 : 400;
      return fail(error.code, error.message, status);
    }

    console.error('[GET /api/users/[id]]', error);
    return fail(ERROR.INTERNAL_SERVER_ERROR, '사용자 정보를 조회하는 중 오류가 발생했습니다.', 500);
  }
}
