/**                                                              
   * message.service.ts                                            
   *                                                               
   * 메시지 도메인 비즈니스 로직.                                  
   * DB 접근은 repo에 위임, 여기선 규칙/정책 판단만.             
   */

  import { ERROR } from "@/server/lib/errors";
  import * as messageRepo from
  "@/server/repositories/chat/message.repo";
  import * as participantRepo from
  "@/server/repositories/chat/participant.repo";
  import * as chatRoomRepo from
  "@/server/repositories/chat/chatRoom.repo";

  // ─────────────────────────────────────────────
  // 메시지 전송
  // ─────────────────────────────────────────────

  /**
   * 메시지 전송.
   *
   * 검사 순서:
   * 1. 참여자 확인 (없으면 FORBIDDEN)
   * 2. 이미 나간 유저 차단
   * 3. 채팅방 상태 확인 (blocked/closed → ROOM_NOT_ACTIVE)
   * 4. 만료 확인 (expires_at < now() 또는 status=expired →
  ROOM_EXPIRED)
   * 5. 메시지 INSERT
   */
  export async function sendMessage(
    roomId: number,
    userId: number,
    content: string
  ) {
    const participant = await
  participantRepo.findParticipant(roomId, userId);
    if (!participant) return { error: ERROR.FORBIDDEN } as const;
    if (participant.left_at !== null) return { error:
  ERROR.FORBIDDEN } as const;

    const room = await chatRoomRepo.findRoomById(roomId);
    if (!room) return { error: ERROR.NOT_FOUND } as const;

    if (room.status === "blocked" || room.status === "closed") {
      return { error: ERROR.ROOM_NOT_ACTIVE } as const;
    }

    if (room.status === "expired" || room.expires_at < new Date())
  {
      return { error: ERROR.ROOM_EXPIRED } as const;
    }

    const message = await messageRepo.insertMessage({
      chat_room_id: roomId,
      sender_user_id: userId,
      content,
    });

    return { message };
  }

  // ─────────────────────────────────────────────
  // 메시지 목록 조회
  // ─────────────────────────────────────────────

  /**
   * 메시지 목록 조회 + 읽음 자동 갱신.
   *
   * - 만료/나간 방도 읽기는 허용 (쓰기만 차단)
   * - 조회 성공 시 가장 최신 메시지 id로 last_read_message_id 갱신
   * - cursor 없으면 최신 30건, cursor 있으면 그 이전 30건
   */
  export async function getMessages(
    roomId: number,
    userId: number,
    cursor?: number,
    limit: number = 30
  ) {
    const participant = await
  participantRepo.findParticipant(roomId, userId);
    if (!participant) return { error: ERROR.FORBIDDEN } as const;

    const messages = await messageRepo.findMessagesByRoomId(roomId,
   cursor, limit);

    // 조회된 메시지 중 가장 최신(id 가장 큰) 것으로 읽음 갱신
    if (messages.length > 0) {
      const latestId = messages[0].id; // id DESC 정렬이므로 첫 번째가 최신
      const currentLastRead = participant.last_read_message_id ??
  0;
      if (latestId > currentLastRead) {
        await participantRepo.updateLastRead(roomId, userId,
  latestId);
      }
    }

    return { messages };
  }

  // ─────────────────────────────────────────────
  // 읽음 갱신
  // ─────────────────────────────────────────────

  /**
   * 읽음 갱신 — POST /api/chat-rooms/:id/read 호출 시.
   *
   * lastReadMessageId는 클라이언트가 현재 화면에서 본 마지막
  메시지 id.
   * 현재 last_read보다 작으면 갱신하지 않음 (역방향 갱신 방지).
   */
  export async function markAsRead(
    roomId: number,
    userId: number,
    lastReadMessageId: number
  ) {
    const participant = await participantRepo.findParticipant(roomId, userId);
    if (!participant) return { error: ERROR.FORBIDDEN } as const;

    const message = await messageRepo.findMessageById(lastReadMessageId);

    if (!message || message.chat_room_id !== roomId) {
      return { error: ERROR.INVALID_CURSOR } as const;
    }

    const currentLastRead = participant.last_read_message_id ?? 0;

    if (lastReadMessageId <= currentLastRead) {
      return { success: true }; // 이미 더 앞까지 읽음, 무시
    }

    await participantRepo.updateLastRead(roomId, userId, lastReadMessageId);
    return { success: true };
  }