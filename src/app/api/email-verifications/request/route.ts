import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { requestEmailVerification } from '@/server/services/auth/email-verification.service';

export const runtime = 'nodejs';

interface VerificationRequestBody {
  schoolEmail?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail(ERROR.UNAUTHORIZED, '인증이 필요합니다.');

    let body: VerificationRequestBody = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const rawEmail = typeof body.schoolEmail === 'string' ? body.schoolEmail : user.email;
    const data = await requestEmailVerification({
      userId: user.id,
      requestedEmail: rawEmail,
    });

    return ok({
      schoolEmail: data.schoolEmail,
      expiresAt: data.expiresAt.toISOString(),
      ...(data.debugCode ? { debugCode: data.debugCode } : {}),
    });
  } catch (error) {
    if (error instanceof ApiError) return fail(error.code, error.message);
    console.error('[POST /api/email-verifications/request]', error);
    return fail('INTERNAL_SERVER_ERROR', '이메일 인증 요청 중 오류가 발생했습니다.');
  }
}
