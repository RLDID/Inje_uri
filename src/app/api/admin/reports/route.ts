import { NextRequest } from 'next/server';
import { AppError } from '@/server/lib/app-error';
import { requireAdminRequest } from '@/server/lib/admin-auth';
import { ok, fail } from '@/server/lib/response';
import { listAdminReports, parseReportStatusFilter } from '@/server/services/admin/admin-report.service';

export async function GET(request: NextRequest) {
  if (!requireAdminRequest(request)) {
    return fail('UNAUTHORIZED', '관리자 인증이 필요합니다.', 401);
  }

  try {
    const filterStatus = parseReportStatusFilter(request.nextUrl.searchParams.get('status'));
    const data = await listAdminReports(filterStatus);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error('[GET /api/admin/reports]', error);
    return fail('INTERNAL_SERVER_ERROR', '신고 목록을 불러오는 중 오류가 발생했습니다.', 500);
  }
}
