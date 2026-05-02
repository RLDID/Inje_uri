 /**
   * participant.repo.ts
   *
   * chat_room_participants 테이블 DB 접근 계층.
   * 나가기/읽음 판단은 여기 두지 않는다 — service 몫.
   */

  import { prisma } from "@/server/db/prisma";

  // ─────────────────────────────────────────────
  // 조회
  // ─────────────────────────────────────────────

  /**
   * 특정 유저의 채팅방 참여자 row 단건 조회.
   *
   * 주요 사용처:
   * - 채팅방 접근 권한 확인 (참여자인지)
   * - last_read_message_id 조회 → unread count 계산
   * - left_at 확인 → 이미 나간 유저 차단
   *
   * 없으면 null 반환 — service에서 NOT_PARTICIPANT 처리.
   */
  export async function findParticipant(roomId: number, userId: number) {
    return prisma.chatRoomParticipant.findUnique({
      where: {
        chat_room_id_user_id: {   // 스키마에 @@unique([chat_room_id, user_id])복합유니크 Prisma가 자동으로
          chat_room_id: roomId,   // chat_room_id_user_id로 복합키 생성. 
          user_id: userId,
        },
      },
    });
  }

  /**
   * 채팅방 전체 참여자 목록 조회.
   *
   * 주요 사용처:
   * - 나가기 처리 후 양쪽 모두 left_at IS NOT NULL인지 확인
   *   → 둘 다 나갔으면 service에서 chat_rooms.status = closed
   전이
   * - SSE 이벤트 emit 시 수신 대상 유저 ID 목록 추출
   */
  export async function findParticipantsByRoomId(roomId:number) {
    return prisma.chatRoomParticipant.findMany({
      where: { chat_room_id: roomId },
      select: {
        user_id: true,
        left_at: true,
        last_read_message_id: true,
      },
    });
  }

  // ─────────────────────────────────────────────
  // 갱신
  // ─────────────────────────────────────────────

  /**
   * 나가기 처리 — left_at에 현재 시각 기록.
   *
   * 호출 후 service에서 findParticipantsByRoomId로
   * 양쪽 모두 left_at IS NOT NULL인지 확인 → closed 전이 판단.
   */
  export async function updateLeftAt(roomId: number, userId: number) {
    return prisma.chatRoomParticipant.update({
      where: {
        chat_room_id_user_id: {
          chat_room_id: roomId,
          user_id: userId,
        },
      },
      data: { left_at: new Date() },
    });
  }

  /**
   * 읽음 갱신 — last_read_message_id + last_read_at 동시
  업데이트.
   *
   * 호출 시점:
   * - 채팅방 진입 시
   * - POST /api/chat-rooms/:id/read 호출 시
   */
  export async function updateLastRead(
    roomId: number,
    userId: number,
    lastReadMessageId: number
  ) {
    return prisma.chatRoomParticipant.update({
      where: {
        chat_room_id_user_id: {
          chat_room_id: roomId,
          user_id: userId,
        },
      },
      data: {
        last_read_message_id: lastReadMessageId,
        last_read_at: new Date(),
      },
    });
  }