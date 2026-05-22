import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { ok, fail } from "@/server/lib/response";
import { getAuthUser } from "@/server/lib/auth";
import {
  createSupportInquiry,
  listSupportInquiriesForUser,
} from "@/server/services/support/support.service";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.", 401);

    const body = await request.json();
    const { category, screen, title, content, email } = body as {
      category: unknown;
      screen: unknown;
      title: unknown;
      content: unknown;
      email: unknown;
    };

    if (typeof category !== "string" || !category.trim()) {
      return fail("VALIDATION_ERROR", "category는 필수 문자열입니다.");
    }
    if (typeof screen !== "string" || !screen.trim()) {
      return fail("VALIDATION_ERROR", "screen은 필수 문자열입니다.");
    }
    if (typeof title !== "string" || !title.trim()) {
      return fail("VALIDATION_ERROR", "title은 필수 문자열입니다.");
    }
    if (typeof content !== "string" || !content.trim()) {
      return fail("VALIDATION_ERROR", "content는 필수 문자열입니다.");
    }
    if (email !== undefined && email !== null && typeof email !== "string") {
      return fail("VALIDATION_ERROR", "email은 문자열이어야 합니다.");
    }

    const data = await createSupportInquiry(user.id, {
      category,
      screen,
      title,
      content,
      email: typeof email === "string" ? email : undefined,
    });

    return ok(data, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }
    console.error("[POST /api/support-inquiries]", error);
    return fail("INTERNAL_SERVER_ERROR", "문의 등록 중 오류가 발생했습니다.", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.", 401);

    const data = await listSupportInquiriesForUser(user.id);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }
    console.error("[GET /api/support-inquiries]", error);
    return fail("INTERNAL_SERVER_ERROR", "문의 목록 조회 중 오류가 발생했습니다.", 500);
  }
}
