// 쌍방 호감 판정 후 C파트 chatRoomService를 직접 호출하여 채팅방 생성

import { prisma } from "@/server/db/prisma";
import {
  findReversePendingInterest,
  confirmMatch,
} from "@/server/repositories/interest/interest.repository";
import { passMatchedCandidateItem } from "@/server/repositories/recommendation/recommendation.repository";
import * as chatRoomService from "@/server/services/conversation/chatRoom.service";

export interface MatchResult {
  matched: boolean;
  chat_room_id: number | null;
}

/** KST 오늘 날짜 (YYYY-MM-DD) */
function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

/**
 * 쌍방 호감 여부를 판정하고, 매칭 시 C파트 chatRoomService.createChatRoom을 직접 호출한다.
 *
 * D파트(comment.service)가 chatRoomService를 직접 호출하는 패턴과 동일하게 통일.
 * 자기 서버에 fetch로 자기 API를 호출하는 안티패턴 제거.
 *
 * @param myUserId     호감을 보낸 유저
 * @param targetUserId 호감을 받은 유저
 * @param myInterestId 방금 생성된 Interest.id
 */
export async function checkAndCreateMatch(
  myUserId: number,
  targetUserId: number,
  myInterestId: number,
): Promise<MatchResult> {
  // 역방향 pending 호감 조회 (상대가 나에게 보낸 호감)
  const reverseInterest = await findReversePendingInterest(targetUserId, myUserId);

  if (!reverseInterest) {
    return { matched: false, chat_room_id: null };
  }

  // 먼저 보낸 사람 판정: created_at 비교
  const myInterestRow = await prisma.$queryRaw<{ created_at: Date }[]>`
    SELECT created_at FROM interests WHERE id = ${myInterestId} LIMIT 1
  `;
  const myCreatedAt = myInterestRow[0]?.created_at ?? new Date();
  const sourceInterestId =
    reverseInterest.created_at <= myCreatedAt ? reverseInterest.id : myInterestId;

  // 양쪽 Interest matched_at 업데이트
  await confirmMatch(myInterestId, reverseInterest.id);

  // 매칭된 두 유저의 오늘 추천 목록에서 서로를 passed_at 처리
  const today = getKSTDateString();
  await Promise.allSettled([
    passMatchedCandidateItem(myUserId, targetUserId, today),
    passMatchedCandidateItem(targetUserId, myUserId, today),
  ]);

  // C파트 chatRoomService 직접 호출 (네트워크/인증 우회 없음)
  const result = await chatRoomService.createChatRoom({
    requestUserId: myUserId,
    targetUserId,
    sourceType: "interest",
    sourceInterestId,
  });

  if ("error" in result) {
    console.warn("[matching.service] 채팅방 생성 실패, 매칭은 유지됨:", result.error);
    return { matched: true, chat_room_id: null };
  }

  return { matched: true, chat_room_id: result.chatRoomId };
}
