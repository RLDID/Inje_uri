import { AppError } from "@/server/lib/app-error";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import { ok, fail } from "@/server/lib/response";
import { listAdminOperatorChatRooms } from "@/server/services/admin/admin-operator.service";

export async function GET(request: Request) {
  if (!requireAdminRequest(request)) {
    return fail("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }

  try {
    const data = await listAdminOperatorChatRooms();
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error("[GET /api/admin/operator/chat/rooms]", error);
    return fail("INTERNAL_SERVER_ERROR", "운영자 채팅방 목록을 불러오는 중 오류가 발생했습니다.", 500);
  }
}
