import { NextRequest } from 'next/server';
import { ok, fail } from '@/server/lib/response';
import {
  attachAdminSessionCookie,
  createAdminSessionToken,
  isAdminAuthConfigured,
  verifyAdminAccessCode,
} from '@/server/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return fail('ADMIN_NOT_CONFIGURED', 'ADMIN_ACCESS_CODE 환경변수가 설정되지 않았습니다.', 503);
  }

  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code : '';

  if (!verifyAdminAccessCode(code)) {
    return fail('INVALID_ADMIN_CODE', '관리자 코드가 올바르지 않습니다.', 401);
  }

  const response = ok({ authenticated: true });
  attachAdminSessionCookie(response, createAdminSessionToken());
  return response;
}
