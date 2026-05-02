import { getAuthUser } from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { deleteProfileImage } from '@/server/services/user/profile-image.service';

export const runtime = 'nodejs';

function parseImageIdFromPath(pathname: string): number {
  const imageIdRaw = pathname.split('/').filter(Boolean).at(-1);
  const imageId = Number(imageIdRaw);

  if (!imageId || Number.isNaN(imageId)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, 'imageId 형식을 확인해주세요.');
  }

  return imageId;
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');

    const pathname = new URL(request.url).pathname;
    const imageId = parseImageIdFromPath(pathname);

    return ok(await deleteProfileImage(user.id, imageId));
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[DELETE /api/users/me/images/[imageId]]', error);
    return fail('INTERNAL_SERVER_ERROR', '프로필 이미지 삭제 중 오류가 발생했습니다.');
  }
}
