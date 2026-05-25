export type AdminReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type AdminReportStatusFilter = AdminReportStatus | 'all';
export type AdminReportAction = 'ban_target_user' | 'hide_feed' | 'delete_comment' | 'close_chat_room' | 'delete_message';

export interface AdminReportUserSummaryDto {
  userId: number;
  nickname: string;
  loginId: string | null;
  university: string;
  department: string;
  gender: string;
  age: number | null;
  studentYear: number;
  bio: string | null;
  onboardingCompleted: boolean;
  status: string;
  profileImages: string[];
  primaryProfileImage: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface AdminLoginResultDto {
  authenticated: true;
}

export interface AdminLogoutResultDto {
  loggedOut: true;
}

export interface AdminReportListItemDto {
  reportId: number;
  reporter: AdminReportUserSummaryDto;
  target: {
    type: string;
    id: number;
    ownerUser: AdminReportUserSummaryDto | null;
    content: {
      text: string | null;
      status: string | null;
      createdAt: string | null;
      images: string[];
    } | null;
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
