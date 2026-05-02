import { NextRequest } from "next/server";                                                  
import { getAuthUser } from "@/server/lib/auth";                                            
import { ok, fail } from "@/server/lib/response";                                           
import { ERROR } from "@/server/lib/errors";                                                
import * as chatRoomService from "@/server/services/conversation/chatRoom.service";
import { chat_room_source_type } from "@/generated/prisma/client";

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다");

    const body = await req.json();
    const { targetUserId, sourceType, sourceInterestId, sourceCommentId } = body;

    if (!targetUserId || !sourceType) {
        return fail(ERROR.INVALID_SOURCE, "sourceType 또는 targetUserId가 유효하지 않습니다.");
    }

    const result = await chatRoomService.createChatRoom({
        requestUserId: user.id,
        targetUserId: Number(targetUserId),
        sourceType: sourceType as chat_room_source_type,
        sourceInterestId: sourceInterestId ? Number(sourceInterestId) : undefined,
        sourceCommentId: sourceCommentId ? Number(sourceCommentId) : undefined,
    });

    if ("error" in result) {                                                                    
        const err = result.error!;                                                              
        if (err === ERROR.DUPLICATE_ACTIVE_ROOM) return fail(err, "이미 활성화된 채팅방이 존재합니다.");
        if (err === ERROR.REMATCH_TOO_SOON) return fail(err, "마지막 대화 종료 후 7일이 지나지 않았습니다.");
        return fail(err, "채팅방 생성에 실패했습니다.");
    }
    return ok(result, 201);
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.");

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") === "unread" ? "unread" : "all";
    const rooms = await chatRoomService.getChatRooms(user.id, tab);
    return ok({ rooms });
}