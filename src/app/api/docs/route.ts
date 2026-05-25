import { ApiReference } from "@scalar/nextjs-api-reference";
import { NextResponse } from "next/server";
import { noStore } from "@/server/lib/response";

const docsHandler = ApiReference({
  url: "/api/openapi",
});

function isOpenApiPublic(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.OPENAPI_PUBLIC === "true";
}

export function GET(request: Request) {
  if (!isOpenApiPublic()) {
    return noStore(NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    ));
  }

  void request;
  return docsHandler();
}
