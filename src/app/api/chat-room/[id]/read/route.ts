import { NextRequest } from "next/server";                                                 
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";                                          
import { ERROR } from "@/server/lib/errors";
import * as messageService from "@/server/services/conversation/message.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다");

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, "찾지 못했습니다.");

    const body = await req.json();
    const { lastReadMessageId } = body;

    if (!lastReadMessageId || isNaN(Number(lastReadMessageId))) {
        return fail(ERROR.INVALID_CURSOR, "유효하지 않은 커서 값입니다.");
    }

    const result = await messageService.markAsRead(roomId, user.id, Number(lastReadMessageId));

    if ("error" in result) {
        return fail(result.error!, "접근 권한이 없습니다.");
    }

    return ok(result);
}