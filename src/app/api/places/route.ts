import { NextRequest } from "next/server";
import { getAuthUser } from "@/server/lib/auth";
import { ok, fail } from "@/server/lib/response";
import { ERROR } from "@/server/lib/errors";
import * as placeService from "@/server/services/place/place.service";

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다");

    const { searchParams } = new URL(req.url);
    const categoryCode = searchParams.get("category") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;

    const places = await placeService.getPlaces({ categoryCode, tag });
    return ok({ places });
}