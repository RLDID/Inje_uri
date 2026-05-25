import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

export function ok<T>(data: T, status: number | ResponseInit = 200): NextResponse<ApiResponse<T>> {
  const init: ResponseInit = typeof status === "number" ? { status } : { status: 200, ...status };
  return NextResponse.json({ success: true, data }, init);
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiResponse<never>,
    { status },
  );
}

export function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
