//호감 수락·거절·직접 전송 비즈니스 로직

import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { hasBlockRelation } from "@/server/repositories/safety/block.repository";
import { getBlockedUserIds } from "@/server/repositories/safety/block.repository";
import {
  findPendingInterest,
  findReversePendingInterest,
  findInterestById,
  findReceivedInterestsWithProfile,
  insertInterest,
  declineInterestById,
} from "@/server/repositories/interest/interest.repository";
import { findActiveDismiss } from "@/server/repositories/interest/dismiss.repository";
import { checkAndCreateMatch } from "@/server/services/matching/matching.service";
import type {
  ReceivedInterestsResponse,
  AcceptInterestResponse,
  DeclineInterestResponse,
  SendInterestResponse,
} from "@/server/types/interest.types";

// ─────────────────────────────────────────────
// 받은 호감 목록
// ─────────────────────────────────────────────
export async function getReceivedInterests(
  userId: number,
): Promise<ReceivedInterestsResponse> {
  const blockedIds = await getBlockedUserIds(userId);
  const interests = await findReceivedInterestsWithProfile(userId, blockedIds);

  return {
    interests: interests.map((i) => ({
      interest_id: i.id,
      from_user_id: i.from_user_id,
      created_at: i.created_at.toISOString(),
      profile: {
        nickname: i.nickname,
        age: i.age,
        department: i.department,
        student_year: i.student_year,
        bio: i.bio,
        primary_image_url: i.primary_image_url,
        gender: i.gender,
      },
    })),
    total_count: interests.length,
  };
}

// ─────────────────────────────────────────────
// 호감 수락 (맞호감 전송 → 매칭 판정)
// ─────────────────────────────────────────────
export async function acceptInterest(
  userId: number,
  interestId: number,
): Promise<AcceptInterestResponse> {
  const interest = await findInterestById(interestId);

  if (
    !interest ||
    interest.to_user_id !== userId ||
    interest.matched_at !== null ||
    interest.declined_at !== null
  ) {
    throw new ApiError(ERROR.INVALID_INTEREST, "유효하지 않은 호감입니다.");
  }

  if (interest.expires_at !== null && new Date(interest.expires_at) <= new Date()) {
    throw new ApiError(ERROR.INTEREST_EXPIRED, "만료된 호감은 수락할 수 없습니다.");
  }

  const fromUserId = interest.from_user_id;

  const hasBlock = await hasBlockRelation(userId, fromUserId);
  if (hasBlock) {
    throw new ApiError(ERROR.BLOCKED_RELATIONSHIP, "차단 관계로 호감을 보낼 수 없습니다.");
  }

  const existing = await findPendingInterest(userId, fromUserId);
  const responseInterest = existing ?? await insertInterest(userId, fromUserId);

  const matchResult = await checkAndCreateMatch(userId, fromUserId, responseInterest.id);

  return {
    interest_id: responseInterest.id,
    matched: matchResult.matched,
    chat_room_id: matchResult.chat_room_id,
  };
}

// ─────────────────────────────────────────────
// 호감 거절
// ─────────────────────────────────────────────
export async function declineInterest(
  userId: number,
  interestId: number,
): Promise<DeclineInterestResponse> {
  const interest = await findInterestById(interestId);

  if (!interest || interest.to_user_id !== userId || interest.matched_at !== null) {
    throw new ApiError(ERROR.INVALID_INTEREST, "유효하지 않은 호감입니다.");
  }

  if (interest.declined_at !== null) {
    throw new ApiError(ERROR.ALREADY_PROCESSED, "이미 처리된 호감입니다.");
  }

  const declined = await declineInterestById(interestId);
  if (!declined) {
    throw new ApiError(ERROR.ALREADY_PROCESSED, "이미 처리된 호감입니다.");
  }

  const declinedAt = declined.declined_at ?? new Date();

  return {
    interest_id: declined.id,
    declined_at: declinedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────
// 호감 보내기 (직접)
// ─────────────────────────────────────────────
export async function sendInterest(
  userId: number,
  toUserId: number,
): Promise<SendInterestResponse> {
  if (userId === toUserId) {
    throw new ApiError(ERROR.INVALID_INPUT, "자기 자신에게 호감을 보낼 수 없습니다.");
  }

  const hasBlock = await hasBlockRelation(userId, toUserId);
  if (hasBlock) {
    throw new ApiError(ERROR.BLOCKED_RELATIONSHIP, "차단 관계로 호감을 보낼 수 없습니다.");
  }

  const isDismissed = await findActiveDismiss(userId, toUserId);
  if (isDismissed) {
    throw new ApiError(ERROR.ALREADY_DISMISSED, "관심없음 처리한 상대에게는 호감을 보낼 수 없습니다.");
  }

  const reverseInterest = await findReversePendingInterest(toUserId, userId);
  if (!reverseInterest) {
    throw new ApiError(ERROR.REVERSE_INTEREST_NOT_FOUND, "호감을 먼저 보낸 상대에게만 직접 호감을 보낼 수 있습니다.");
  }

  const existing = await findPendingInterest(userId, toUserId);
  const responseInterest = existing ?? await insertInterest(userId, toUserId);

  const matchResult = await checkAndCreateMatch(userId, toUserId, responseInterest.id);

  return {
    interest_id: responseInterest.id,
    matched: matchResult.matched,
    chat_room_id: matchResult.chat_room_id,
  };
}
