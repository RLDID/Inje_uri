import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { ok, fail } from "@/server/lib/response";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import { createAdminOperatorFeed } from "@/server/services/admin/admin-operator.service";

function parseIdList(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    const ids = value.map((item) => Number(item));
    return ids.every((id) => Number.isInteger(id)) ? ids : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const ids = parsed.map((item) => Number(item));
      return ids.every((id) => Number.isInteger(id)) ? ids : null;
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  const ids = trimmed.split(",").map((item) => Number(item.trim()));
  return ids.every((id) => Number.isInteger(id)) ? ids : null;
}

function parseStringList(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length > 0 ? items : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const items = parsed.map((item) => String(item).trim()).filter(Boolean);
      return items.length > 0 ? items : null;
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  const items = trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

async function parseOperatorFeedRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const text = formData.get("text");
    const feedKeywordIds = parseIdList(formData.get("feedKeywordIds"));
    const feedKeywordCodes = parseStringList(formData.get("feedKeywordCodes"));
    const images = formData
      .getAll("images")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    return { text, feedKeywordIds, feedKeywordCodes, images };
  }

  const body = await request.json();
  const { text, feedKeywordIds, feedKeywordCodes } = body as {
    text: unknown;
    feedKeywordIds: unknown;
    feedKeywordCodes: unknown;
  };

  return {
    text,
    feedKeywordIds: parseIdList(feedKeywordIds),
    feedKeywordCodes: parseStringList(feedKeywordCodes),
    images: [] as File[],
  };
}

export async function POST(request: NextRequest) {
  if (!requireAdminRequest(request)) {
    return fail("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }

  try {
    const { text, feedKeywordIds, feedKeywordCodes, images } = await parseOperatorFeedRequest(request);

    if (typeof text !== "string" || !text.trim()) {
      return fail("INVALID_TEXT", "피드 본문은 빈 값이 아닌 문자열이어야 합니다.");
    }

    if ((!feedKeywordIds || feedKeywordIds.length === 0) && (!feedKeywordCodes || feedKeywordCodes.length === 0)) {
      return fail("INVALID_KEYWORDS", "피드 키워드는 1개 이상 선택해야 합니다.");
    }

    const hasInvalidId = feedKeywordIds?.some((id) => typeof id !== "number" || !Number.isInteger(id)) ?? false;
    if (hasInvalidId) {
      return fail("INVALID_KEYWORD_ID", "피드 키워드 ID는 모두 정수여야 합니다.");
    }

    const data = await createAdminOperatorFeed({
      text,
      feedKeywordIds,
      feedKeywordCodes,
      images,
    });

    return ok(data, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status);
    }

    console.error("[POST /api/admin/operator/feed]", error);
    return fail("INTERNAL_SERVER_ERROR", "운영자 피드 작성 중 오류가 발생했습니다.", 500);
  }
}
