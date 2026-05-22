import { prisma } from '@/server/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import type { report_status } from '@/generated/prisma/enums';
import { AdminReportRepository, type AdminReportRow } from '@/server/repositories/admin/admin-report.repository';
import type {
  AdminReportAction,
  AdminReportActionResultDto,
  AdminReportListDto,
  AdminReportListItemDto,
  AdminReportStatus,
  AdminReportStatusFilter,
  AdminReportUpdateResultDto,
} from '@/lib/types/admin';
import { AppError } from '@/server/lib/app-error';

const repo = new AdminReportRepository(prisma);

const REPORT_STATUSES: AdminReportStatus[] = ['pending', 'reviewed', 'actioned', 'dismissed'];
const REPORT_ACTIONS: AdminReportAction[] = ['ban_target_user', 'hide_feed', 'delete_comment', 'close_chat_room', 'delete_message'];

const adminReportInclude = {
  reporter_user: {
    select: {
      id: true,
      login_id: true,
      nickname: true,
      university: true,
      department: true,
      status: true,
    },
  },
} satisfies Prisma.ReportInclude;

type AdminReportForAction = Prisma.ReportGetPayload<{ include: typeof adminReportInclude }>;

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

function toReportItemDto(row: AdminReportRow): AdminReportListItemDto {
  return {
    reportId: row.id,
    reporter: {
      userId: row.reporter_user.id,
      nickname: row.reporter_user.nickname,
      loginId: row.reporter_user.login_id,
      university: row.reporter_user.university,
      department: row.reporter_user.department,
      status: row.reporter_user.status,
    },
    target: {
      type: row.target_type,
      id: row.target_id,
    },
    reasonType: row.reason_type,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
  };
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
  tx: Prisma.TransactionClient,
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
  tx: Prisma.TransactionClient,
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
    items: rows.map(toReportItemDto),
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
    return { report: toReportItemDto(report) };
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
    return await prisma.$transaction(async (tx) => {
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
        report: toReportItemDto(updatedReport),
        action: {
          type: action,
          ...actionResult,
        },
      };
    });
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
