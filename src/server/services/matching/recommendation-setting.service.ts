// 추천 설정 조회·업데이트 비즈니스 로직

import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import {
  findSettingByUserId,
  upsertSetting,
} from "@/server/repositories/recommendation/recommendation-setting.repository";
import type { RecommendationSettingsResponse } from "@/server/types/recommendation.types";

interface UpdateSettingInput {
  exclude_same_department?: boolean;
  reduce_same_year?: boolean;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  filter_drinking?: boolean;
  filter_smoking?: boolean;
}

const DEFAULT_SETTINGS: RecommendationSettingsResponse = {
  exclude_same_department: false,
  reduce_same_year: false,
  preferred_age_min: null,
  preferred_age_max: null,
  filter_drinking: false,
  filter_smoking: false,
  updated_at: null,
};

// ─────────────────────────────────────────────
// GET: 추천 설정 조회
// ─────────────────────────────────────────────
export async function getRecommendationSetting(
  userId: number,
): Promise<RecommendationSettingsResponse> {
  const setting = await findSettingByUserId(userId);

  if (!setting) {
    return DEFAULT_SETTINGS;
  }

  return {
    exclude_same_department: setting.exclude_same_department,
    reduce_same_year: setting.reduce_same_year,
    preferred_age_min: setting.preferred_age_min,
    preferred_age_max: setting.preferred_age_max,
    filter_drinking: setting.filter_drinking,
    filter_smoking: setting.filter_smoking,
    updated_at: setting.updated_at.toISOString(),
  };
}

// ─────────────────────────────────────────────
// PATCH: 추천 설정 업데이트 (부분 업데이트 UPSERT)
// ─────────────────────────────────────────────
export async function updateRecommendationSetting(
  userId: number,
  patch: UpdateSettingInput,
): Promise<RecommendationSettingsResponse> {
  const {
    exclude_same_department,
    reduce_same_year,
    preferred_age_min,
    preferred_age_max,
    filter_drinking,
    filter_smoking,
  } = patch;

  // 나이 범위 검증
  if (
    preferred_age_min !== undefined &&
    preferred_age_max !== undefined &&
    preferred_age_min !== null &&
    preferred_age_max !== null &&
    preferred_age_min > preferred_age_max
  ) {
    throw new ApiError(ERROR.INVALID_INPUT, "최소 나이는 최대 나이보다 클 수 없습니다.");
  }

  const existing = await findSettingByUserId(userId);

  const data = {
    exclude_same_department:
      exclude_same_department !== undefined
        ? exclude_same_department
        : (existing?.exclude_same_department ?? false),
    reduce_same_year:
      reduce_same_year !== undefined
        ? reduce_same_year
        : (existing?.reduce_same_year ?? false),
    preferred_age_min:
      preferred_age_min !== undefined
        ? preferred_age_min
        : (existing?.preferred_age_min ?? null),
    preferred_age_max:
      preferred_age_max !== undefined
        ? preferred_age_max
        : (existing?.preferred_age_max ?? null),
    filter_drinking:
      filter_drinking !== undefined
        ? filter_drinking
        : (existing?.filter_drinking ?? false),
    filter_smoking:
      filter_smoking !== undefined
        ? filter_smoking
        : (existing?.filter_smoking ?? false),
    updated_at: new Date(),
  };

  const setting = await upsertSetting(userId, data);

  return {
    exclude_same_department: setting.exclude_same_department,
    reduce_same_year: setting.reduce_same_year,
    preferred_age_min: setting.preferred_age_min,
    preferred_age_max: setting.preferred_age_max,
    filter_drinking: setting.filter_drinking,
    filter_smoking: setting.filter_smoking,
    updated_at: setting.updated_at.toISOString(),
  };
}
