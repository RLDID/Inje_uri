import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { ok, fail } from "@/server/lib/response";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import {
  listAdminSupportInquiries,
  parseInquiryStatusFilter,
} from "@/server/services/support/support.service";

export async function GET(request: NextRequest) {
  if (!requireAdminRequest(request)) {
    return fail("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }

  try {
    const sp = request.nextUrl.searchParams;
    const status = parseInquiryStatusFilter(sp.get("status"));
    const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "20") || 20));

    const data = await listAdminSupportInquiries({ status, page, limit });
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }
    console.error("[GET /api/admin/support-inquiries]", error);
    return fail("INTERNAL_SERVER_ERROR", "문의 목록 조회 중 오류가 발생했습니다.", 500);
  }
}
