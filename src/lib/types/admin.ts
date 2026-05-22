export type AdminReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type AdminReportStatusFilter = AdminReportStatus | 'all';
export type AdminReportAction = 'ban_target_user' | 'hide_feed' | 'delete_comment' | 'close_chat_room' | 'delete_message';

export interface AdminLoginResultDto {
  authenticated: true;
}

export interface AdminLogoutResultDto {
  loggedOut: true;
}

export interface AdminReportListItemDto {
  reportId: number;
  reporter: {
    userId: number;
    nickname: string;
    loginId: string | null;
    university: string;
    department: string;
    status: string;
  };
  target: {
    type: string;
    id: number;
  };
  reasonType: string;
  description: string | null;
  status: AdminReportStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminReportSummaryDto {
  total: number;
  pending: number;
  reviewed: number;
  actioned: number;
  dismissed: number;
}

export interface AdminReportListDto {
  items: AdminReportListItemDto[];
  summary: AdminReportSummaryDto;
  filterStatus: AdminReportStatusFilter;
}

export interface AdminReportUpdateResultDto {
  report: AdminReportListItemDto;
}

export interface AdminReportActionResultDto {
  report: AdminReportListItemDto;
  action: {
    type: AdminReportAction;
    targetType: string;
    targetId: number;
    targetUserId: number | null;
  };
}
