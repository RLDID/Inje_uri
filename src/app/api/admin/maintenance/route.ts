import { NextRequest } from "next/server";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import { fail, noStore, ok } from "@/server/lib/response";
import { getMaintenanceMode, setMaintenanceMode } from "@/server/services/system/maintenance.service";

export async function GET(request: NextRequest) {
  if (!requireAdminRequest(request)) {
    return fail("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }

  try {
    return noStore(ok(await getMaintenanceMode()));
  } catch (error) {
    console.error("[GET /api/admin/maintenance]", error);
    return fail("INTERNAL_SERVER_ERROR", "점검 모드 상태를 불러오는 중 오류가 발생했습니다.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  if (!requireAdminRequest(request)) {
    return fail("UNAUTHORIZED", "관리자 인증이 필요합니다.", 401);
  }

  const body = await request.json().catch(() => null) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return fail("VALIDATION_ERROR", "enabled 값은 boolean이어야 합니다.");
  }

  try {
    return noStore(ok(await setMaintenanceMode(body.enabled)));
  } catch (error) {
    console.error("[PATCH /api/admin/maintenance]", error);
    return fail("INTERNAL_SERVER_ERROR", "점검 모드 상태를 변경하는 중 오류가 발생했습니다.", 500);
  }
}
