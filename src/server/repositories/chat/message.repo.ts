  /**
   * message.repo.ts
   *
   * messages 테이블 DB 접근 계층.
   * 비즈니스 로직(만료 체크, 권한 판단)은 여기 두지 않는다 —  service 몫.
   */

import { prisma } from "@/server/db/prisma";
import { message_type, type Prisma } from "@/generated/prisma/client";   

  // ─────────────────────────────────────────────
  // 타입
  // ─────────────────────────────────────────────

export type InsertMessageInput = {
  chat_room_id: number;
  sender_user_id: number;
  content: string;
  type?: message_type; // 생략 시 DB default(text)
};

  // ─────────────────────────────────────────────
  // 조회
  // ─────────────────────────────────────────────

  /**
   * 채팅방 메시지 목록 — cursor 기반 페이지네이션.
   *
   * - cursor 없으면 최신 limit건 반환 (채팅방 첫 진입)
   * - cursor 있으면 id < cursor 조건으로 그 이전 메시지 반환
  (위로 스크롤)
   * - soft delete된 메시지(deleted_at IS NOT NULL) 제외
   * - id DESC 정렬 → 클라이언트에서 뒤집어서 표시
   */
export async function findMessagesByRoomId(
  roomId: number,
  cursor?: number,
  limit: number = 30
) {
  return prisma.message.findMany({
    where: {
      chat_room_id: roomId,
      deleted_at: null,
      ...(cursor !== undefined ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit,
    select: {
      id: true,
      sender_user_id: true,
      type: true,
      content: true,
      created_at: true,
    },
  });
}
export async function findMessageById(messageId: number) {
    return prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, chat_room_id: true },
    });
}


  // ─────────────────────────────────────────────
  // 생성
  // ─────────────────────────────────────────────

  /**
   * 메시지 INSERT.
   *
   * created_at — DB default(now()) 이므로 생략.
   * type 생략 시 DB default(text) 적용.
   * 시스템 메시지(채팅방 생성 안내)도 type: "system"으로 이
  함수 사용.
   */
export async function insertMessage(input: InsertMessageInput,  tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  return db.message.create({
    data: {
      chat_room_id: input.chat_room_id,
      sender_user_id: input.sender_user_id,
      content: input.content,
      ...(input.type !== undefined ? { type: input.type } : {}),
    },
  });
}