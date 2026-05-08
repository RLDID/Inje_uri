import type { NextRequest } from 'next/server';
import {
  attachAccountRecoveryCookie,
  clearAccountRecoveryCookie,
} from '@/server/lib/auth';
import { ApiError } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { verifyAccountRecoveryIdentity } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

interface AccountRecoveryVerifyBody {
  studentNumber?: unknown;
  birth?: unknown;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    let body: AccountRecoveryVerifyBody;
    try {
      body = await request.json() as AccountRecoveryVerifyBody;
    } catch {
      throw new ApiError('VALIDATION_ERROR', '요청 형식을 확인해주세요.');
    }

    const result = await verifyAccountRecoveryIdentity({
      studentNumber: normalizeString(body.studentNumber),
      birth: normalizeString(body.birth),
    });
    const response = ok({ loginId: result.loginId });

    attachAccountRecoveryCookie(response, result.token);
    return response;
  } catch (error) {
    const response = error instanceof ApiError
      ? fail(error.code, error.message)
      : fail('INTERNAL_SERVER_ERROR', '계정 확인 중 오류가 발생했습니다.');

    if (!(error instanceof ApiError)) {
      console.error('[POST /api/auth/account-recovery/verify]', error);
    }

    clearAccountRecoveryCookie(response);
    return response;
  }
}
