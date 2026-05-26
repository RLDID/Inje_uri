import { NextRequest } from "next/server";                                                  
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";                                           
import { ERROR } from "@/server/lib/errors";
import * as chatRoomService from "@/server/services/conversation/chatRoom.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다");
    // const user = {id:1} as any;
    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, "찾지 못했습니다.", 404);

    const result = await chatRoomService.getChatRoom(roomId, user.id);

    if ("error" in result) {
        return fail(ERROR.NOT_FOUND, "찾지 못했습니다.", 404);
    }
    return ok(result);
}
