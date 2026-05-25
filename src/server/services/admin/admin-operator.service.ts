import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/lib/app-error";
import { ERROR } from "@/server/lib/errors";
import type { ChatRoomListItemDto } from "@/lib/types/chat";
import * as chatRoomService from "@/server/services/conversation/chatRoom.service";
import * as messageService from "@/server/services/conversation/message.service";
import { selectChat } from "@/server/services/content/comment.service";
import { createFeed } from "@/server/services/content/feed.service";
import type { CreateFeedResultDto } from "@/lib/types/feed";
import {
  ADMIN_OPERATOR_CHAT_EXTENSION_DAYS,
  ADMIN_OPERATOR_EMAIL,
  ADMIN_OPERATOR_NICKNAME,
  ADMIN_OPERATOR_PROFILE_IMAGE_URL,
  ADMIN_OPERATOR_REAL_NAME,
} from "@/server/services/admin/admin-operator.constants";

type AdminOperatorUser = {
  id: number;
  nickname: string;
  email: string;
  onboarding_completed: boolean;
};

type AdminOperatorFeedInput = {
  text: string;
  feedKeywordIds?: number[] | null;
  feedKeywordCodes?: string[] | null;
  images?: File[];
};

export type AdminOperatorSummaryDto = {
  userId: number;
  nickname: string;
  onboardingCompleted: boolean;
};

export type AdminOperatorFeedResultDto = CreateFeedResultDto & {
  operator: AdminOperatorSummaryDto;
};

export type AdminOperatorReactionDto = {
  commentId: number;
  content: string;
  createdAt: string;
  chatRoomId: number | null;
  commenter: {
    userId: number;
    nickname: string;
    profileImage: string | null;
  };
  feed: {
    feedId: number;
    text: string;
    createdAt: string;
  };
};

export type AdminOperatorChatRoomsDto = {
  operator: AdminOperatorSummaryDto;
  rooms: ChatRoomListItemDto[];
};

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === code
  );
}

async function assertNicknameAvailableForOperator(operatorUserId?: number) {
  const nicknameOwner = await prisma.user.findUnique({
    where: { nickname: ADMIN_OPERATOR_NICKNAME },
    select: { id: true },
  });

  if (nicknameOwner && nicknameOwner.id !== operatorUserId) {
    throw new AppError(ERROR.CONFLICT, "운영자 닉네임을 이미 사용 중인 계정이 있습니다.");
  }
}

async function ensureOperatorProfileImage(userId: number) {
  await prisma.userProfileImage.updateMany({
    where: { user_id: userId },
    data: { is_primary: false },
  });

  await prisma.userProfileImage.upsert({
    where: {
      user_id_sort_order: {
        user_id: userId,
        sort_order: 1,
      },
    },
    update: {
      image_url: ADMIN_OPERATOR_PROFILE_IMAGE_URL,
      is_primary: true,
    },
    create: {
      user_id: userId,
      image_url: ADMIN_OPERATOR_PROFILE_IMAGE_URL,
      sort_order: 1,
      is_primary: true,
    },
  });
}

function toOperatorSummary(user: AdminOperatorUser): AdminOperatorSummaryDto {
  return {
    userId: user.id,
    nickname: user.nickname,
    onboardingCompleted: user.onboarding_completed,
  };
}

export async function ensureAdminOperatorUser(): Promise<AdminOperatorUser> {
  const existingOperator = await prisma.user.findUnique({
    where: { email: ADMIN_OPERATOR_EMAIL },
    select: { id: true },
  });

  if (!existingOperator) {
    await assertNicknameAvailableForOperator();
    const passwordHash = await bcrypt.hash(randomUUID(), 10);

    return prisma.user.create({
      data: {
        login_id: null,
        real_name: ADMIN_OPERATOR_REAL_NAME,
        age: null,
        email: ADMIN_OPERATOR_EMAIL,
        password_hash: passwordHash,
        birth: null,
        birth_hash: null,
        nickname: ADMIN_OPERATOR_NICKNAME,
        bio: "인제우리 공식 운영 계정입니다.",
        gender: "male",
        nationality: "KR",
        university: "인제대학교",
        department: "인제우리 운영팀",
        student_year: 1,
        student_number: null,
        onboarding_completed: false,
        status: "active",
        userProfileImages: {
          create: {
            image_url: ADMIN_OPERATOR_PROFILE_IMAGE_URL,
            sort_order: 1,
            is_primary: true,
          },
        },
      },
      select: {
        id: true,
        nickname: true,
        email: true,
        onboarding_completed: true,
      },
    });
  }

  await assertNicknameAvailableForOperator(existingOperator.id);

  try {
    const user = await prisma.user.update({
      where: { id: existingOperator.id },
      data: {
        login_id: null,
        real_name: ADMIN_OPERATOR_REAL_NAME,
        nickname: ADMIN_OPERATOR_NICKNAME,
        bio: "인제우리 공식 운영 계정입니다.",
        gender: "male",
        nationality: "KR",
        university: "인제대학교",
        department: "인제우리 운영팀",
        student_year: 1,
        onboarding_completed: false,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
        nickname: true,
        email: true,
        onboarding_completed: true,
      },
    });

    await ensureOperatorProfileImage(user.id);
    return user;
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      throw new AppError(ERROR.CONFLICT, "운영자 계정의 고유 정보가 다른 계정과 충돌합니다.");
    }

    throw error;
  }
}

export async function createAdminOperatorFeed(input: AdminOperatorFeedInput): Promise<AdminOperatorFeedResultDto> {
  const operator = await ensureAdminOperatorUser();
  const feed = await createFeed(
    operator.id,
    input.text,
    { ids: input.feedKeywordIds, codes: input.feedKeywordCodes },
    input.images ?? [],
    { skipActiveFeedCheck: true },
  );

  return {
    ...feed,
    operator: toOperatorSummary(operator),
  };
}

function getExtendedChatExpiresAt(): Date {
  return new Date(Date.now() + ADMIN_OPERATOR_CHAT_EXTENSION_DAYS * 24 * 60 * 60 * 1000);
}

async function extendOperatorChatRoom(roomId: number, operatorUserId: number) {
  const room = await prisma.chatRoom.findFirst({
    where: {
      id: roomId,
      participants: {
        some: {
          user_id: operatorUserId,
          left_at: null,
        },
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!room) {
    throw new AppError(ERROR.NOT_FOUND, "운영자 채팅방을 찾을 수 없습니다.", 404);
  }

  if (room.status === "closed" || room.status === "blocked") {
    throw new AppError(ERROR.ROOM_NOT_ACTIVE, "비활성화된 채팅방입니다.");
  }

  await prisma.chatRoom.update({
    where: { id: roomId },
    data: {
      status: "active",
      expires_at: getExtendedChatExpiresAt(),
    },
  });
}

export async function listAdminOperatorChatReactions(): Promise<{ operator: AdminOperatorSummaryDto; items: AdminOperatorReactionDto[] }> {
  const operator = await ensureAdminOperatorUser();

  const comments = await prisma.feedComment.findMany({
    where: {
      deleted_at: null,
      feed: {
        author_user_id: operator.id,
      },
      commenter_user: {
        status: { not: "banned" },
      },
    },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      content: true,
      created_at: true,
      commenter_user: {
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
      feed: {
        select: {
          id: true,
          text: true,
          created_at: true,
        },
      },
    },
  });

  const commentIds = comments.map((comment) => comment.id);
  const commenterIds = [...new Set(comments.map((comment) => comment.commenter_user.id))];
  const now = new Date();
  const chatRooms = commentIds.length > 0
    ? await prisma.chatRoom.findMany({
        where: {
          source_type: "comment",
          source_comment_id: { in: commentIds },
          participants: {
            some: {
              user_id: operator.id,
              left_at: null,
            },
          },
        },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          source_comment_id: true,
          status: true,
          expires_at: true,
        },
      })
    : [];
  const chatRoomsByCommenter = commenterIds.length > 0
    ? await prisma.chatRoom.findMany({
        where: {
          source_type: "comment",
          status: "active",
          expires_at: { gt: now },
          AND: [
            {
              participants: {
                some: {
                  user_id: operator.id,
                  left_at: null,
                },
              },
            },
            {
              participants: {
                some: {
                  user_id: { in: commenterIds },
                  left_at: null,
                },
              },
            },
          ],
        },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          participants: {
            where: {
              user_id: { in: commenterIds },
              left_at: null,
            },
            select: { user_id: true },
          },
        },
      })
    : [];

  const chatRoomByCommentId = new Map<number, number>();
  for (const room of chatRooms) {
    if (!room.source_comment_id || chatRoomByCommentId.has(room.source_comment_id)) {
      continue;
    }

    chatRoomByCommentId.set(room.source_comment_id, room.id);
  }
  const chatRoomByCommenterId = new Map<number, number>();
  for (const room of chatRoomsByCommenter) {
    for (const participant of room.participants) {
      if (!chatRoomByCommenterId.has(participant.user_id)) {
        chatRoomByCommenterId.set(participant.user_id, room.id);
      }
    }
  }

  return {
    operator: toOperatorSummary(operator),
    items: comments.map((comment) => ({
      commentId: comment.id,
      content: comment.content,
      createdAt: comment.created_at.toISOString(),
      chatRoomId: chatRoomByCommentId.get(comment.id) ?? chatRoomByCommenterId.get(comment.commenter_user.id) ?? null,
      commenter: {
        userId: comment.commenter_user.id,
        nickname: comment.commenter_user.nickname,
        profileImage: comment.commenter_user.userProfileImages[0]?.image_url ?? null,
      },
      feed: {
        feedId: comment.feed.id,
        text: comment.feed.text,
        createdAt: comment.feed.created_at.toISOString(),
      },
    })),
  };
}

export async function startAdminOperatorChatFromReaction(commentId: number): Promise<{ operator: AdminOperatorSummaryDto; chatRoomId: number }> {
  const operator = await ensureAdminOperatorUser();
  const comment = await prisma.feedComment.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
      feed: {
        author_user_id: operator.id,
      },
    },
    select: {
      id: true,
      commenter_user_id: true,
    },
  });

  if (!comment) {
    throw new AppError(ERROR.COMMENT_NOT_FOUND, "운영자 피드 반응을 찾을 수 없습니다.", 404);
  }

  const existingRoom = await prisma.chatRoom.findFirst({
    where: {
      source_type: "comment",
      source_comment_id: commentId,
      status: "active",
      expires_at: { gt: new Date() },
      participants: {
        some: {
          user_id: operator.id,
          left_at: null,
        },
      },
    },
    orderBy: { created_at: "desc" },
    select: { id: true },
  });

  if (existingRoom) {
    await extendOperatorChatRoom(existingRoom.id, operator.id);
    return { operator: toOperatorSummary(operator), chatRoomId: existingRoom.id };
  }

  const existingRoomWithCommenter = await prisma.chatRoom.findFirst({
    where: {
      source_type: "comment",
      status: "active",
      expires_at: { gt: new Date() },
      AND: [
        {
          participants: {
            some: {
              user_id: operator.id,
              left_at: null,
            },
          },
        },
        {
          participants: {
            some: {
              user_id: comment.commenter_user_id,
              left_at: null,
            },
          },
        },
      ],
    },
    orderBy: { created_at: "desc" },
    select: { id: true },
  });

  if (existingRoomWithCommenter) {
    await extendOperatorChatRoom(existingRoomWithCommenter.id, operator.id);
    return { operator: toOperatorSummary(operator), chatRoomId: existingRoomWithCommenter.id };
  }

  const created = await selectChat(operator.id, commentId);
  await extendOperatorChatRoom(created.chatRoomId, operator.id);
  return { operator: toOperatorSummary(operator), chatRoomId: created.chatRoomId };
}

export async function listAdminOperatorChatRooms(): Promise<AdminOperatorChatRoomsDto> {
  const operator = await ensureAdminOperatorUser();
  const rooms = await chatRoomService.getChatRooms(operator.id, "all");

  return {
    operator: toOperatorSummary(operator),
    rooms,
  };
}

export async function getAdminOperatorChatMessages(roomId: number, cursor?: number, limit = 30) {
  const operator = await ensureAdminOperatorUser();
  const result = await messageService.getMessages(roomId, operator.id, cursor, limit);

  if ("error" in result) {
    throw new AppError(result.error ?? ERROR.INTERNAL_ERROR, "운영자 채팅 메시지를 불러올 수 없습니다.");
  }

  return {
    operator: toOperatorSummary(operator),
    messages: result.messages,
  };
}

export async function sendAdminOperatorChatMessage(roomId: number, content: string) {
  const operator = await ensureAdminOperatorUser();
  await extendOperatorChatRoom(roomId, operator.id);

  const result = await messageService.sendMessage(roomId, operator.id, content, "text", {
    suppressPlaceTrigger: true,
  });

  if ("error" in result) {
    throw new AppError(result.error ?? ERROR.INTERNAL_ERROR, "운영자 채팅 메시지를 보낼 수 없습니다.");
  }

  return {
    operator: toOperatorSummary(operator),
    message: result.message,
  };
}

export async function expireAdminOperatorChatRoom(roomId: number) {
  const operator = await ensureAdminOperatorUser();
  const room = await prisma.chatRoom.findFirst({
    where: {
      id: roomId,
      participants: {
        some: {
          user_id: operator.id,
          left_at: null,
        },
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!room) {
    throw new AppError(ERROR.NOT_FOUND, "운영자 채팅방을 찾을 수 없습니다.", 404);
  }

  const now = new Date();
  if (room.status !== "closed") {
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        status: "closed",
        expires_at: now,
      },
    });
  }

  const result = await chatRoomService.getChatRoom(roomId, operator.id);
  if ("error" in result) {
    throw new AppError(result.error ?? ERROR.INTERNAL_ERROR, "운영자 채팅방 정보를 불러올 수 없습니다.");
  }

  return {
    operator: toOperatorSummary(operator),
    room: result.room,
  };
}
