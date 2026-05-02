/**                                                                                                                     
   * chatRoom.repo.ts                                                                                                     
   *
   * chat_rooms 테이블 DB 접근 계층.                                                                                      
   * 비즈니스 로직(정책 판단, 에러 결정)은 여기 두지 않는다 — service 몫.                                                 
   * 오직 "어떻게 DB에서 읽고 쓸 것인가"만 다룬다.                                                                        
   */             

  import { prisma } from "@/server/db/prisma";
  import { chat_room_status, chat_room_source_type } from "@/generated/prisma/client";  
  import type { Prisma } from "@/generated/prisma/client";                                         

  // ─────────────────────────────────────────────
  // 타입
  // ─────────────────────────────────────────────

  /**
   * 채팅방 생성 입력값.
   *
   * expires_at: service에서 계산해서 넘김
   *   - source_type = interest → now() + 24h
   *   - source_type = comment  → now() + 2h
   *
   * participantUserIds: 채팅방과 동시에 participants에 INSERT할 유저 ID 목록
   *   - 보통 [createdByUserId, targetUserId] 2명
   */
  export type CreateChatRoomInput = {
    source_type: chat_room_source_type;
    created_by_user_id: number;
    source_interest_id?: number; // source_type = interest 일 때
    source_comment_id?: number;  // source_type = comment 일 때
    expires_at: Date;
    participantUserIds: number[];
  }; //create_at은 DB에서 자동으로 채움. 

  // ─────────────────────────────────────────────
  // 조회
  // ─────────────────────────────────────────────

  /**
   * 특정 유저가 참여 중인 채팅방 목록.
   *
   * - left_at IS NULL인 참여자 행만 포함 (나간 방 제외)
   * - 참여자 정보(닉네임, 대표 이미지)와 마지막 메시지 미리보기 포함
   * - 마지막 메시지 시각 기준 재정렬은 호출 측(service)에서 처리
   *   (Prisma가 관계 필드 기준 orderBy를 직접 지원 안 하므로)
   *  
   */
  export async function findRoomsByUserId(userId: number) {
    return prisma.chatRoom.findMany({
      where: { //어떤 방을 가져올지(where)
        participants: {
          some: {
            user_id: userId, //내가 아직 참여자로 있고 
            left_at: null, // 아직 안 나간 방만
          },
        },
      },
      include: {
        // 채팅 목록에서 상대방 닉네임/이미지 표시에 필요
        participants: {
          where: { left_at: null }, //상대방도 아직 안나간 사람만
          include: {
            user: {
              select: {
                id: true,
                nickname: true, //채팅방 목록에 표시할 이름
                userProfileImages: {
                  where: { is_primary: true },
                  select: { image_url: true }, //대표이미지 하나
                  take: 1,
                },
              },
            },
          },
        },
        // 마지막 메시지 미리보기 — soft delete 된 것 제외, 최신 1건
        messages: {
          where: { deleted_at: null },
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            type: true,
            created_at: true,
            sender_user_id: true,
          },
        },
      },
      orderBy: { created_at: "desc" }, // 메시지 없는 방 fallback 정렬
    });
  }

  /**
   * 채팅방 단건 조회 — 참여자 목록 포함.
   *
   * 채팅방 진입 시 권한 확인(참여자인지), 만료 여부 체크 등에 사용.
   * 없으면 null 반환 — service에서 NOT_FOUND 처리.
   */
  export async function findRoomById(roomId: number) {
    return prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                userProfileImages: {
                  where: { is_primary: true },
                  select: { image_url: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * 두 유저 사이에 active 채팅방이 있는지 확인.
   *
   * 채팅방 생성 전 중복 방지 체크에 사용.
   * 있으면 → service에서 DUPLICATE_ACTIVE_ROOM 에러 반환.
   *
   * 두 유저 모두 left_at IS NULL인 참여자로 등록된 active 방을 찾는다.
   */
  export async function findActiveRoomBetweenUsers(
    userIdA: number,
    userIdB: number
  ) {
    return prisma.chatRoom.findFirst({
      where: {
        status: "active",
        AND: [
          { participants: { some: { user_id: userIdA, left_at: null } } },
          { participants: { some: { user_id: userIdB, left_at: null } } },
        ],
      },
    });
  }

  /**
   * 두 유저 사이에 가장 최근에 나간 채팅방(left_at이 기록된 방)을 조회.
   *
   * 재매칭 7일 정책 체크에 사용.
   * service에서 left_at 기준 7일 경과 여부를 판단한다.
   *
   * - 한쪽이라도 left_at이 있는 방 중 가장 최근 것을 반환
   * - 없으면 null → 이전에 대화한 적 없음 → 재매칭 제한 없음
   */
  export async function findLastLeftRoomBetweenUsers(
    userIdA: number,
    userIdB: number
  ) {
    return prisma.chatRoom.findFirst({
      where: {
        AND: [
          { participants: { some: { user_id: userIdA } } }, //A가 이방 참여
          { participants: { some: { user_id: userIdB } } }, //B가 이방 참여
          // 한쪽이라도 나간 기록이 있는 방
          { participants: { some: { left_at: { not: null } } } },
        ],
      },
      include: {
        // left_at 값을 가져오기 위해 두 유저의 참여자 행 포함
        participants: {
          where: {
            user_id: { in: [userIdA, userIdB] },
          },
          select: {
            user_id: true,
            left_at: true,
          },
        },
      },
      orderBy: { created_at: "desc" }, // 가장 최근 방
    });
  }

  // ─────────────────────────────────────────────
  // 생성
  // ─────────────────────────────────────────────

  /**
   * 채팅방 생성 + 참여자 동시 INSERT.
   *
   * Prisma nested create로 chat_rooms + chat_room_participants를
   * 단일 트랜잭션으로 처리한다.
   * 중간 실패 시 롤백되어 방만 생성된 채로 남는 상황 방지.
   */
  
export async function createRoom(
  input: CreateChatRoomInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  return db.chatRoom.create({
    data: {
      source_type: input.source_type,
      created_by_user_id: input.created_by_user_id,
      source_interest_id: input.source_interest_id ?? null,
      source_comment_id: input.source_comment_id ?? null,
      expires_at: input.expires_at,
      participants: {
        create: input.participantUserIds.map((userId) => ({
          user_id: userId,
        })),
      },
    },
    include: { participants: true },
  });
}

  // ─────────────────────────────────────────────
  // 상태 갱신
  // ─────────────────────────────────────────────

  /**
   * 채팅방 상태 전이.
   *
   * 주요 사용처:
   * - expired : 메시지 전송 시점에 expires_at 초과 감지 → lazy 전이
   * - blocked : D가 차단 완료 후 PATCH /api/chat-rooms/:id/block 호출 → C가 처리
   * - closed  : 양쪽 모두 left_at이 채워졌을 때 service에서 호출
   *
   * blocked 상태일 때만 blocked_by_user_id를 함께 기록한다.
   * 나머지 전이에서는 blocked_by_user_id를 건드리지 않는다.
   */
  export async function updateRoomStatus(
    roomId: number,
    status: chat_room_status,
    blockedByUserId?: number
  ) {
    return prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        status,
        ...(status === "blocked" && blockedByUserId !== undefined
          ? { blocked_by_user_id: blockedByUserId }
          : {}),
      },
    });
  }

  // ─────────────────────────────────────────────
  // 배치 (스케줄러)
  // ─────────────────────────────────────────────

  /**
   * expires_at이 지났는데 아직 active인 방을 expired로 일괄 전이.
   *
   * 배치 잡에서 주기적으로 호출.
   * lazy 전이(메시지 전송 시점 체크)와 병행 운영.
   *
   * @param now - 기준 시각. 테스트 시 주입 가능하도록 파라미터로 받는다.
   * @returns 갱신된 row 수
   */
  export async function expireOverdueRooms(now: Date) {
    const result = await prisma.chatRoom.updateMany({
      where: {
        status: "active",
        expires_at: { lt: now }, // expires_at < now → 만료 대상
      },
      data: { status: "expired" },
    });
    return result.count;
  }