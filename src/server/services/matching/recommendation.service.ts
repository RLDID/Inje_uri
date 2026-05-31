//추천 조회·선택·관심없음·후보 생성 비즈니스 로직

import { prisma } from "@/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { getBlockedUserIds, hasBlockRelation } from "@/server/repositories/safety/block.repository";
import {
  findTodayRecommendation,
  findCandidatesWithProfile,
  findItemInTodayRecommendation,
  getRecentlyRecommendedUserIds,
  createDailyRecommendation,
  deleteAllDailyRecommendations,
  deleteAllRecommendationDismisses,
  deleteAllRecommendationSettings,
  deleteRecommendationJobRuns,
} from "@/server/repositories/recommendation/recommendation.repository";
import { findPendingInterest, deleteAllInterests } from "@/server/repositories/interest/interest.repository";
import { upsertDismissInTx, getDismissId } from "@/server/repositories/interest/dismiss.repository";
import { deleteAllChatRooms } from "@/server/repositories/chat/chatRoom.repo";
import type {
  TodayRecommendationResponse,
  SelectCandidateResponse,
  DismissCandidateResponse,
} from "@/server/types/recommendation.types";

const RECOMMEND_COUNT = 3;
const DISMISS_COOLDOWN_DAYS = 7;
const DECLINE_COOLDOWN_DAYS = 7;
const RECENT_REC_EXCLUDE_DAYS = 7;

export type GenerateRecommendationsForUserResult = {
  generated: boolean;
  candidateCount: number;
  reason?: "USER_NOT_FOUND" | "USER_NOT_READY" | "NOT_ENOUGH_CANDIDATES";
};

/**
 * 이상형 매핑 테이블
 * 내 선택(desired_vibe / date_style) → 상대방이 가져야 할 특성(personality / interests)
 */
const IDEAL_TYPE_MAPPING: Record<string, { targetCategory: string; targetCodes: string[] }> = {
  // desired_vibe → personality
  "desired_vibe:comfortable": { targetCategory: "personality", targetCodes: ["calm", "affectionate"] },
  "desired_vibe:exciting":    { targetCategory: "personality", targetCodes: ["passionate", "social"] },
  "desired_vibe:intellectual":{ targetCategory: "personality", targetCodes: ["rational", "careful"] },
  "desired_vibe:funny":       { targetCategory: "personality", targetCodes: ["humorous"] },
  "desired_vibe:serious":     { targetCategory: "personality", targetCodes: ["honest", "rational"] },
  "desired_vibe:casual":      { targetCategory: "personality", targetCodes: ["social", "positive"] },
  // date_style → interests
  "date_style:restaurant": { targetCategory: "interests", targetCodes: ["food"] },
  "date_style:cafe":       { targetCategory: "interests", targetCodes: ["cafe"] },
  "date_style:movie":      { targetCategory: "interests", targetCodes: ["movies"] },
  "date_style:walk":       { targetCategory: "interests", targetCodes: ["exercise"] },
  "date_style:activity":   { targetCategory: "interests", targetCodes: ["exercise"] },
  "date_style:concert":    { targetCategory: "interests", targetCodes: ["music"] },
  "date_style:bookstore":  { targetCategory: "interests", targetCodes: ["reading"] },
};

/** 오늘우리 서비스 날짜. KST 09:00 전에는 전날 추천을 유지한다. */
function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 9) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  return kst.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────
// 오늘 추천 조회
// ─────────────────────────────────────────────
export async function getTodayRecommendations(
  userId: number,
): Promise<TodayRecommendationResponse> {
  const today = getKSTDateString();

  let rec = await findTodayRecommendation(userId, today);

  if (!rec) {
    throw new ApiError(ERROR.REC_NOT_GENERATED, "오늘의 추천이 아직 준비되지 않았습니다.");
  }

  let candidates = await findCandidatesWithProfile(rec.id);
  if (!isCompleteRecommendationCandidateSet(candidates)) {
    console.warn(
      `[recommendations] invalid recommendation set: recommendationId=${rec.id}, userId=${userId}, ranks=${candidates.map((c) => c.rank_order).join(",")}`,
    );

    const regenerated = rec.selected_candidate_user_id === null
      ? await regenerateIncompleteRecommendation(userId, today, rec.id)
      : null;

    if (!regenerated) {
      throw new ApiError(ERROR.REC_NOT_GENERATED, "오늘의 추천이 아직 준비되지 않았습니다.");
    }

    rec = regenerated.rec;
    candidates = regenerated.candidates;
  }

  const candidateUserIds = candidates.map((c) => c.candidate_user_id);
  const [keywordsMap, matchCountMap] = await Promise.all([
    fetchKeywordsForUsers(candidateUserIds),
    computeKeywordMatchCounts(userId, candidateUserIds),
  ]);

  return {
    recommendation_id: rec.id,
    recommendation_date: today,
    is_selection_made: rec.selected_candidate_user_id !== null,
    selected_candidate_user_id: rec.selected_candidate_user_id,
    candidates: candidates.map((c) => {
      return {
        item_id: c.item_id,
        candidate_user_id: c.candidate_user_id,
        rank_order: c.rank_order,
        keyword_match_count: matchCountMap.get(c.candidate_user_id) ?? 0,
        is_passed: c.passed_at !== null,
        blocked: false,
        profile: {
          nickname: c.nickname,
          gender: c.gender,
          age: c.age,
          department: c.department,
          student_year: c.student_year,
          bio: c.bio,
          primary_image_url: c.primary_image_url,
          keywords: keywordsMap.get(c.candidate_user_id) ?? [],
        },
      };
    }),
  };
}

// ─────────────────────────────────────────────
// 추천 선택 (호감 전송)
// ─────────────────────────────────────────────
export async function selectCandidate(
  userId: number,
  recommendationItemId: number,
): Promise<SelectCandidateResponse> {
  const today = getKSTDateString();

  // 1. ALREADY_SELECTED: 오늘 추천 조회 후 이미 선택했는지 먼저 확인
  const rec = await findTodayRecommendation(userId, today);
  if (!rec) {
    throw new ApiError(ERROR.REC_NOT_GENERATED, "오늘의 추천을 찾을 수 없습니다.");
  }

  if (rec.selected_candidate_user_id !== null) {
    throw new ApiError(ERROR.ALREADY_SELECTED, "오늘 이미 호감을 보냈습니다.");
  }

  // 2. INVALID_ITEM: item이 오늘 추천 목록에 있는지 확인
  const item = await findItemInTodayRecommendation(userId, recommendationItemId, today);
  if (!item) {
    throw new ApiError(ERROR.INVALID_ITEM, "유효하지 않은 추천 항목입니다.");
  }

  if (item.passed_at !== null) {
    throw new ApiError(ERROR.ALREADY_DISMISSED, "이미 관심없음 처리된 항목입니다.");
  }

  // 4. BLOCKED_RELATIONSHIP: 차단 관계 확인
  const hasBlock = await hasBlockRelation(userId, item.candidate_user_id);
  if (hasBlock) {
    throw new ApiError(ERROR.BLOCKED_RELATIONSHIP, "차단 관계로 호감을 보낼 수 없습니다.");
  }

  // 4. DUPLICATE_INTEREST: 중복 pending 호감 확인
  const existing = await findPendingInterest(userId, item.candidate_user_id);
  if (existing) {
    throw new ApiError(ERROR.DUPLICATE_INTEREST, "이미 호감을 보낸 상대입니다.");
  }

  // 트랜잭션: 선택 처리 + 나머지 pass + 호감 생성
  const newInterest = await prisma.$transaction(async (tx) => {
    const updated = await tx.$executeRaw`
      UPDATE daily_recommendations
      SET selected_candidate_user_id = ${item.candidate_user_id},
          selected_at = NOW()
      WHERE id = ${rec.id}
        AND selected_candidate_user_id IS NULL
    `;

    if (updated === 0) {
      throw new ApiError(ERROR.ALREADY_SELECTED, "오늘 이미 호감을 보냈습니다.");
    }

    await tx.$executeRaw`
      UPDATE daily_recommendation_items
      SET passed_at = NOW()
      WHERE daily_recommendation_id = ${rec.id}
        AND id != ${recommendationItemId}
        AND passed_at IS NULL
    `;

    const [interest] = await tx.$queryRaw<{ id: number }[]>`
      INSERT INTO interests (from_user_id, to_user_id, status, created_at)
      VALUES (${userId}, ${item.candidate_user_id}, 'pending', NOW())
      RETURNING id
    `;

    return interest;
  });

  const { checkAndCreateMatch } = await import("@/server/services/matching/matching.service");
  const matchResult = await checkAndCreateMatch(
    userId,
    item.candidate_user_id,
    newInterest.id,
  );

  return {
    interest_id: newInterest.id,
    matched: matchResult.matched,
    chat_room_id: matchResult.chat_room_id,
  };
}

// ─────────────────────────────────────────────
// 관심없음 처리
// ─────────────────────────────────────────────
export async function dismissCandidate(
  userId: number,
  itemId: number,
): Promise<DismissCandidateResponse> {
  const today = getKSTDateString();

  const item = await findItemInTodayRecommendation(userId, itemId, today);
  if (!item) {
    throw new ApiError(ERROR.INVALID_ITEM, "유효하지 않은 추천 항목입니다.");
  }

  const rec = await findTodayRecommendation(userId, today);
  if (rec?.selected_candidate_user_id === item.candidate_user_id) {
    throw new ApiError(ERROR.ALREADY_SELECTED, "이미 호감을 보낸 상대는 관심없음 처리할 수 없습니다.");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DISMISS_COOLDOWN_DAYS);

  // 오늘 추천 3명은 하루 동안 고정한다. dismiss는 다음 추천 생성부터만 반영한다.
  await prisma.$transaction(async (tx) => {
    await upsertDismissInTx(tx, userId, item.candidate_user_id, item.daily_recommendation_id, expiresAt);
  });

  const dismiss = await getDismissId(userId, item.candidate_user_id);

  return {
    dismiss_id: dismiss.id,
    expires_at: expiresAt.toISOString(),
  };
}

// ─────────────────────────────────────────────
// 배치 — 추천 생성 (배치 + 온보딩 즉시 생성 공용)
// ─────────────────────────────────────────────
export async function generateRecommendationsForUser(
  userId: number,
  date: string,
): Promise<GenerateRecommendationsForUserResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gender: true,
      department: true,
      student_year: true,
      age: true,
      onboarding_completed: true,
      status: true,
      deleted_at: true,
      recommendationSetting: true,
    },
  });

  if (!user) return { generated: false, candidateCount: 0, reason: "USER_NOT_FOUND" };
  if (user.status !== "active" || !user.onboarding_completed || user.deleted_at !== null) {
    return { generated: false, candidateCount: 0, reason: "USER_NOT_READY" };
  }

  const settings = user.recommendationSetting;

  // 후보 풀 제외 조건
  const blockedIds = await getBlockedUserIds(userId);

  // 유효 호감 / 매칭 완료 상대
  const interestRows = await prisma.$queryRaw<{ user_id: number }[]>`
    SELECT to_user_id AS user_id FROM interests
    WHERE from_user_id = ${userId} AND matched_at IS NULL AND declined_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    UNION
    SELECT from_user_id AS user_id FROM interests
    WHERE to_user_id = ${userId} AND matched_at IS NULL AND declined_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    UNION
    SELECT CASE WHEN i.from_user_id = ${userId} THEN i.to_user_id ELSE i.from_user_id END AS user_id
    FROM interests i
    JOIN chat_rooms cr ON cr.source_interest_id = i.id
    JOIN chat_room_participants crp ON crp.chat_room_id = cr.id
    WHERE (i.from_user_id = ${userId} OR i.to_user_id = ${userId})
      AND i.matched_at IS NOT NULL
      AND crp.user_id = ${userId}
      AND (crp.left_at IS NULL OR crp.left_at > NOW() - INTERVAL '7 days')
  `;
  const excludeByInterest = new Set(interestRows.map((r) => r.user_id));

  // 거절 후 쿨다운 미경과
  const declineCutoff = new Date();
  declineCutoff.setDate(declineCutoff.getDate() - DECLINE_COOLDOWN_DAYS);
  const declinedRows = await prisma.$queryRaw<{ user_id: number }[]>`
    SELECT from_user_id AS user_id FROM interests
    WHERE to_user_id = ${userId}
      AND declined_at IS NOT NULL
      AND declined_at > ${declineCutoff}
    UNION
    SELECT to_user_id AS user_id FROM interests
    WHERE from_user_id = ${userId}
      AND declined_at IS NOT NULL
      AND declined_at > ${declineCutoff}
  `;
  const excludeByDecline = new Set(declinedRows.map((r) => r.user_id));

  // 관심없음 유효
  const dismissRows = await prisma.$queryRaw<{ dismissed_user_id: number }[]>`
    SELECT dismissed_user_id FROM recommendation_dismisses
    WHERE user_id = ${userId} AND expires_at > NOW()
  `;
  const excludeByDismiss = new Set(dismissRows.map((r) => r.dismissed_user_id));

  // 이상형 매핑 기반 타겟 키워드 ID 조회
  // desired_vibe/date_style → personality/interests 변환
  const idealTypeIds = await resolveIdealTypeKeywordIds(userId);
  const safeKeywordIds = idealTypeIds.length > 0 ? idealTypeIds : [-1];

  // 음주/흡연 필터: settings에서 활성화 여부 확인
  const isFilterDrinkingActive = settings?.filter_drinking ?? false;
  const isFilterSmokingActive = settings?.filter_smoking ?? false;

  // 필터 대상 키워드 ID 조회 (음주: often/sometimes, 흡연: yes)
  const filterKeywordRows = await prisma.$queryRaw<{ keyword_id: number; cat: string; code: string }[]>`
    SELECT k.keyword_id, c.category_code AS cat, k.keyword_code AS code
    FROM keyword k
    JOIN categories c ON k.category_id = c.category_id
    WHERE (c.category_code = 'drinking' AND k.keyword_code IN ('often', 'sometimes'))
       OR (c.category_code = 'smoking'  AND k.keyword_code = 'yes')
  `;

  const drinkingExcludeIds = filterKeywordRows.filter(k => k.cat === 'drinking').map(k => k.keyword_id);
  const smokingExcludeIds  = filterKeywordRows.filter(k => k.cat === 'smoking').map(k => k.keyword_id);

  const safeDrinkingIds = drinkingExcludeIds.length > 0 ? drinkingExcludeIds : [0];
  const safeSmokingIds  = smokingExcludeIds.length  > 0 ? smokingExcludeIds  : [0];

  // 추천 조건 완화 단계별 시도
  const fallbackSteps = [
    { recentDays: RECENT_REC_EXCLUDE_DAYS, relaxSameYear: false, agePad: 0, relaxDept: false },
    { recentDays: RECENT_REC_EXCLUDE_DAYS, relaxSameYear: true, agePad: 0, relaxDept: false },
    { recentDays: RECENT_REC_EXCLUDE_DAYS, relaxSameYear: true, agePad: 2, relaxDept: false },
    { recentDays: RECENT_REC_EXCLUDE_DAYS, relaxSameYear: true, agePad: 2, relaxDept: true },
  ];

  let candidates: number[] = [];

  for (const step of fallbackSteps) {
    const recentIds = await getRecentlyRecommendedUserIds(userId, step.recentDays, date);

    const excludeIds = new Set([
      userId,
      ...blockedIds,
      ...excludeByInterest,
      ...excludeByDecline,
      ...excludeByDismiss,
      ...recentIds,
    ]);

    const activeUsers = await prisma.$queryRaw<{
      id: number;
      gender: string;
      department: string;
      student_year: number;
      age: number | null;
      keyword_match_count: bigint;
      keyword_count: bigint;
      image_count: bigint;
      has_bio: boolean;
      created_at: Date;
    }[]>`
      SELECT
        u.id,
        u.gender,
        u.department,
        u.student_year,
        u.age,
        u.created_at,
        COUNT(DISTINCT CASE WHEN uks.keyword_id IN (${Prisma.join(safeKeywordIds)}) THEN uks.id END) AS keyword_match_count,
        COUNT(DISTINCT uks.id) AS keyword_count,
        COUNT(DISTINCT upi.id) AS image_count,
        (u.bio IS NOT NULL AND u.bio != '') AS has_bio
      FROM users u
      LEFT JOIN user_keyword_selections uks ON uks.user_id = u.id
      LEFT JOIN user_profile_images upi ON upi.user_id = u.id
      WHERE u.status = 'active'
        AND u.onboarding_completed = true
        AND u.gender != ${user.gender}
        AND u.id NOT IN (${Prisma.join(excludeIds.size > 0 ? [...excludeIds] : [-1])})
        AND (
          NOT ${isFilterDrinkingActive}
          OR NOT EXISTS (
            SELECT 1 FROM user_keyword_selections uks_d
            WHERE uks_d.user_id = u.id AND uks_d.keyword_id IN (${Prisma.join(safeDrinkingIds)})
          )
        )
        AND (
          NOT ${isFilterSmokingActive}
          OR NOT EXISTS (
            SELECT 1 FROM user_keyword_selections uks_s
            WHERE uks_s.user_id = u.id AND uks_s.keyword_id IN (${Prisma.join(safeSmokingIds)})
          )
        )
      GROUP BY u.id
    `;

    let pool = activeUsers;

    // 나이 범위 필터
    if (settings?.preferred_age_min || settings?.preferred_age_max) {
      const ageMin = (settings.preferred_age_min ?? 0) - step.agePad;
      const ageMax = (settings.preferred_age_max ?? 999) + step.agePad;
      pool = pool.filter(
        (u) => u.age === null || (u.age >= ageMin && u.age <= ageMax),
      );
    }

    // 같은 학과 제외
    if (settings?.exclude_same_department && !step.relaxDept) {
      pool = pool.filter((u) => u.department !== user.department);
    }

    // 같은 학년 비중 축소
    if (settings?.reduce_same_year && !step.relaxSameYear) {
      const diffYear = pool.filter((u) => u.student_year !== user.student_year);
      if (diffYear.length >= RECOMMEND_COUNT) {
        pool = diffYear;
      }
    }

    // 1개 이상 일치 풀과 0개 일치 풀 분리
    const matchPool = pool.filter((u) => Number(u.keyword_match_count) >= 1);
    const zeroPool = pool.filter((u) => Number(u.keyword_match_count) === 0);

    // 1개 이상 일치: 1순위 keyword_match_count 내림차순, 동점 시 프로필 완성도 내림차순
    const scoredMatch = matchPool
      .map((u) => ({
        id: u.id,
        keywordMatch: Number(u.keyword_match_count),
        profileScore:
          Number(u.image_count) * 3 +
          Number(u.keyword_count) * 2 +
          (u.has_bio ? 2 : 0),
      }))
      .sort((a, b) =>
        b.keywordMatch !== a.keywordMatch
          ? b.keywordMatch - a.keywordMatch
          : b.profileScore - a.profileScore,
      );

    // 0개 일치: 매 요청마다 다른 결과 (랜덤)
    const shuffledZero = zeroPool
      .map((u) => ({ id: u.id, rand: Math.random() }))
      .sort((a, b) => a.rand - b.rand);

    candidates = [
      ...scoredMatch.map((s) => s.id),
      ...shuffledZero.map((s) => s.id),
    ].slice(0, RECOMMEND_COUNT);

    if (candidates.length >= RECOMMEND_COUNT) break;
  }

  if (candidates.length < RECOMMEND_COUNT) {
    console.warn(
      `[recommendations] not enough candidates: userId=${userId}, date=${date}, candidateCount=${candidates.length}`,
    );
    return {
      generated: false,
      candidateCount: candidates.length,
      reason: "NOT_ENOUGH_CANDIDATES",
    };
  }

  await createDailyRecommendation(userId, date, candidates);
  return { generated: true, candidateCount: candidates.length };
}

// ─────────────────────────────────────────────
// 키워드 조회 헬퍼
// ─────────────────────────────────────────────
async function regenerateIncompleteRecommendation(
  userId: number,
  today: string,
  recommendationId: number,
) {
  await prisma.dailyRecommendation.delete({ where: { id: recommendationId } });

  const result = await generateRecommendationsForUser(userId, today);
  if (!result.generated) return null;

  const rec = await findTodayRecommendation(userId, today);
  if (!rec) return null;

  const candidates = await findCandidatesWithProfile(rec.id);
  if (!isCompleteRecommendationCandidateSet(candidates)) return null;

  return { rec, candidates };
}

function isCompleteRecommendationCandidateSet(candidates: { rank_order: number; candidate_user_id: number }[]): boolean {
  if (candidates.length !== RECOMMEND_COUNT) return false;
  if (new Set(candidates.map((candidate) => candidate.candidate_user_id)).size !== RECOMMEND_COUNT) return false;

  const ranks = candidates.map((candidate) => candidate.rank_order).sort((left, right) => left - right);
  return ranks.every((rank, index) => rank === index + 1);
}

async function fetchKeywordsForUsers(
  userIds: number[],
): Promise<Map<number, { category: string; code: string; label: string }[]>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<{
    user_id: number;
    category_code: string;
    keyword_code: string;
    label: string;
  }[]>`
    SELECT uks.user_id, c.category_code, k.keyword_code, k.label
    FROM user_keyword_selections uks
    JOIN keyword k ON k.keyword_id = uks.keyword_id
    JOIN categories c ON c.category_id = k.category_id
    WHERE uks.user_id IN (${Prisma.join(userIds)})
    ORDER BY uks.user_id, c.category_id, k.sort_order
  `;

  const map = new Map<number, { category: string; code: string; label: string }[]>();
  for (const row of rows) {
    if (!map.has(row.user_id)) map.set(row.user_id, []);
    map.get(row.user_id)!.push({
      category: row.category_code,
      code: row.keyword_code,
      label: row.label,
    });
  }
  return map;
}

/**
 * 유저의 desired_vibe / date_style 선택을 매핑 테이블로 변환해
 * 상대방이 가져야 할 personality / interests keyword_id 목록을 반환한다.
 */
async function resolveIdealTypeKeywordIds(userId: number): Promise<number[]> {
  const preferenceRows = await prisma.$queryRaw<{ cat: string; code: string }[]>`
    SELECT c.category_code AS cat, k.keyword_code AS code
    FROM user_keyword_selections uks
    JOIN keyword k ON k.keyword_id = uks.keyword_id
    JOIN categories c ON c.category_id = k.category_id
    WHERE uks.user_id = ${userId}
      AND c.category_code IN ('desired_vibe', 'date_style')
  `;

  if (preferenceRows.length === 0) return [];

  // 매핑 적용 → 타겟 카테고리별 코드 목록 집계
  const grouped = new Map<string, Set<string>>();
  for (const row of preferenceRows) {
    const mapping = IDEAL_TYPE_MAPPING[`${row.cat}:${row.code}`];
    if (!mapping) continue;
    const existing = grouped.get(mapping.targetCategory) ?? new Set<string>();
    mapping.targetCodes.forEach((c) => existing.add(c));
    grouped.set(mapping.targetCategory, existing);
  }

  if (grouped.size === 0) return [];

  // 타겟 keyword_id DB 조회 (카테고리별 최대 2회)
  const resultIds: number[] = [];
  for (const [targetCategory, targetCodes] of grouped) {
    const rows = await prisma.$queryRaw<{ keyword_id: number }[]>`
      SELECT k.keyword_id
      FROM keyword k
      JOIN categories c ON k.category_id = c.category_id
      WHERE c.category_code = ${targetCategory}
        AND k.keyword_code IN (${Prisma.join([...targetCodes])})
    `;
    resultIds.push(...rows.map((r) => r.keyword_id));
  }

  return [...new Set(resultIds)];
}

/**
 * 후보 유저들에 대해 나의 이상형 keyword_match_count를 동적으로 계산한다.
 */
async function computeKeywordMatchCounts(
  userId: number,
  candidateUserIds: number[],
): Promise<Map<number, number>> {
  if (candidateUserIds.length === 0) return new Map();

  const idealTypeIds = await resolveIdealTypeKeywordIds(userId);
  if (idealTypeIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<{ candidate_user_id: number; match_count: bigint }[]>`
    SELECT uks.user_id AS candidate_user_id, COUNT(*) AS match_count
    FROM user_keyword_selections uks
    WHERE uks.user_id IN (${Prisma.join(candidateUserIds)})
      AND uks.keyword_id IN (${Prisma.join(idealTypeIds)})
    GROUP BY uks.user_id
  `;

  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.candidate_user_id, Number(row.match_count));
  }
  return map;
}

// ─────────────────────────────────────────────
// 배포 전 테스트 데이터 초기화
// ─────────────────────────────────────────────
export async function resetTestData(): Promise<{
  chatRooms: number;
  interests: number;
  recommendations: number;
  dismisses: number;
  settings: number;
  jobRuns: number;
}> {
  const [chatRooms, interests, recommendations, dismisses, settings, jobRuns] =
    await Promise.all([
      deleteAllChatRooms(),
      deleteAllInterests(),
      deleteAllDailyRecommendations(),
      deleteAllRecommendationDismisses(),
      deleteAllRecommendationSettings(),
      deleteRecommendationJobRuns(),
    ]);

  return { chatRooms, interests, recommendations, dismisses, settings, jobRuns };
}
