import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import { ok, fail } from "@/server/lib/response";
import {
  getAdminOperatorChatMessages,
  sendAdminOperatorChatMessage,
} from "@/server/services/admin/admin-operator.service";

function parseRoomId(rawValue: string): number | null {
  const roomId = Number(rawValue);
  return Number.isInteger(roomId) && roomId > 0 ? roomId : null;
}

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") ? Number(searchParams.get("cursor")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 30;

    const data = await getAdminOperatorChatMessages(roomId, cursor, limit);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error("[GET /api/admin/operator/chat/rooms/[roomId]/messages]", error);
    return fail("INTERNAL_SERVER_ERROR", "운영자 채팅 메시지를 불러오는 중 오류가 발생했습니다.", 500);
  }
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

    const body = await request.json();
    const { content } = body as { content: unknown };

    if (typeof content !== "string" || !content.trim()) {
      return fail("INVALID_CONTENT", "메시지 내용을 입력해주세요.");
    }

    if (content.trim().length > 1000) {
      return fail("INVALID_CONTENT", "메시지는 1000자 이하로 입력해주세요.");
    }

    const data = await sendAdminOperatorChatMessage(roomId, content.trim());
    return ok(data, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error("[POST /api/admin/operator/chat/rooms/[roomId]/messages]", error);
    return fail("INTERNAL_SERVER_ERROR", "운영자 채팅 메시지를 보내는 중 오류가 발생했습니다.", 500);
  }
}
