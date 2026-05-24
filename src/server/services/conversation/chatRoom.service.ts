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
  import * as messageReadRepo from "@/server/repositories/chat/messageRead.repo";
  import { SafetyRepository } from "@/server/repositories/safety/safety.repository";
  import { chat_room_source_type } from "@/generated/prisma/client";
  import { prisma } from "@/server/db/prisma";
  import type { PrismaTransactionClient } from "@/server/db/prisma";
  import type { ChatRoomListItemDto } from "@/lib/types/chat";

  const safetyRepo = new SafetyRepository(prisma);

  // ─────────────────────────────────────────────
  // 타입
  // ─────────────────────────────────────────────

  export type CreateChatRoomParams = {
    requestUserId: number;
    targetUserId: number;
    sourceType: chat_room_source_type;
    sourceInterestId?: number;
    sourceCommentId?: number;
    tx?: PrismaTransactionClient;
  };

  // ─────────────────────────────────────────────
  // 채팅방 생성
  // ─────────────────────────────────────────────

  /**
   * 채팅방 생성 — 규칙 검사 후 통과 시 생성.
   *
   * 검사 순서:
   * 1. 양방향 차단 관계 확인 (어느 쪽이든 차단 중이면 거부)
   * 2. 두 유저 간 active 채팅방 중복 확인
   * 3. 나간 채팅방 기준 7일 재매칭 정책 확인
   * 4. expires_at 계산 (interest: +24h / comment: +2h)
   * 5. 채팅방 + 참여자 INSERT + 시스템 메시지 INSERT
   */
  export async function createChatRoom(input: CreateChatRoomParams) {
    const { requestUserId, targetUserId, sourceType } = input;

    // 1. 양방향 차단 검사 — 어느 쪽이든 상대를 차단 중이면 새 방 거부
    const activeBlock = await safetyRepo.findActiveBlockBetweenUsers(requestUserId, targetUserId);
    if (activeBlock) {
      return { error: ERROR.BLOCKED_RELATIONSHIP } as const;
    }

    // 2. active 중복 확인
    const existing = await
  chatRoomRepo.findActiveRoomBetweenUsers(requestUserId, targetUserId, input.tx);
    if (existing) {
      return { error: ERROR.DUPLICATE_ACTIVE_ROOM } as const;
    }

    // 2. 재매칭 7일 정책
    const lastLeft = await chatRoomRepo.findLastLeftRoomBetweenUsers(requestUserId, targetUserId, input.tx);
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
  const doCreate = async (db: PrismaTransactionClient) => {
    const newRoom = await chatRoomRepo.createRoom(
      {
        source_type: sourceType,
        created_by_user_id: requestUserId,
        source_interest_id: input.sourceInterestId,
        source_comment_id: input.sourceCommentId,
        expires_at: expiresAt,
        participantUserIds: [requestUserId, targetUserId],
      },
      db
    );

    await messageRepo.insertMessage(
      {
        chat_room_id: newRoom.id,
        sender_user_id: requestUserId,
        content: "매칭이 성사되었어요! 대화를 시작해보세요.",
        type: "system",
      },
      db
    );

    return newRoom;
  };

  const room = input.tx
    ? await doCreate(input.tx)
    : await prisma.$transaction(doCreate);

  return { chatRoomId: room.id };
  }

  // ─────────────────────────────────────────────
  // 채팅방 목록 / 단건 조회
  // ─────────────────────────────────────────────

  /**
   * 내 채팅방 목록.
   * 마지막 메시지 시각 기준 내림차순 정렬.
   * tab=unread이면 unread count > 0인 방만 필터.
   *
   * 응답은 ChatRoomListItemDto로 매핑되며, 차단 상태(isBlocked, blockedByMe)를
   * 명시적으로 노출한다. 정책상 차단된 방도 목록에 그대로 포함된다 (히스토리 유지).
   */
export async function getChatRooms(
    userId: number,
    tab: "all" | "unread",
  ): Promise<ChatRoomListItemDto[]> {
    const rooms = await chatRoomRepo.findRoomsByUserId(userId);
    const now = new Date();
    const blockedByMeByUserId = new Map<number, boolean>();
    const restoredPairs = new Set<string>();
    const visibleRooms: Array<{
      room: (typeof rooms)[number];
      blockedByMe: boolean;
    }> = [];

    for (const room of rooms) {
      const other = room.participants.find((participant) => participant.user_id !== userId);
      if (!other) {
        visibleRooms.push({ room, blockedByMe: false });
        continue;
      }

      const pairKey = [userId, other.user_id].sort((left, right) => left - right).join(":");

      if (room.status === "blocked") {
        if (!restoredPairs.has(pairKey)) {
          await chatRoomRepo.restoreBlockedRoomsBetweenUsers(userId, other.user_id);
          restoredPairs.add(pairKey);
        }
        room.status = room.expires_at > now ? "active" : "expired";
        room.blocked_by_user_id = null;
      }

      let blockedByMe = blockedByMeByUserId.get(other.user_id);
      if (blockedByMe === undefined) {
        const block = await safetyRepo.findExistingBlock(userId, other.user_id);
        blockedByMe = Boolean(block && !block.unblocked_at);
        blockedByMeByUserId.set(other.user_id, blockedByMe);
      }

      visibleRooms.push({ room, blockedByMe });
    }

    visibleRooms.sort((a, b) => {
      const aTime = a.room.messages[0]?.created_at ?? a.room.created_at;
      const bTime = b.room.messages[0]?.created_at ?? b.room.created_at;
      return bTime.getTime() - aTime.getTime();
    });

    const unreadCounts = await Promise.all(
      visibleRooms.map(({ room }) => messageReadRepo.getUnreadCount(userId, room.id))
    );

    const result: ChatRoomListItemDto[] = [];
    for (let i = 0; i < visibleRooms.length; i++) {
      const entry = visibleRooms[i];
      const unreadCount = entry.blockedByMe || entry.room.status === "blocked" ? 0 : unreadCounts[i];
      if (tab === "unread" && unreadCount === 0) continue;
      result.push(toChatRoomListItemDto(entry.room, userId, unreadCount, entry.blockedByMe));
    }

    return result;
  }

  function toChatRoomListItemDto(
    room: Awaited<ReturnType<typeof chatRoomRepo.findRoomsByUserId>>[number],
    currentUserId: number,
    unreadCount: number,
    blockedByMe: boolean,
  ): ChatRoomListItemDto {
    let other: (typeof room.participants)[number] | null = null;
    for (const p of room.participants) {
      if (p.user_id !== currentUserId) { other = p; break; }
    }

    const lastMsg = room.messages[0] ?? null;

    return {
      roomId: room.id,
      status: room.status,
      isBlocked: room.status === "blocked",
      blockedByMe,
      createdAt: room.created_at.toISOString(),
      expiresAt: room.expires_at.toISOString(),
      otherUser: other ? {
        userId: other.user.id,
        nickname: other.user.nickname,
        profileImage: other.user.userProfileImages[0]?.image_url ?? null,
      } : null,
      lastMessage: lastMsg ? {
        id: lastMsg.id,
        content: lastMsg.content,
        type: lastMsg.type,
        senderUserId: lastMsg.sender_user_id,
        createdAt: lastMsg.created_at.toISOString(),
      } : null,
      unreadCount,
    };
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
