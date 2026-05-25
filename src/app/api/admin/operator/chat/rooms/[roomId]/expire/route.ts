import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import { ok, fail } from "@/server/lib/response";
import { expireAdminOperatorChatRoom } from "@/server/services/admin/admin-operator.service";

function parseRoomId(rawValue: string): number | null {
  const roomId = Number(rawValue);
  return Number.isInteger(roomId) && roomId > 0 ? roomId : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  if (!requireAdminRequest(request)) {
    return fail("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }

  try {
    const { roomId: roomIdRaw } = await params;
    const roomId = parseRoomId(roomIdRaw);
    if (!roomId) {
      return fail("NOT_FOUND", "채팅방을 찾을 수 없습니다.", 404);
    }

    const data = await expireAdminOperatorChatRoom(roomId);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error("[POST /api/admin/operator/chat/rooms/[roomId]/expire]", error);
    return fail("INTERNAL_SERVER_ERROR", "운영자 채팅방을 만료 처리하는 중 오류가 발생했습니다.", 500);
  }
}
