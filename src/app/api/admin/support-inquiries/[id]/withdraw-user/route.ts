import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import { fail, ok } from "@/server/lib/response";
import { withdrawAdminSupportInquiryUser } from "@/server/services/support/support.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireAdminRequest(request)) {
    return fail("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }

  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return fail("VALIDATION_ERROR", "유효하지 않은 문의 ID입니다.");
    }

    const data = await withdrawAdminSupportInquiryUser(id);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error("[PATCH /api/admin/support-inquiries/[id]/withdraw-user]", error);
    return fail("INTERNAL_SERVER_ERROR", "문의자 탈퇴 처리 중 오류가 발생했습니다.", 500);
  }
}
