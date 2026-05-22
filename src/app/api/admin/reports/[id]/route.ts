import { NextRequest } from 'next/server';
import { AppError } from '@/server/lib/app-error';
import { requireAdminRequest } from '@/server/lib/admin-auth';
import { ok, fail } from '@/server/lib/response';
import { parseReportStatus, updateAdminReportStatus } from '@/server/services/admin/admin-report.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireAdminRequest(request)) {
    return fail('UNAUTHORIZED', '관리자 인증이 필요합니다.', 401);
  }

  try {
    const { id } = await params;
    const reportId = Number(id);
    const body = await request.json().catch(() => null) as { status?: unknown } | null;
    const status = parseReportStatus(body?.status);
    const data = await updateAdminReportStatus(reportId, status);

    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error('[PATCH /api/admin/reports/[id]]', error);
    return fail('INTERNAL_SERVER_ERROR', '신고 상태를 변경하는 중 오류가 발생했습니다.', 500);
  }
}
