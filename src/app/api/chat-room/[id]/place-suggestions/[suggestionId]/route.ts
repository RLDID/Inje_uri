import { NextRequest } from "next/server";
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";
import { ERROR } from "@/server/lib/errors";
import * as placeService from "@/server/services/place/place.service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; suggestionId: string }> }) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다");

    const { id, suggestionId } = await params;
    const roomId = Number(id);
    const sgId = Number(suggestionId);
    if (isNaN(roomId) || isNaN(sgId)) return fail(ERROR.NOT_FOUND, "찾을 수 없습니다");

    const body = await req.json();
    const { status } = body;

    if (status !== "accepted" && status !== "dismissed")
        return fail(ERROR.VALIDATION_ERROR, "status는 accepted 또는 dismissed여야 합니다");

    const result = await placeService.updateSuggestionStatus(roomId, sgId, user.id, status);

    if ("error" in result) {
        if (result.error === ERROR.ALREADY_PROCESSED) return fail(ERROR.ALREADY_PROCESSED, "이미 처리된추천입니다");
        if (result.error === ERROR.FORBIDDEN) return fail(ERROR.FORBIDDEN, "접근 권한이 없습니다");
        return fail(ERROR.NOT_FOUND, "찾을 수 없습니다");
    }

    return ok(result);
}