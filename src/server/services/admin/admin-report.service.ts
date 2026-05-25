import { prisma } from '@/server/db/prisma';
import type { PrismaTransactionClient } from '@/server/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import type { report_status } from '@/generated/prisma/enums';
import { AdminReportRepository } from '@/server/repositories/admin/admin-report.repository';
import type {
  AdminReportAction,
  AdminReportActionResultDto,
  AdminReportListDto,
  AdminReportListItemDto,
  AdminReportStatus,
  AdminReportStatusFilter,
  AdminReportUserSummaryDto,
  AdminReportUpdateResultDto,
} from '@/lib/types/admin';
import { AppError } from '@/server/lib/app-error';

const repo = new AdminReportRepository(prisma);

const REPORT_STATUSES: AdminReportStatus[] = ['pending', 'reviewed', 'actioned', 'dismissed'];
const REPORT_ACTIONS: AdminReportAction[] = ['ban_target_user', 'hide_feed', 'delete_comment', 'close_chat_room', 'delete_message'];

const adminReportUserSelect = {
  id: true,
  login_id: true,
  nickname: true,
  university: true,
  department: true,
  gender: true,
  age: true,
  student_year: true,
  bio: true,
  onboarding_completed: true,
  status: true,
  created_at: true,
  deleted_at: true,
  userProfileImages: {
    orderBy: { sort_order: 'asc' },
    select: {
      image_url: true,
      is_primary: true,
      sort_order: true,
    },
  },
} satisfies Prisma.UserSelect;

const adminReportInclude = {
  reporter_user: {
    select: adminReportUserSelect,
  },
} satisfies Prisma.ReportInclude;

type AdminReportForAction = Prisma.ReportGetPayload<{ include: typeof adminReportInclude }>;
type AdminReportUser = Prisma.UserGetPayload<{ select: typeof adminReportUserSelect }>;
type AdminReportTargetContext = Pick<AdminReportListItemDto['target'], 'ownerUser' | 'content'>;

function isReportStatus(value: string): value is AdminReportStatus {
  return REPORT_STATUSES.includes(value as AdminReportStatus);
}

function isReportAction(value: string): value is AdminReportAction {
  return REPORT_ACTIONS.includes(value as AdminReportAction);
}

export function parseReportStatusFilter(value: string | null): AdminReportStatusFilter {
  if (!value || value === 'all') {
    return 'all';
  }

  if (isReportStatus(value)) {
    return value;
  }

  throw new AppError('INVALID_REPORT_STATUS', '신고 상태 값이 올바르지 않습니다.');
}

export function parseReportStatus(value: unknown): AdminReportStatus {
  if (typeof value !== 'string' || !isReportStatus(value)) {
    throw new AppError('INVALID_REPORT_STATUS', '신고 상태 값이 올바르지 않습니다.');
  }

  return value;
}

export function parseReportAction(value: unknown): AdminReportAction {
  if (typeof value !== 'string' || !isReportAction(value)) {
    throw new AppError('INVALID_REPORT_ACTION', '신고 조치 값이 올바르지 않습니다.');
  }

  return value;
}

function toReportUserSummaryDto(user: AdminReportUser): AdminReportUserSummaryDto {
  const orderedImages = [...user.userProfileImages].sort((left, right) => left.sort_order - right.sort_order);
  const profileImages = orderedImages.map((image) => image.image_url);
  const primaryProfileImage = orderedImages.find((image) => image.is_primary)?.image_url ?? profileImages[0] ?? null;

  return {
    userId: user.id,
    nickname: user.nickname,
    loginId: user.login_id,
    university: user.university,
    department: user.department,
    gender: user.gender,
    age: user.age,
    studentYear: user.student_year,
    bio: user.bio,
    onboardingCompleted: user.onboarding_completed,
    status: user.status,
    profileImages,
    primaryProfileImage,
    createdAt: user.created_at.toISOString(),
    deletedAt: user.deleted_at?.toISOString() ?? null,
  };
}

function toReportContent(
  text: string | null,
  status: string | null,
  createdAt: Date | null,
  images: string[] = [],
): AdminReportTargetContext['content'] {
  return {
    text,
    status,
    createdAt: createdAt?.toISOString() ?? null,
    images,
  };
}

function emptyTargetContext(): AdminReportTargetContext {
  return {
    ownerUser: null,
    content: null,
  };
}

function toReportItemDto(
  row: AdminReportForAction,
  targetContext: AdminReportTargetContext = emptyTargetContext(),
): AdminReportListItemDto {
  return {
    reportId: row.id,
    reporter: toReportUserSummaryDto(row.reporter_user),
    target: {
      type: row.target_type,
      id: row.target_id,
      ownerUser: targetContext.ownerUser,
      content: targetContext.content,
    },
    reasonType: row.reason_type,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
  };
}

async function resolveReportTargetContexts(rows: AdminReportForAction[]): Promise<Map<number, AdminReportTargetContext>> {
  const contexts = new Map<number, AdminReportTargetContext>(
    rows.map((row) => [row.id, emptyTargetContext()]),
  );
  const uniqueIds = (values: number[]) => Array.from(new Set(values));

  const userIds = uniqueIds(rows.filter((row) => row.target_type === 'user').map((row) => row.target_id));
  const feedIds = uniqueIds(rows.filter((row) => row.target_type === 'feed').map((row) => row.target_id));
  const commentIds = uniqueIds(rows.filter((row) => row.target_type === 'feed_comment').map((row) => row.target_id));
  const chatRoomIds = uniqueIds(rows.filter((row) => row.target_type === 'chat_room').map((row) => row.target_id));
  const messageIds = uniqueIds(rows.filter((row) => row.target_type === 'message').map((row) => row.target_id));

  const [users, feeds, comments, chatRooms, messages] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: adminReportUserSelect,
        })
      : Promise.resolve([]),
    feedIds.length > 0
      ? prisma.selfDateFeed.findMany({
          where: { id: { in: feedIds } },
          select: {
            id: true,
            text: true,
            status: true,
            created_at: true,
            author_user: { select: adminReportUserSelect },
            images: {
              orderBy: { sort_order: 'asc' },
              select: { image_url: true },
            },
          },
        })
      : Promise.resolve([]),
    commentIds.length > 0
      ? prisma.feedComment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
            created_at: true,
            deleted_at: true,
            commenter_user: { select: adminReportUserSelect },
          },
        })
      : Promise.resolve([]),
    chatRoomIds.length > 0
      ? prisma.chatRoom.findMany({
          where: { id: { in: chatRoomIds } },
          select: {
            id: true,
            status: true,
            created_at: true,
            participants: {
              select: {
                user_id: true,
                user: { select: adminReportUserSelect },
              },
            },
            messages: {
              orderBy: { created_at: 'desc' },
              take: 10,
              select: {
                content: true,
                created_at: true,
                deleted_at: true,
                sender_user: { select: adminReportUserSelect },
              },
            },
          },
        })
      : Promise.resolve([]),
    messageIds.length > 0
      ? prisma.message.findMany({
          where: { id: { in: messageIds } },
          select: {
            id: true,
            content: true,
            type: true,
            created_at: true,
            deleted_at: true,
            sender_user: { select: adminReportUserSelect },
          },
        })
      : Promise.resolve([]),
  ]);

  const userById = new Map(users.map((user) => [user.id, user]));
  const feedById = new Map(feeds.map((feed) => [feed.id, feed]));
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));
  const chatRoomById = new Map(chatRooms.map((chatRoom) => [chatRoom.id, chatRoom]));
  const messageById = new Map(messages.map((message) => [message.id, message]));

  for (const row of rows) {
    if (row.target_type === 'user') {
      const user = userById.get(row.target_id);
      contexts.set(row.id, {
        ownerUser: user ? toReportUserSummaryDto(user) : null,
        content: null,
      });
      continue;
    }

    if (row.target_type === 'feed') {
      const feed = feedById.get(row.target_id);
      contexts.set(row.id, feed
        ? {
            ownerUser: toReportUserSummaryDto(feed.author_user),
            content: toReportContent(
              feed.text,
              feed.status,
              feed.created_at,
              feed.images.map((image) => image.image_url),
            ),
          }
        : emptyTargetContext());
      continue;
    }

    if (row.target_type === 'feed_comment') {
      const comment = commentById.get(row.target_id);
      contexts.set(row.id, comment
        ? {
            ownerUser: toReportUserSummaryDto(comment.commenter_user),
            content: toReportContent(comment.content, comment.deleted_at ? 'deleted' : 'active', comment.created_at),
          }
        : emptyTargetContext());
      continue;
    }

    if (row.target_type === 'chat_room') {
      const chatRoom = chatRoomById.get(row.target_id);
      const otherParticipant = chatRoom?.participants.find((participant) => participant.user_id !== row.reporter_user_id);
      const recentMessages = chatRoom
        ? [...chatRoom.messages]
            .reverse()
            .map((message) => `${message.sender_user.nickname}: ${message.deleted_at ? '[삭제된 메시지]' : message.content}`)
            .join('\n')
        : null;
      contexts.set(row.id, chatRoom
        ? {
            ownerUser: otherParticipant ? toReportUserSummaryDto(otherParticipant.user) : null,
            content: toReportContent(recentMessages || null, chatRoom.status, chatRoom.created_at),
          }
        : emptyTargetContext());
      continue;
    }

    if (row.target_type === 'message') {
      const message = messageById.get(row.target_id);
      contexts.set(row.id, message
        ? {
            ownerUser: toReportUserSummaryDto(message.sender_user),
            content: toReportContent(message.content, message.deleted_at ? 'deleted' : message.type, message.created_at),
          }
        : emptyTargetContext());
    }
  }

  return contexts;
}

async function toReportItemDtos(rows: AdminReportForAction[]): Promise<AdminReportListItemDto[]> {
  const contexts = await resolveReportTargetContexts(rows);
  return rows.map((row) => toReportItemDto(row, contexts.get(row.id)));
}

async function toReportItemDtoAsync(row: AdminReportForAction): Promise<AdminReportListItemDto> {
  const [item] = await toReportItemDtos([row]);
  return item;
}

function assertActionAllowedForTarget(action: AdminReportAction, targetType: string) {
  const isAllowed = action === 'ban_target_user'
    || (action === 'hide_feed' && targetType === 'feed')
    || (action === 'delete_comment' && targetType === 'feed_comment')
    || (action === 'close_chat_room' && targetType === 'chat_room')
    || (action === 'delete_message' && targetType === 'message');

  if (!isAllowed) {
    throw new AppError('REPORT_ACTION_NOT_ALLOWED', '이 신고 대상에는 선택한 조치를 적용할 수 없습니다.');
  }
}

async function resolveTargetOwnerUserId(
  tx: PrismaTransactionClient,
  report: Pick<AdminReportForAction, 'reporter_user_id' | 'target_type' | 'target_id'>,
): Promise<number | null> {
  switch (report.target_type) {
    case 'user': {
      const user = await tx.user.findUnique({
        where: { id: report.target_id },
        select: { id: true },
      });
      return user?.id ?? null;
    }
    case 'feed': {
      const feed = await tx.selfDateFeed.findUnique({
        where: { id: report.target_id },
        select: { author_user_id: true },
      });
      return feed?.author_user_id ?? null;
    }
    case 'feed_comment': {
      const comment = await tx.feedComment.findUnique({
        where: { id: report.target_id },
        select: { commenter_user_id: true },
      });
      return comment?.commenter_user_id ?? null;
    }
    case 'chat_room': {
      const reporterParticipant = await tx.chatRoomParticipant.findFirst({
        where: {
          chat_room_id: report.target_id,
          user_id: report.reporter_user_id,
        },
        select: { user_id: true },
      });

      if (!reporterParticipant) {
        return null;
      }

      const otherParticipant = await tx.chatRoomParticipant.findFirst({
        where: {
          chat_room_id: report.target_id,
          user_id: { not: report.reporter_user_id },
        },
        select: { user_id: true },
      });

      return otherParticipant?.user_id ?? null;
    }
    case 'message': {
      const message = await tx.message.findUnique({
        where: { id: report.target_id },
        select: { sender_user_id: true, chat_room_id: true },
      });

      if (!message || message.sender_user_id === report.reporter_user_id) {
        return null;
      }

      const reporterParticipant = await tx.chatRoomParticipant.findFirst({
        where: {
          chat_room_id: message.chat_room_id,
          user_id: report.reporter_user_id,
        },
        select: { user_id: true },
      });

      return reporterParticipant ? message.sender_user_id : null;
    }
    default:
      return null;
  }
}

async function applyActionInTransaction(
  tx: PrismaTransactionClient,
  report: AdminReportForAction,
  action: AdminReportAction,
): Promise<{ targetType: string; targetId: number; targetUserId: number | null }> {
  const now = new Date();

  switch (action) {
    case 'ban_target_user': {
      const targetUserId = await resolveTargetOwnerUserId(tx, report);

      if (!targetUserId || targetUserId === report.reporter_user_id) {
        throw new AppError('TARGET_NOT_FOUND', '조치할 신고 대상 사용자를 찾을 수 없습니다.', 404);
      }

      await tx.user.update({
        where: { id: targetUserId },
        data: { status: 'banned' },
      });

      return { targetType: 'user', targetId: targetUserId, targetUserId };
    }
    case 'hide_feed':
      await tx.selfDateFeed.update({
        where: { id: report.target_id },
        data: { status: 'hidden', updated_at: now },
      });
      return { targetType: 'feed', targetId: report.target_id, targetUserId: null };
    case 'delete_comment':
      await tx.feedComment.update({
        where: { id: report.target_id },
        data: { deleted_at: now },
      });
      return { targetType: 'feed_comment', targetId: report.target_id, targetUserId: null };
    case 'close_chat_room':
      await tx.chatRoom.update({
        where: { id: report.target_id },
        data: { status: 'closed' },
      });
      return { targetType: 'chat_room', targetId: report.target_id, targetUserId: null };
    case 'delete_message':
      await tx.message.update({
        where: { id: report.target_id },
        data: { deleted_at: now },
      });
      return { targetType: 'message', targetId: report.target_id, targetUserId: null };
    default:
      throw new AppError('INVALID_REPORT_ACTION', '신고 조치 값이 올바르지 않습니다.');
  }
}

export async function listAdminReports(filterStatus: AdminReportStatusFilter): Promise<AdminReportListDto> {
  const status = filterStatus === 'all' ? undefined : filterStatus as report_status;
  const [rows, counts] = await Promise.all([
    repo.findReports(status),
    repo.countReportsByStatus(),
  ]);

  return {
    items: await toReportItemDtos(rows),
    summary: {
      total: counts.pending + counts.reviewed + counts.actioned + counts.dismissed,
      pending: counts.pending,
      reviewed: counts.reviewed,
      actioned: counts.actioned,
      dismissed: counts.dismissed,
    },
    filterStatus,
  };
}

export async function updateAdminReportStatus(reportId: number, status: AdminReportStatus): Promise<AdminReportUpdateResultDto> {
  if (!Number.isInteger(reportId) || reportId <= 0) {
    throw new AppError('INVALID_REPORT_ID', '신고 ID가 올바르지 않습니다.');
  }

  try {
    const report = await repo.updateReportStatus(reportId, status);
    return { report: await toReportItemDtoAsync(report) };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      throw new AppError('REPORT_NOT_FOUND', '존재하지 않는 신고입니다.', 404);
    }

    throw error;
  }
}

export async function applyAdminReportAction(reportId: number, action: AdminReportAction): Promise<AdminReportActionResultDto> {
  if (!Number.isInteger(reportId) || reportId <= 0) {
    throw new AppError('INVALID_REPORT_ID', '신고 ID가 올바르지 않습니다.');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        include: adminReportInclude,
      });

      if (!report) {
        throw new AppError('REPORT_NOT_FOUND', '존재하지 않는 신고입니다.', 404);
      }

      assertActionAllowedForTarget(action, report.target_type);
      const actionResult = await applyActionInTransaction(tx, report, action);

      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'actioned',
          reviewed_at: new Date(),
        },
        include: adminReportInclude,
      });

      return {
        report: updatedReport,
        action: {
          type: action,
          ...actionResult,
        },
      };
    });

    return {
      report: await toReportItemDtoAsync(result.report),
      action: result.action,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      throw new AppError('TARGET_NOT_FOUND', '조치할 신고 대상을 찾을 수 없습니다.', 404);
    }

    throw error;
  }
}
