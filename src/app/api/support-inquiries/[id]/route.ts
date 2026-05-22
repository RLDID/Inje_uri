import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { ok, fail } from "@/server/lib/response";
import { getAuthUser } from "@/server/lib/auth";
import {
  getSupportInquiryForUser,
  updateSupportInquiryForUser,
} from "@/server/services/support/support.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.", 401);

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return fail("VALIDATION_ERROR", "유효하지 않은 문의 ID입니다.");
    }

    const data = await getSupportInquiryForUser(id, user.id);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }
    console.error("[GET /api/support-inquiries/[id]]", error);
    return fail("INTERNAL_SERVER_ERROR", "문의 조회 중 오류가 발생했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.", 401);

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return fail("VALIDATION_ERROR", "유효하지 않은 문의 ID입니다.");
    }

    const body = await request.json();
    const { category, screen, title, content, email } = body as {
      category: unknown;
      screen: unknown;
      title: unknown;
      content: unknown;
      email: unknown;
    };

    if (category !== undefined && typeof category !== "string") {
      return fail("VALIDATION_ERROR", "category는 문자열이어야 합니다.");
    }
    if (screen !== undefined && typeof screen !== "string") {
      return fail("VALIDATION_ERROR", "screen은 문자열이어야 합니다.");
    }
    if (title !== undefined && typeof title !== "string") {
      return fail("VALIDATION_ERROR", "title은 문자열이어야 합니다.");
    }
    if (content !== undefined && typeof content !== "string") {
      return fail("VALIDATION_ERROR", "content는 문자열이어야 합니다.");
    }
    if (email !== undefined && email !== null && typeof email !== "string") {
      return fail("VALIDATION_ERROR", "email은 문자열이어야 합니다.");
    }

    const data = await updateSupportInquiryForUser(id, user.id, {
      category: typeof category === "string" ? category : undefined,
      screen: typeof screen === "string" ? screen : undefined,
      title: typeof title === "string" ? title : undefined,
      content: typeof content === "string" ? content : undefined,
      email: email !== undefined ? email : undefined,
    });

    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }
    console.error("[PATCH /api/support-inquiries/[id]]", error);
    return fail("INTERNAL_SERVER_ERROR", "문의 수정 중 오류가 발생했습니다.", 500);
  }
}
