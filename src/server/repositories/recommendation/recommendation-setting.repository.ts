// recommendation_settings 테이블 단순 CRUD

import { prisma } from "@/server/db/prisma";

export interface SettingRow {
  user_id: number;
  exclude_same_department: boolean;
  reduce_same_year: boolean;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  updated_at: Date;
}

/** 유저 추천 설정 조회. 설정 없으면 null */
export async function findSettingByUserId(userId: number): Promise<SettingRow | null> {
  return prisma.recommendationSetting.findUnique({
    where: { user_id: userId },
  }) as Promise<SettingRow | null>;
}

/** 추천 설정 UPSERT */
export async function upsertSetting(
  userId: number,
  data: {
    exclude_same_department: boolean;
    reduce_same_year: boolean;
    preferred_age_min: number | null;
    preferred_age_max: number | null;
    updated_at: Date;
  },
): Promise<SettingRow> {
  return prisma.recommendationSetting.upsert({
    where: { user_id: userId },
    update: data,
    create: { user_id: userId, ...data },
  }) as Promise<SettingRow>;
}
