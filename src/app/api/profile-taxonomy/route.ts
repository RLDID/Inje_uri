import { getAuthUser } from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { getProfileTaxonomy } from '@/server/services/user/user.service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');
    return ok(await getProfileTaxonomy());
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[GET /api/profile-taxonomy]', error);
    return fail('INTERNAL_SERVER_ERROR', '프로필 분류 조회 중 오류가 발생했습니다.');
  }
}
