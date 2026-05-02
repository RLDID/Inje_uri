import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { uploadProfileImage } from '@/server/services/user/profile-image.service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return fail(ERROR.VALIDATION_ERROR, 'multipart/form-data 형식으로 요청해주세요.');
    }

    return ok(await uploadProfileImage(user.id, formData), { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[POST /api/users/me/images]', error);
    return fail('INTERNAL_SERVER_ERROR', '프로필 이미지 업로드 중 오류가 발생했습니다.');
  }
}
