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
  passItemInTx,
  getRecentlyRecommendedUserIds,
  createDailyRecommendation,
} from "@/server/repositories/recommendation/recommendation.repository";
import { findPendingInterest } from "@/server/repositories/interest/interest.repository";
import { upsertDismissInTx, getDismissId, findActiveDismiss } from "@/server/repositories/interest/dismiss.repository";
import type {
  TodayRecommendationResponse,
  SelectCandidateResponse,
  DismissCandidateResponse,
} from "@/server/types/recommendation.types";

const RECOMMEND_COUNT = 3;
const DISMISS_COOLDOWN_DAYS = 7;
const DECLINE_COOLDOWN_DAYS = 7;
const RECENT_REC_EXCLUDE_DAYS = 7;

/** KST 오늘 날짜 (YYYY-MM-DD) */
function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────
// 오늘 추천 조회
// ─────────────────────────────────────────────
export async function getTodayRecommendations(
  userId: number,
): Promise<TodayRecommendationResponse> {
  const today = getKSTDateString();

  const rec = await findTodayRecommendation(userId, today);

  if (!rec) {
    throw new ApiError(ERROR.REC_NOT_GENERATED, "오늘의 추천이 아직 준비되지 않았습니다.");
  }

  const candidates = await findCandidatesWithProfile(rec.id);
  const blockedIds = await getBlockedUserIds(userId);

  const keywordsMap = await fetchKeywordsForUsers(
    candidates.map((c) => c.candidate_user_id),
  );

  return {
    recommendation_id: rec.id,
    recommendation_date: today,
    is_selection_made: rec.selected_candidate_user_id !== null,
    selected_candidate_user_id: rec.selected_candidate_user_id,
    candidates: candidates.map((c) => {
      const isBlocked = blockedIds.has(c.candidate_user_id);
      return {
        item_id: c.item_id,
        candidate_user_id: c.candidate_user_id,
        rank_order: c.rank_order,
        is_passed: c.passed_at !== null,
        blocked: isBlocked,
        profile: isBlocked
          ? null
          : {
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

  // 3. ALREADY_DISMISSED: 유효한 dismiss 레코드 확인
  const isDismissed = await findActiveDismiss(userId, item.candidate_user_id);
  if (isDismissed) {
    throw new ApiError(ERROR.ALREADY_DISMISSED, "관심없음 처리한 상대에게는 호감을 보낼 수 없습니다.");
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

  // passed_at 업데이트 + dismiss UPSERT를 원자적으로 처리
  await prisma.$transaction(async (tx) => {
    await passItemInTx(tx, itemId);
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
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gender: true,
      department: true,
      student_year: true,
      age: true,
      recommendationSetting: true,
    },
  });

  if (!user) return;

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

  // 이상형 키워드 ID 목록 조회 (정렬 1순위 기준)
  const userKeywordRows = await prisma.$queryRaw<{ keyword_id: number }[]>`
    SELECT keyword_id FROM user_keyword_selections WHERE user_id = ${userId}
  `;
  const userKeywordIds = userKeywordRows.map((r) => r.keyword_id);
  const safeKeywordIds = userKeywordIds.length > 0 ? userKeywordIds : [-1];

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
    { recentDays: 3, relaxSameYear: true, agePad: 2, relaxDept: true },
    { recentDays: 1, relaxSameYear: true, agePad: 2, relaxDept: true },
    { recentDays: 0, relaxSameYear: true, agePad: 2, relaxDept: true },
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

  if (candidates.length === 0) return;

  await createDailyRecommendation(userId, date, candidates);
}

// ─────────────────────────────────────────────
// 키워드 조회 헬퍼
// ─────────────────────────────────────────────
async function fetchKeywordsForUsers(
  userIds: number[],
): Promise<Map<number, { category: string; label: string }[]>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<{
    user_id: number;
    category_name: string;
    label: string;
  }[]>`
    SELECT uks.user_id, c.name AS category_name, k.label
    FROM user_keyword_selections uks
    JOIN keyword k ON k.keyword_id = uks.keyword_id
    JOIN categories c ON c.category_id = k.category_id
    WHERE uks.user_id IN (${Prisma.join(userIds)})
  `;

  const map = new Map<number, { category: string; label: string }[]>();
  for (const row of rows) {
    if (!map.has(row.user_id)) map.set(row.user_id, []);
    map.get(row.user_id)!.push({ category: row.category_name, label: row.label });
  }
  return map;
}
