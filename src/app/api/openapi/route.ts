import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi";
import { noStore } from "@/server/lib/response";

function isOpenApiPublic(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.OPENAPI_PUBLIC === "true";
}

function notFound() {
  return noStore(NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
    { status: 404 },
  ));
}

export function GET() {
  if (!isOpenApiPublic()) {
    return notFound();
  }

  return noStore(NextResponse.json(openApiSpec));
}
