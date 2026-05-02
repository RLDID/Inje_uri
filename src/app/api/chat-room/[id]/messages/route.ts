import { NextRequest } from "next/server";                                                 
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";                                          
import { ERROR } from "@/server/lib/errors";
import * as messageService from "@/server/services/conversation/message.service";

export async function GET(req: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.");

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND,  "찾을 수 없습니다." );

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") ? Number(searchParams.get("cursor")) :
    undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 30;

    const result = await messageService.getMessages(roomId, user.id, cursor, limit);

    if ("error" in result) {
        return fail(result.error!, "접근 권한이 없습니다.");
    }

    return ok(result);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED,  "인증이 필요합니다." );

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, "찾을 수 없습니다.");

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
        return fail(ERROR.INVALID_CONTENT,  "메시지 내용이 유효하지 않습니다.");
    }
    if (content.trim().length > 1000) {
      return fail(ERROR.INVALID_CONTENT, "메시지는 1000자 이하로 입력해주세요.");
    }

    const result = await messageService.sendMessage(roomId, user.id, content.trim());

    if ("error" in result) {
        const err = result.error!;
        if (err === ERROR.ROOM_EXPIRED) return fail(err, "만료된 채팅방입니다.");
        if (err === ERROR.ROOM_NOT_ACTIVE) return fail(err, "비활성화된 채팅방입니다.");
        if (err === ERROR.FORBIDDEN) return fail(err,  "접근 권한이 없습니다.");
        return fail(err, "채팅방을 찾을 수 없습니다.");
    }

    return ok(result, 201);
}