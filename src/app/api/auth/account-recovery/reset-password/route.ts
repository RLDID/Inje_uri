import type { NextRequest } from 'next/server';
import {
  clearAccountRecoveryCookie,
  readAccountRecoveryTokenFromRequest,
} from '@/server/lib/auth';
import { ApiError } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { resetPasswordWithRecoveryToken } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

interface ResetPasswordBody {
  newPassword?: unknown;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    let body: ResetPasswordBody;
    try {
      body = await request.json() as ResetPasswordBody;
    } catch {
      throw new ApiError('VALIDATION_ERROR', '요청 형식을 확인해주세요.');
    }

    const result = await resetPasswordWithRecoveryToken({
      token: readAccountRecoveryTokenFromRequest(request),
      newPassword: normalizeString(body.newPassword),
    });
    const response = ok(result);

    clearAccountRecoveryCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      const response = fail(error.code, error.message);
      if (error.code === 'UNAUTHORIZED') {
        clearAccountRecoveryCookie(response);
      }
      return response;
    }

    console.error('[POST /api/auth/account-recovery/reset-password]', error);
    return fail('INTERNAL_SERVER_ERROR', '비밀번호 재설정 중 오류가 발생했습니다.');
  }
}
