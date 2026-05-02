import { NextRequest } from "next/server";                                                 
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";                                          
import { ERROR } from "@/server/lib/errors";
import * as chatRoomService from "@/server/services/conversation/chatRoom.service";

export async function PATCH(req: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.");

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, "채팅방을 찾을 수 없습니다.");

    const result = await chatRoomService.leaveChatRoom(roomId, user.id);

    if ("error" in result) {
        const err = result.error!;
        if (err === ERROR.FORBIDDEN) return fail(err, "접근 권한이 없습니다.");
        return fail(err, "채팅방을 찾을 수 없습니다." );
    }

    return ok(result);
}