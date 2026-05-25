import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import { ok, fail } from "@/server/lib/response";
import { startAdminOperatorChatFromReaction } from "@/server/services/admin/admin-operator.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  if (!requireAdminRequest(request)) {
    return fail("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }

  try {
    const { commentId: commentIdRaw } = await params;
    const commentId = Number(commentIdRaw);

    if (!Number.isInteger(commentId) || commentId <= 0) {
      return fail("INVALID_COMMENT_ID", "유효하지 않은 피드 반응 ID입니다.");
    }

    const data = await startAdminOperatorChatFromReaction(commentId);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error("[POST /api/admin/operator/chat/reactions/[commentId]/start]", error);
    return fail("INTERNAL_SERVER_ERROR", "운영자 채팅방을 여는 중 오류가 발생했습니다.", 500);
  }
}
