import { NextRequest } from "next/server";
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";
import { ERROR } from "@/server/lib/errors";
import * as placeService from "@/server/services/place/place.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다");

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, "찾을 수 없습니다");

    const body = await req.json();
    const { placeId, triggeredKeyword } = body;

    if (!placeId || isNaN(Number(placeId)))
        return fail(ERROR.VALIDATION_ERROR, "placeId가 필요합니다");

    const result = await placeService.createPlaceSuggestion(roomId, user.id, Number(placeId), triggeredKeyword);

    if ("error" in result) {
        if (result.error === ERROR.ROOM_NOT_ACTIVE) return fail(ERROR.ROOM_NOT_ACTIVE, "활성 채팅방이 아닙니다");
        if (result.error === ERROR.FORBIDDEN) return fail(ERROR.FORBIDDEN, "접근 권한이 없습니다");
        return fail(ERROR.NOT_FOUND, "찾을 수 없습니다");
    }

    return ok(result, 201);
}
export async function GET(req: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다");

    const { id } = await params;
    const roomId = Number(id);
    if (isNaN(roomId)) return fail(ERROR.NOT_FOUND, "찾을 수 없습니다");

    const result = await placeService.getSuggestionsStatus(roomId, user.id);

    if ("error" in result) {
        if (result.error === ERROR.FORBIDDEN) return fail(ERROR.FORBIDDEN, "접근 권한이 없습니다");
        return fail(ERROR.NOT_FOUND, "찾을 수 없습니다");
    }
    return ok(result);
}