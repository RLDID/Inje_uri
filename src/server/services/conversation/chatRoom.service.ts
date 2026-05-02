/**                                                         
   * chatRoom.service.ts                           
   *                                                          
   * 채팅방 도메인 비즈니스 로직.                             
   * DB 접근은 repo에 위임, 여기선 규칙/정책 판단만.          
   */                                                         
                  
  import { ERROR } from "@/server/lib/errors";
  import * as chatRoomRepo from "@/server/repositories/chat/chatRoom.repo";
  import * as participantRepo from "@/server/repositories/chat/participant.repo";
  import * as messageRepo from "@/server/repositories/chat/message.repo";
  import { chat_room_source_type } from "@/generated/prisma/client";
  import { prisma } from "@/server/db/prisma";

  // ─────────────────────────────────────────────
  // 타입
  // ─────────────────────────────────────────────

  export type CreateChatRoomParams = {
    requestUserId: number;
    targetUserId: number;
    sourceType: chat_room_source_type;
    sourceInterestId?: number;
    sourceCommentId?: number;
  };

  // ─────────────────────────────────────────────
  // 채팅방 생성
  // ─────────────────────────────────────────────

  /**
   * 채팅방 생성 — 규칙 검사 후 통과 시 생성.
   *
   * 검사 순서:
   * 1. 두 유저 간 active 채팅방 중복 확인
   * 2. 나간 채팅방 기준 7일 재매칭 정책 확인
   * 3. expires_at 계산 (interest: +24h / comment: +2h)
   * 4. 채팅방 + 참여자 INSERT + 시스템 메시지 INSERT
   *
   * 차단 관계 확인은 B/D가 호출 전 처리하므로 여기선 생략.
   */
  export async function createChatRoom(input: CreateChatRoomParams) {
    const { requestUserId, targetUserId, sourceType } = input;
    // 1. active 중복 확인
    const existing = await
  chatRoomRepo.findActiveRoomBetweenUsers(requestUserId, targetUserId);
    if (existing) {
      return { error: ERROR.DUPLICATE_ACTIVE_ROOM } as const;
    }

    // 2. 재매칭 7일 정책
    const lastLeft = await chatRoomRepo.findLastLeftRoomBetweenUsers(requestUserId, targetUserId);
    if (lastLeft) {
      let latestLeftAt: Date | null = null;

      for (const p of lastLeft.participants) {
        if (p.left_at === null) continue;
        if (latestLeftAt === null || p.left_at > latestLeftAt) {
          latestLeftAt = p.left_at;
        }
      }

      if (latestLeftAt !== null) {
        const daysSinceLeft = (Date.now() - latestLeftAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLeft < 7) {
          return { error: ERROR.REMATCH_TOO_SOON } as const;
        }
      }
    }

    // 3. expires_at 계산
    const expiresAt = new Date();
    if (sourceType === "interest") {
      expiresAt.setHours(expiresAt.getHours() + 24);
    } else if (sourceType === "comment") {
      expiresAt.setHours(expiresAt.getHours() + 2);
    } else {
      return { error: ERROR.INVALID_SOURCE } as const;
    }

    // 4. 채팅방 + 참여자 생성
  const room = await prisma.$transaction(async (tx) => {
    const newRoom = await chatRoomRepo.createRoom(
      {
        source_type: sourceType,
        created_by_user_id: requestUserId,
        source_interest_id: input.sourceInterestId,
        source_comment_id: input.sourceCommentId,
        expires_at: expiresAt,
        participantUserIds: [requestUserId, targetUserId],
      },
      tx
    );

    await messageRepo.insertMessage(
      {
        chat_room_id: newRoom.id,
        sender_user_id: requestUserId,
        content: "매칭이 성사되었어요! 대화를 시작해보세요.",
        type: "system",
      },
      tx
    );

    return newRoom;
  });

  return { chatRoomId: room.id };
  }

  // ─────────────────────────────────────────────
  // 채팅방 목록 / 단건 조회
  // ─────────────────────────────────────────────

  /**
   * 내 채팅방 목록.
   * 마지막 메시지 시각 기준 내림차순 정렬.
   * tab=unread이면 unread count > 0인 방만 필터.
   */
  export async function getChatRooms(userId: number, tab: "all" | "unread") {
    const rooms = await chatRoomRepo.findRoomsByUserId(userId);

    // 마지막 메시지 시각 기준 내림차순 정렬
    for (let i = 0; i < rooms.length - 1; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
            const aTime = rooms[i].messages[0]?.created_at ?? rooms[i].created_at;
            const bTime = rooms[j].messages[0]?.created_at ?? rooms[j].created_at;
            if (bTime.getTime() > aTime.getTime()) {
                const temp = rooms[i];
                rooms[i] = rooms[j];
                rooms[j] = temp;
            }
        }
    }

    if (tab === "all") return rooms;

    // unread 필터
    const result = [];
    for (const room of rooms) {
      let me = null;
      for (const p of room.participants) {
        if (p.user_id === userId) {
          me = p;
          break;
        }
      }
      if (me === null) continue;

      const lastMsg = room.messages[0];
      if (!lastMsg) continue;

      if ((me.last_read_message_id ?? 0) < lastMsg.id) {
        result.push(room);
      }
    }

    return result;
  }

  /**
   * 채팅방 단건 조회.
   * 없거나 참여자가 아니면 에러 반환.
   */
  export async function getChatRoom(roomId: number, userId:
  number) {
    const room = await chatRoomRepo.findRoomById(roomId);
    if (!room) return { error: ERROR.NOT_FOUND } as const;

    let isParticipant = false;
    for (const p of room.participants) {
      if (p.user_id === userId) {
        isParticipant = true;
        break;
      }
    }
    if (!isParticipant) return { error: ERROR.FORBIDDEN } as
  const;

    return { room };
  }
  



  // ─────────────────────────────────────────────
  // 나가기
  // ─────────────────────────────────────────────

  /**
   * 나가기 처리.
   * 양쪽 모두 left_at이 채워지면 chat_rooms.status = closed
  전이.
   */
  export async function leaveChatRoom(roomId: number, userId:
  number) {
    const room = await chatRoomRepo.findRoomById(roomId);
    if (!room) return { error: ERROR.NOT_FOUND } as const;

    let me = null;
    for (const p of room.participants) {
      if (p.user_id === userId) {
        me = p;
        break;
      }
    }
    if (me === null) return { error: ERROR.FORBIDDEN } as
  const;
    if (me.left_at !== null) return { error: ERROR.FORBIDDEN } as const;

    await participantRepo.updateLeftAt(roomId, userId);

    // 양쪽 모두 나갔는지 확인
    const participants = await
  participantRepo.findParticipantsByRoomId(roomId);
    let allLeft = true;
    for (const p of participants) {
      if (p.left_at === null) {
        allLeft = false;
        break;
      }
    }
    if (allLeft) {
      await chatRoomRepo.updateRoomStatus(roomId, "closed");
    }

    return { success: true };
  }

  // ─────────────────────────────────────────────
  // 차단 전이
  // ─────────────────────────────────────────────

  /**
   * 차단 상태 전이 — D가 차단 완료 후 호출.
   * chat_rooms.status = blocked + blocked_by_user_id 기록.
   */
  export async function blockChatRoom(roomId: number, blockedByUserId: number) {
    const room = await chatRoomRepo.findRoomById(roomId);
    if (!room) return { error: ERROR.NOT_FOUND } as const;

    // 요청자가 참여자인지 확인
    const isParticipant = room.participants.some(p => p.user_id === blockedByUserId);
    if (!isParticipant) return { error: ERROR.FORBIDDEN } as const;

    // 이미 종료/차단된 방인지 확인
    if (room.status === "blocked" || room.status === "closed") {
      return { error: ERROR.ROOM_NOT_ACTIVE } as const;
    }

    await chatRoomRepo.updateRoomStatus(roomId, "blocked", blockedByUserId);

    return { roomStatus: "blocked" };
  }