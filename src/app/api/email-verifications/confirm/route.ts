import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { confirmEmailVerification } from '@/server/services/auth/email-verification.service';

export const runtime = 'nodejs';

interface VerificationConfirmBody {
  schoolEmail?: unknown;
  code?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');

    let body: VerificationConfirmBody;
    try {
      body = await request.json();
    } catch {
      return fail(ERROR.VALIDATION_ERROR, '요청 형식을 확인해주세요.');
    }

    const data = await confirmEmailVerification({
      userId: user.id,
      schoolEmail: typeof body.schoolEmail === 'string' ? body.schoolEmail : '',
      code: typeof body.code === 'string' ? body.code : '',
    });

    return ok({
      verified: data.verified,
      schoolEmail: data.schoolEmail,
      verifiedAt: data.verifiedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[POST /api/email-verifications/confirm]', error);
    return fail('INTERNAL_SERVER_ERROR', '이메일 인증 확인 중 오류가 발생했습니다.');
  }
}
