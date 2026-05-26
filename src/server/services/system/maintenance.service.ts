import { findAppSetting, upsertAppSetting } from "@/server/repositories/app-setting/app-setting.repository";

export const MAINTENANCE_MODE_SETTING_KEY = "maintenance_mode";

interface MaintenanceModeRecord {
  value: string;
  updated_at: Date;
}

export interface MaintenanceModeDto {
  enabled: boolean;
  updatedAt: string | null;
}

function toMaintenanceModeDto(record: MaintenanceModeRecord | null): MaintenanceModeDto {
  return {
    enabled: record?.value === "true",
    updatedAt: record?.updated_at.toISOString() ?? null,
  };
}

export async function getMaintenanceMode(): Promise<MaintenanceModeDto> {
  const record = await findAppSetting(MAINTENANCE_MODE_SETTING_KEY);
  return toMaintenanceModeDto(record);
}

export async function setMaintenanceMode(enabled: boolean): Promise<MaintenanceModeDto> {
  const record = await upsertAppSetting(MAINTENANCE_MODE_SETTING_KEY, enabled ? "true" : "false");
  return toMaintenanceModeDto(record);
}
