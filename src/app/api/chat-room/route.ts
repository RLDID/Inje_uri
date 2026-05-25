import type { NextRequest } from "next/server";
import { chat_room_source_type } from "@/generated/prisma/client";
import { getAuthUser } from "@/server/lib/auth";
import { ERROR } from "@/server/lib/errors";
import { fail, noStore, ok } from "@/server/lib/response";
import * as chatRoomService from "@/server/services/conversation/chatRoom.service";

function toPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isChatRoomSourceType(value: unknown): value is chat_room_source_type {
  return value === chat_room_source_type.interest || value === chat_room_source_type.comment;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return noStore(fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.", 401));

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return noStore(fail(ERROR.INVALID_SOURCE, "요청 형식을 확인해주세요."));
  }

  const targetUserId = toPositiveInteger(body.targetUserId);
  const sourceType = body.sourceType;

  if (!targetUserId || !isChatRoomSourceType(sourceType)) {
    return noStore(fail(ERROR.INVALID_SOURCE, "sourceType 또는 targetUserId가 유효하지 않습니다."));
  }

  let sourceInterestId: number | undefined;
  let sourceCommentId: number | undefined;

  if (sourceType === chat_room_source_type.interest) {
    const parsedSourceInterestId = toPositiveInteger(body.sourceInterestId);
    if (!parsedSourceInterestId) {
      return noStore(fail(ERROR.INVALID_SOURCE, "채팅방 생성 출처가 유효하지 않습니다."));
    }
    sourceInterestId = parsedSourceInterestId;
  }

  if (sourceType === chat_room_source_type.comment) {
    const parsedSourceCommentId = toPositiveInteger(body.sourceCommentId);
    if (!parsedSourceCommentId) {
      return noStore(fail(ERROR.INVALID_SOURCE, "채팅방 생성 출처가 유효하지 않습니다."));
    }
    sourceCommentId = parsedSourceCommentId;
  }

  const result = await chatRoomService.createChatRoom({
    requestUserId: user.id,
    targetUserId,
    sourceType,
    sourceInterestId,
    sourceCommentId,
  });

  if ("error" in result) {
    const err = result.error;
    if (!err) {
      return noStore(fail(ERROR.INTERNAL_SERVER_ERROR, "채팅방 생성에 실패했습니다."));
    }
    if (err === ERROR.BLOCKED_RELATIONSHIP) {
      return noStore(fail(err, "차단 관계인 사용자와는 채팅방을 생성할 수 없습니다."));
    }
    if (err === ERROR.DUPLICATE_ACTIVE_ROOM) {
      return noStore(fail(err, "이미 활성화된 채팅방이 존재합니다."));
    }
    if (err === ERROR.REMATCH_TOO_SOON) {
      return noStore(fail(err, "마지막 대화 종료 후 7일이 지나지 않았습니다."));
    }
    if (err === ERROR.INVALID_SOURCE) {
      return noStore(fail(err, "채팅방 생성 출처가 유효하지 않습니다."));
    }
    return noStore(fail(err, "채팅방 생성에 실패했습니다."));
  }

  return noStore(ok(result, 201));
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return noStore(fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.", 401));

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") === "unread" ? "unread" : "all";
  const rooms = await chatRoomService.getChatRooms(user.id, tab);
  return noStore(ok({ rooms }));
}
