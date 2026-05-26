'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfirmSheet, ImageCarousel, useToast } from '@/components/ui';
import type {
  AdminLoginResultDto,
  AdminLogoutResultDto,
  AdminReportAction,
  AdminReportActionResultDto,
  AdminReportListDto,
  AdminReportListItemDto,
  AdminReportStatus,
  AdminReportStatusFilter,
  AdminReportUpdateResultDto,
  ApiResponse,
  ChatRoomListItemDto,
  KeywordListDto,
} from '@/lib/types';

interface AdminRecommendationResetResultDto {
  deleted: {
    chat_rooms: number;
    interests: number;
    daily_recommendations: number;
    recommendation_dismisses: number;
    recommendation_settings: number;
    internal_job_runs: number;
  };
}

interface AdminMaintenanceModeDto {
  enabled: boolean;
  updatedAt: string | null;
}

type AdminSection = 'reports' | 'support' | 'operator-feed' | 'operator-chat';
type AdminInquiryStatus = 'received' | 'in_review' | 'answered';
type AdminInquiryStatusFilter = 'all' | AdminInquiryStatus;

interface AdminSupportInquiryDto {
  id: number;
  userId: number | null;
  category: string;
  screen: string;
  title: string;
  content: string;
  email: string | null;
  status: AdminInquiryStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    nickname: string;
    status: string;
    deletedAt: string | null;
  } | null;
}

interface AdminSupportInquiryListDto {
  items: AdminSupportInquiryDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminOperatorFeedResultDto {
  feedId: number;
  expiresAt: string;
  operator: AdminOperatorSummaryDto;
}

interface AdminOperatorSummaryDto {
  userId: number;
  nickname: string;
  onboardingCompleted: boolean;
}

interface AdminOperatorReactionDto {
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
}

interface AdminOperatorChatReactionListDto {
  operator: AdminOperatorSummaryDto;
  items: AdminOperatorReactionDto[];
}

interface AdminOperatorChatRoomListDto {
  operator: AdminOperatorSummaryDto;
  rooms: ChatRoomListItemDto[];
}

interface AdminOperatorChatMessageDto {
  id: number;
  sender_user_id: number;
  type: string;
  content: string;
  created_at: string;
}

interface AdminOperatorChatMessagesDto {
  operator: AdminOperatorSummaryDto;
  messages: AdminOperatorChatMessageDto[];
}

interface AdminOperatorChatStartDto {
  operator: AdminOperatorSummaryDto;
  chatRoomId: number;
}

interface AdminOperatorChatSendDto {
  operator: AdminOperatorSummaryDto;
  message: AdminOperatorChatMessageDto;
}

interface AdminOperatorChatExpireDto {
  operator: AdminOperatorSummaryDto;
  room: ChatRoomListItemDto;
}

const SHOW_RECOMMENDATION_RESET_BUTTON = false;

const ADMIN_SECTIONS: Array<{ value: AdminSection; label: string }> = [
  { value: 'reports', label: '신고 관리' },
  { value: 'support', label: '문의 관리' },
  { value: 'operator-feed', label: '운영자 피드' },
  { value: 'operator-chat', label: '운영자 채팅' },
];

const STATUS_FILTERS: Array<{ value: AdminReportStatusFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'reviewed', label: '검토' },
  { value: 'actioned', label: '조치' },
  { value: 'dismissed', label: '기각' },
];

const INQUIRY_STATUS_FILTERS: Array<{ value: AdminInquiryStatusFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'received', label: '접수' },
  { value: 'in_review', label: '검토중' },
  { value: 'answered', label: '답변완료' },
];

const REPORT_STATUSES: Array<{ value: AdminReportStatus; label: string }> = [
  { value: 'pending', label: '대기' },
  { value: 'reviewed', label: '검토' },
  { value: 'actioned', label: '조치' },
  { value: 'dismissed', label: '기각' },
];

const INQUIRY_STATUSES: Array<{ value: AdminInquiryStatus; label: string }> = [
  { value: 'received', label: '접수' },
  { value: 'in_review', label: '검토중' },
  { value: 'answered', label: '답변완료' },
];

const TARGET_LABELS: Record<string, string> = {
  user: '사용자',
  feed: '피드',
  feed_comment: '댓글',
  chat_room: '채팅방',
  message: '메시지',
};

const REPORT_REASON_LABELS: Record<string, string> = {
  inappropriate: '부적절한 내용/행동',
  profile_report: '프로필 신고',
  feed_report: '피드 신고',
  chat_report: '채팅 신고',
  other: '기타',
};

const ACTION_LABELS: Record<AdminReportAction, string> = {
  ban_target_user: '유저 정지',
  hide_feed: '피드 숨김',
  delete_comment: '댓글 삭제',
  close_chat_room: '채팅 종료',
  delete_message: '메시지 삭제',
};

const ACTION_DESCRIPTIONS: Record<AdminReportAction, string> = {
  ban_target_user: '신고 대상 사용자의 계정을 정지합니다. 정지된 사용자는 로그인과 서비스 이용이 제한돼요.',
  hide_feed: '신고 대상 피드를 숨김 처리합니다. 사용자는 더 이상 이 피드를 목록이나 상세에서 볼 수 없어요.',
  delete_comment: '신고 대상 댓글을 삭제 처리합니다. 댓글은 soft delete로 목록에서 제외돼요.',
  close_chat_room: '신고 대상 채팅방을 종료합니다. 참여자는 더 이상 메시지를 보낼 수 없어요.',
  delete_message: '신고 대상 메시지를 삭제 처리합니다. 메시지는 대화 목록에서 제외돼요.',
};

class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

async function readAdminResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success) {
    throw new AdminApiError(payload?.error?.message ?? '요청을 처리하지 못했습니다.', response.status);
  }

  return payload.data as T;
}

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormDataBody = typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (init.body && !isFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  return readAdminResponse<T>(response);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusLabel(status: AdminReportStatus): string {
  return REPORT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function getTargetLabel(type: string): string {
  return TARGET_LABELS[type] ?? type;
}

function getReasonLabel(reasonType: string): string {
  return REPORT_REASON_LABELS[reasonType] ?? reasonType;
}

function getGenderLabel(gender: string): string {
  if (gender === 'male') {
    return '남성';
  }

  if (gender === 'female') {
    return '여성';
  }

  return gender;
}

function getTargetDisplayName(item: AdminReportListItemDto): string {
  if (item.target.ownerUser) {
    return `${item.target.ownerUser.nickname} · ${getTargetLabel(item.target.type)} #${item.target.id}`;
  }

  return `${getTargetLabel(item.target.type)} #${item.target.id}`;
}

function getReportActions(item: AdminReportListItemDto): AdminReportAction[] {
  const actions: AdminReportAction[] = ['ban_target_user'];

  if (item.target.type === 'feed') {
    actions.push('hide_feed');
  }

  if (item.target.type === 'feed_comment') {
    actions.push('delete_comment');
  }

  if (item.target.type === 'chat_room') {
    actions.push('close_chat_room');
  }

  if (item.target.type === 'message') {
    actions.push('delete_message');
  }

  return actions;
}

function getStatusClass(status: AdminReportStatus): string {
  switch (status) {
    case 'pending':
      return 'border-[#F8C7D8] bg-[#FFF1F6] text-[#9A3155]';
    case 'reviewed':
      return 'border-[#BFD7FF] bg-[#EFF6FF] text-[#25578F]';
    case 'actioned':
      return 'border-[#BFE8D1] bg-[#F0FDF4] text-[#24734A]';
    case 'dismissed':
      return 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]';
    default:
      return 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]';
  }
}

function getInquiryStatusLabel(status: AdminInquiryStatus): string {
  return INQUIRY_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function getInquiryStatusClass(status: AdminInquiryStatus): string {
  switch (status) {
    case 'received':
      return 'border-[#F8C7D8] bg-[#FFF1F6] text-[#9A3155]';
    case 'in_review':
      return 'border-[#BFD7FF] bg-[#EFF6FF] text-[#25578F]';
    case 'answered':
      return 'border-[#BFE8D1] bg-[#F0FDF4] text-[#24734A]';
    default:
      return 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]';
  }
}

function LoginPanel({
  code,
  errorMessage,
  isSubmitting,
  onCodeChange,
  onSubmit,
}: {
  code: string;
  errorMessage: string;
  isSubmitting: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] px-5 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] p-6 shadow-[0_8px_24px_rgba(34,34,34,0.08)]"
      >
        <div className="mb-6">
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">관리자</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">운영 관리</h1>
        </div>

        <label htmlFor="admin-code" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
          관리자 코드
        </label>
        <input
          id="admin-code"
          type="password"
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          autoComplete="current-password"
          className="h-12 w-full rounded-lg border border-[var(--color-border)] bg-white px-4 text-base font-medium outline-none transition focus:border-[var(--color-focus)] focus:ring-3 focus:ring-[var(--color-focus)]/15"
        />

        {errorMessage && (
          <p className="mt-3 rounded-lg bg-[#FFF1F6] px-3 py-2 text-sm font-medium text-[#9A3155]" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-5">
          들어가기
        </Button>
      </form>
    </main>
  );
}

function ReportStatusBadge({ status }: { status: AdminReportStatus }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${getStatusClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function ReportItem({
  item,
  draftStatus,
  isUpdating,
  runningAction,
  onDraftChange,
  onApply,
  onAction,
}: {
  item: AdminReportListItemDto;
  draftStatus: AdminReportStatus;
  isUpdating: boolean;
  runningAction: AdminReportAction | null;
  onDraftChange: (status: AdminReportStatus) => void;
  onApply: () => void;
  onAction: (action: AdminReportAction) => void;
}) {
  const isChanged = draftStatus !== item.status;
  const actions = getReportActions(item);

  return (
    <article className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-[0_3px_10px_rgba(34,34,34,0.045)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">#{item.reportId}</p>
          <ReportStatusBadge status={item.status} />
          <p className="text-xs font-medium text-[var(--color-text-tertiary)]">{formatDateTime(item.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={draftStatus}
            onChange={(event) => onDraftChange(event.target.value as AdminReportStatus)}
            className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/15"
          >
            {REPORT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="secondary" loading={isUpdating} disabled={!isChanged} onClick={onApply}>
            적용
          </Button>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_1.2fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">신고자</p>
          <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">{item.reporter.nickname}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
            {item.reporter.university} · {item.reporter.department}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            ID {item.reporter.userId}{item.reporter.loginId ? ` · ${item.reporter.loginId}` : ''}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">대상</p>
          {item.target.ownerUser ? (
            <div className="mt-2 flex items-start gap-3">
              <div className="w-24 shrink-0">
                <ImageCarousel
                  images={item.target.ownerUser.profileImages}
                  aspectRatio="1/1"
                  alt={`${item.target.ownerUser.nickname} 프로필 사진`}
                  className="rounded-lg"
                  showIndicators={item.target.ownerUser.profileImages.length > 1}
                  showCountBadge={item.target.ownerUser.profileImages.length > 1}
                />
                <p className="mt-1 text-center text-[11px] text-[var(--color-text-tertiary)]">
                  사진 {Math.max(item.target.ownerUser.profileImages.length, 1)}장
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">{item.target.ownerUser.nickname}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                  {item.target.ownerUser.university} · {item.target.ownerUser.department}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                  {getGenderLabel(item.target.ownerUser.gender)}
                  {' · '}
                  {item.target.ownerUser.age ? `${item.target.ownerUser.age}세` : '나이 없음'}
                  {' · '}
                  {item.target.ownerUser.studentYear}학년
                </p>
                <p className="mt-1 break-all text-xs text-[var(--color-text-tertiary)]">
                  ID {item.target.ownerUser.userId}{item.target.ownerUser.loginId ? ` · ${item.target.ownerUser.loginId}` : ''} · 상태 {item.target.ownerUser.status}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  온보딩 {item.target.ownerUser.onboardingCompleted ? '완료' : '미완료'} · 가입 {formatDateTime(item.target.ownerUser.createdAt)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  {getTargetLabel(item.target.type)} #{item.target.id}
                </p>
                {item.target.ownerUser.bio && (
                  <p className="mt-2 max-h-16 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-[var(--color-text-secondary)]">
                    {item.target.ownerUser.bio}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                {getTargetLabel(item.target.type)} #{item.target.id}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">대상 사용자 정보를 찾을 수 없음</p>
            </>
          )}
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            사유: {getReasonLabel(item.reasonType)}
            {REPORT_REASON_LABELS[item.reasonType] ? ` (${item.reasonType})` : ''}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">검토: {formatDateTime(item.reviewedAt)}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">신고 상세</p>
          <p className="mt-1 min-h-10 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-text-primary)]">
            {item.description?.trim() || '상세 설명 없음'}
          </p>
          {item.target.content && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">대상 내용</p>
              <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-[var(--color-text-secondary)]">
                {item.target.content.text?.trim() || '내용 본문 없음'}
              </p>
              {item.target.content.images.length > 0 && (
                <div className="mt-3 max-w-[220px]">
                  <ImageCarousel
                    images={item.target.content.images}
                    aspectRatio="1/1"
                    alt="피드 이미지"
                    className="rounded-lg"
                    showIndicators={item.target.content.images.length > 1}
                    showCountBadge={item.target.content.images.length > 1}
                  />
                  <p className="mt-1 text-center text-[11px] text-[var(--color-text-tertiary)]">
                    피드 이미지 {item.target.content.images.length}장
                  </p>
                </div>
              )}
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                상태 {item.target.content.status ?? '-'} · 작성 {formatDateTime(item.target.content.createdAt)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-light)] px-4 py-3">
        <p className="mr-1 text-xs font-semibold text-[var(--color-text-tertiary)]">조치</p>
        {actions.map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={action === 'ban_target_user' ? 'danger' : 'secondary'}
            loading={runningAction === action}
            disabled={Boolean(runningAction) || isUpdating}
            onClick={() => onAction(action)}
          >
            {ACTION_LABELS[action]}
          </Button>
        ))}
      </div>
    </article>
  );
}

function InquiryStatusBadge({ status }: { status: AdminInquiryStatus }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${getInquiryStatusClass(status)}`}>
      {getInquiryStatusLabel(status)}
    </span>
  );
}

function InquiryItem({
  item,
  draftStatus,
  nicknameDraft,
  isUpdating,
  isUpdatingNickname,
  isWithdrawingUser,
  onDraftChange,
  onNicknameDraftChange,
  onApply,
  onNicknameApply,
  onWithdrawUser,
}: {
  item: AdminSupportInquiryDto;
  draftStatus: AdminInquiryStatus;
  nicknameDraft: string;
  isUpdating: boolean;
  isUpdatingNickname: boolean;
  isWithdrawingUser: boolean;
  onDraftChange: (status: AdminInquiryStatus) => void;
  onNicknameDraftChange: (nickname: string) => void;
  onApply: () => void;
  onNicknameApply: () => void;
  onWithdrawUser: () => void;
}) {
  const isChanged = draftStatus !== item.status;
  const canApply = isChanged && draftStatus !== 'received';
  const trimmedNicknameDraft = nicknameDraft.trim();
  const currentNickname = item.user?.nickname ?? '';
  const isWithdrawnUser = item.user?.status === 'withdrawn' || Boolean(item.user?.deletedAt);
  const canApplyNickname = Boolean(item.user)
    && trimmedNicknameDraft.length >= 2
    && trimmedNicknameDraft.length <= 50
    && trimmedNicknameDraft !== currentNickname
    && !isUpdating
    && !isWithdrawingUser;
  const canWithdrawUser = Boolean(item.user)
    && !isWithdrawnUser
    && !isUpdating
    && !isUpdatingNickname
    && !isWithdrawingUser;

  return (
    <article className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-[0_3px_10px_rgba(34,34,34,0.045)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">#{item.id}</p>
          <InquiryStatusBadge status={item.status} />
          <p className="text-xs font-medium text-[var(--color-text-tertiary)]">{formatDateTime(item.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={draftStatus}
            onChange={(event) => onDraftChange(event.target.value as AdminInquiryStatus)}
            disabled={isUpdating || isUpdatingNickname || isWithdrawingUser}
            className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/15"
          >
            {INQUIRY_STATUSES.map((status) => (
              <option key={status.value} value={status.value} disabled={status.value === 'received' && item.status !== 'received'}>
                {status.label}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="secondary" loading={isUpdating} disabled={!canApply || isUpdatingNickname || isWithdrawingUser} onClick={onApply}>
            적용
          </Button>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_1fr_1.4fr]">
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">문의자</p>
          <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
            {item.user?.nickname ?? '알 수 없는 사용자'}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {item.userId ? `ID ${item.userId}` : '사용자 ID 없음'}
          </p>
          <p className="mt-1 break-all text-xs text-[var(--color-text-secondary)]">
            {item.email ?? '회신 이메일 없음'}
          </p>
          {item.user && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              계정 상태: {isWithdrawnUser ? `탈퇴 처리됨${item.user.deletedAt ? ` · ${formatDateTime(item.user.deletedAt)}` : ''}` : item.user.status}
            </p>
          )}
          <div className="mt-3 grid gap-2">
            <label htmlFor={`inquiry-nickname-${item.id}`} className="text-xs font-semibold text-[var(--color-text-tertiary)]">
              닉네임 변경
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={`inquiry-nickname-${item.id}`}
                value={nicknameDraft}
                onChange={(event) => onNicknameDraftChange(event.target.value.slice(0, 50))}
                disabled={!item.user || isUpdatingNickname || isWithdrawingUser}
                placeholder="새 닉네임"
                className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/15 disabled:bg-[var(--color-surface-secondary)] disabled:text-[var(--color-text-tertiary)]"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={isUpdatingNickname}
                disabled={!canApplyNickname}
                onClick={onNicknameApply}
              >
                변경
              </Button>
            </div>
            <p className="text-[11px] leading-4 text-[var(--color-text-tertiary)]">
              2~50자, 중복 닉네임은 저장되지 않습니다.
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-secondary)] p-3">
            <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">계정 탈퇴 처리</p>
            <p className="mt-1 break-keep text-[11px] leading-4 text-[var(--color-text-secondary)]">
              이 문의에 연결된 사용자만 soft delete 처리합니다.
            </p>
            <Button
              type="button"
              size="sm"
              variant="danger"
              fullWidth
              className="mt-3"
              loading={isWithdrawingUser}
              disabled={!canWithdrawUser}
              onClick={onWithdrawUser}
            >
              {isWithdrawnUser ? '탈퇴 처리됨' : '문의자 탈퇴 처리'}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">분류</p>
          <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">{item.category}</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">화면: {item.screen}</p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">수정: {formatDateTime(item.updatedAt)}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">문의 내용</p>
          <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">{item.title}</p>
          <p className="mt-2 min-h-10 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-text-primary)]">
            {item.content.trim() || '내용 없음'}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function AdminPage() {
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>('reports');
  const [maintenanceMode, setMaintenanceMode] = useState<AdminMaintenanceModeDto | null>(null);
  const [isLoadingMaintenanceMode, setIsLoadingMaintenanceMode] = useState(false);
  const [isUpdatingMaintenanceMode, setIsUpdatingMaintenanceMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AdminReportStatusFilter>('pending');
  const [reports, setReports] = useState<AdminReportListItemDto[]>([]);
  const [summary, setSummary] = useState<AdminReportListDto['summary'] | null>(null);
  const [draftStatuses, setDraftStatuses] = useState<Record<number, AdminReportStatus>>({});
  const [updatingReportId, setUpdatingReportId] = useState<number | null>(null);
  const [runningActionKey, setRunningActionKey] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ item: AdminReportListItemDto; action: AdminReportAction } | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [inquiryFilterStatus, setInquiryFilterStatus] = useState<AdminInquiryStatusFilter>('received');
  const [inquiries, setInquiries] = useState<AdminSupportInquiryDto[]>([]);
  const [inquiryTotal, setInquiryTotal] = useState(0);
  const [inquiryDraftStatuses, setInquiryDraftStatuses] = useState<Record<number, AdminInquiryStatus>>({});
  const [inquiryNicknameDrafts, setInquiryNicknameDrafts] = useState<Record<number, string>>({});
  const [updatingInquiryId, setUpdatingInquiryId] = useState<number | null>(null);
  const [updatingNicknameInquiryId, setUpdatingNicknameInquiryId] = useState<number | null>(null);
  const [withdrawingInquiryId, setWithdrawingInquiryId] = useState<number | null>(null);
  const [withdrawalTarget, setWithdrawalTarget] = useState<AdminSupportInquiryDto | null>(null);
  const [isLoadingInquiries, setIsLoadingInquiries] = useState(false);
  const [inquiryLoadError, setInquiryLoadError] = useState('');
  const [operatorFeedKeywords, setOperatorFeedKeywords] = useState<KeywordListDto['items']>([]);
  const [operatorFeedText, setOperatorFeedText] = useState('');
  const [operatorFeedKeywordIds, setOperatorFeedKeywordIds] = useState<number[]>([]);
  const [operatorFeedImages, setOperatorFeedImages] = useState<File[]>([]);
  const [operatorFeedLoadError, setOperatorFeedLoadError] = useState('');
  const [isLoadingOperatorFeedKeywords, setIsLoadingOperatorFeedKeywords] = useState(false);
  const [isSubmittingOperatorFeed, setIsSubmittingOperatorFeed] = useState(false);
  const [operatorChatRooms, setOperatorChatRooms] = useState<ChatRoomListItemDto[]>([]);
  const [operatorChatReactions, setOperatorChatReactions] = useState<AdminOperatorReactionDto[]>([]);
  const [operatorChatMessages, setOperatorChatMessages] = useState<AdminOperatorChatMessageDto[]>([]);
  const [operatorChatUser, setOperatorChatUser] = useState<AdminOperatorSummaryDto | null>(null);
  const [selectedOperatorChatRoomId, setSelectedOperatorChatRoomId] = useState<number | null>(null);
  const [operatorChatDraftMessage, setOperatorChatDraftMessage] = useState('');
  const [operatorChatLoadError, setOperatorChatLoadError] = useState('');
  const [isLoadingOperatorChats, setIsLoadingOperatorChats] = useState(false);
  const [isLoadingOperatorMessages, setIsLoadingOperatorMessages] = useState(false);
  const [startingOperatorReactionId, setStartingOperatorReactionId] = useState<number | null>(null);
  const [isSendingOperatorChatMessage, setIsSendingOperatorChatMessage] = useState(false);
  const [expiringOperatorChatRoomId, setExpiringOperatorChatRoomId] = useState<number | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResettingRecommendations, setIsResettingRecommendations] = useState(false);

  const loadReports = useCallback(async (nextFilter: AdminReportStatusFilter) => {
    setIsLoadingReports(true);

    try {
      const data = await adminRequest<AdminReportListDto>(`/api/admin/reports?status=${nextFilter}`);
      setReports(data.items);
      setSummary(data.summary);
      setDraftStatuses(Object.fromEntries(data.items.map((item) => [item.reportId, item.status])));
      setIsAuthenticated(true);
      setLoginError('');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (error instanceof AdminApiError && error.status === 503) {
        setIsAuthenticated(false);
        setLoginError(error.message);
        return;
      }

      showToast(error instanceof Error ? error.message : '신고 목록을 불러오지 못했어요.', 'error');
    } finally {
      setIsLoadingReports(false);
    }
  }, [showToast]);

  const loadMaintenanceMode = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setIsLoadingMaintenanceMode(true);
    }

    try {
      const data = await adminRequest<AdminMaintenanceModeDto>('/api/admin/maintenance');
      setMaintenanceMode(data);
      setIsAuthenticated(true);
      setLoginError('');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (!options.silent) {
        showToast(error instanceof Error ? error.message : '점검 모드 상태를 불러오지 못했어요.', 'error');
      }
    } finally {
      if (!options.silent) {
        setIsLoadingMaintenanceMode(false);
      }
    }
  }, [showToast]);

  const loadInquiries = useCallback(async (nextFilter: AdminInquiryStatusFilter) => {
    setIsLoadingInquiries(true);
    setInquiryLoadError('');

    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (nextFilter !== 'all') {
        params.set('status', nextFilter);
      }

      const data = await adminRequest<AdminSupportInquiryListDto>(`/api/admin/support-inquiries?${params.toString()}`);
      setInquiries(data.items);
      setInquiryTotal(data.total);
      setInquiryDraftStatuses(Object.fromEntries(data.items.map((item) => [item.id, item.status])));
      setInquiryNicknameDrafts(Object.fromEntries(data.items.map((item) => [item.id, item.user?.nickname ?? ''])));
      setIsAuthenticated(true);
      setLoginError('');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (error instanceof AdminApiError && error.status === 503) {
        setIsAuthenticated(false);
        setLoginError(error.message);
        return;
      }

      setInquiries([]);
      setInquiryTotal(0);
      setInquiryDraftStatuses({});
      setInquiryNicknameDrafts({});
      setInquiryLoadError(error instanceof Error ? error.message : '문의 목록을 불러오지 못했어요.');
    } finally {
      setIsLoadingInquiries(false);
    }
  }, []);

  const loadOperatorFeedKeywords = useCallback(async () => {
    setIsLoadingOperatorFeedKeywords(true);
    setOperatorFeedLoadError('');

    try {
      const data = await adminRequest<KeywordListDto>('/api/feeds/keywords');
      setOperatorFeedKeywords(data.items);
    } catch (error) {
      setOperatorFeedKeywords([]);
      setOperatorFeedLoadError(error instanceof Error ? error.message : '피드 키워드를 불러오지 못했어요.');
    } finally {
      setIsLoadingOperatorFeedKeywords(false);
    }
  }, []);

  const loadOperatorChatMessages = useCallback(async (roomId: number, options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setIsLoadingOperatorMessages(true);
    }

    try {
      const data = await adminRequest<AdminOperatorChatMessagesDto>(`/api/admin/operator/chat/rooms/${roomId}/messages?limit=50`);
      setOperatorChatUser(data.operator);
      setOperatorChatMessages([...data.messages].reverse());
      setSelectedOperatorChatRoomId(roomId);
    } catch (error) {
      if (!options.silent) {
        showToast(error instanceof Error ? error.message : '운영자 채팅 메시지를 불러오지 못했어요.', 'error');
      }
    } finally {
      if (!options.silent) {
        setIsLoadingOperatorMessages(false);
      }
    }
  }, [showToast]);

  const loadOperatorChats = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setIsLoadingOperatorChats(true);
      setOperatorChatLoadError('');
    }

    try {
      const [roomsData, reactionsData] = await Promise.all([
        adminRequest<AdminOperatorChatRoomListDto>('/api/admin/operator/chat/rooms'),
        adminRequest<AdminOperatorChatReactionListDto>('/api/admin/operator/chat/reactions'),
      ]);

      setOperatorChatUser(roomsData.operator);
      setOperatorChatRooms(roomsData.rooms);
      setOperatorChatReactions(reactionsData.items);
    } catch (error) {
      if (!options.silent) {
        setOperatorChatRooms([]);
        setOperatorChatReactions([]);
        setOperatorChatLoadError(error instanceof Error ? error.message : '운영자 채팅을 불러오지 못했어요.');
      }
    } finally {
      if (!options.silent) {
        setIsLoadingOperatorChats(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'reports') {
      void loadReports(filterStatus);
    }
  }, [activeSection, filterStatus, loadReports]);

  useEffect(() => {
    if (activeSection === 'support') {
      void loadInquiries(inquiryFilterStatus);
    }
  }, [activeSection, inquiryFilterStatus, loadInquiries]);

  useEffect(() => {
    if (activeSection === 'operator-feed') {
      void loadOperatorFeedKeywords();
    }
  }, [activeSection, loadOperatorFeedKeywords]);

  useEffect(() => {
    if (activeSection === 'operator-chat') {
      void loadOperatorChats();
    }
  }, [activeSection, loadOperatorChats]);

  useEffect(() => {
    if (isAuthenticated === true) {
      void loadMaintenanceMode();
    }
  }, [isAuthenticated, loadMaintenanceMode]);

  useEffect(() => {
    if (activeSection !== 'operator-chat' || isAuthenticated !== true) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadOperatorChats({ silent: true });
      if (selectedOperatorChatRoomId) {
        void loadOperatorChatMessages(selectedOperatorChatRoomId, { silent: true });
      }
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activeSection, isAuthenticated, loadOperatorChatMessages, loadOperatorChats, selectedOperatorChatRoomId]);

  const filteredCountLabel = useMemo(() => {
    if (!summary) {
      return '0건';
    }

    if (filterStatus === 'all') {
      return `${summary.total}건`;
    }

    return `${summary[filterStatus]}건`;
  }, [filterStatus, summary]);

  const inquiryCountLabel = useMemo(() => `${inquiryTotal}건`, [inquiryTotal]);
  const operatorFeedImageCountLabel = useMemo(() => `${operatorFeedImages.length}/4`, [operatorFeedImages.length]);
  const selectedOperatorChatRoom = useMemo(
    () => operatorChatRooms.find((room) => room.roomId === selectedOperatorChatRoomId) ?? null,
    [operatorChatRooms, selectedOperatorChatRoomId],
  );
  const unresolvedOperatorReactions = useMemo(
    () => operatorChatReactions.filter((reaction) => reaction.chatRoomId === null),
    [operatorChatReactions],
  );
  const isActiveSectionLoading = activeSection === 'support'
    ? isLoadingInquiries
    : activeSection === 'operator-feed'
      ? isLoadingOperatorFeedKeywords || isSubmittingOperatorFeed
      : activeSection === 'operator-chat'
        ? isLoadingOperatorChats || isLoadingOperatorMessages || isSendingOperatorChatMessage || expiringOperatorChatRoomId !== null
        : isLoadingReports;

  const refreshActiveSection = () => {
    void loadMaintenanceMode({ silent: true });

    if (activeSection === 'support') {
      void loadInquiries(inquiryFilterStatus);
      return;
    }

    if (activeSection === 'operator-feed') {
      void loadOperatorFeedKeywords();
      return;
    }

    if (activeSection === 'operator-chat') {
      void loadOperatorChats();
      return;
    }

    void loadReports(filterStatus);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setIsLoginSubmitting(true);

    try {
      await adminRequest<AdminLoginResultDto>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setCode('');
      setIsAuthenticated(true);
      if (activeSection === 'support') {
        await loadInquiries(inquiryFilterStatus);
      } else if (activeSection === 'operator-feed') {
        await loadOperatorFeedKeywords();
      } else if (activeSection === 'operator-chat') {
        await loadOperatorChats();
      } else {
        await loadReports(filterStatus);
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '관리자 인증에 실패했어요.');
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await adminRequest<AdminLogoutResultDto>('/api/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
    setIsAuthenticated(false);
    setReports([]);
    setSummary(null);
    setDraftStatuses({});
    setRunningActionKey(null);
    setActionTarget(null);
    setInquiries([]);
    setInquiryTotal(0);
    setInquiryDraftStatuses({});
    setInquiryNicknameDrafts({});
    setUpdatingInquiryId(null);
    setUpdatingNicknameInquiryId(null);
    setMaintenanceMode(null);
    setIsLoadingMaintenanceMode(false);
    setIsUpdatingMaintenanceMode(false);
    setInquiryLoadError('');
    setOperatorFeedKeywords([]);
    setOperatorFeedText('');
    setOperatorFeedKeywordIds([]);
    setOperatorFeedImages([]);
    setOperatorFeedLoadError('');
    setIsLoadingOperatorFeedKeywords(false);
    setIsSubmittingOperatorFeed(false);
    setOperatorChatRooms([]);
    setOperatorChatReactions([]);
    setOperatorChatMessages([]);
    setOperatorChatUser(null);
    setSelectedOperatorChatRoomId(null);
    setOperatorChatDraftMessage('');
    setOperatorChatLoadError('');
    setIsLoadingOperatorChats(false);
    setIsLoadingOperatorMessages(false);
    setStartingOperatorReactionId(null);
    setIsSendingOperatorChatMessage(false);
    setExpiringOperatorChatRoomId(null);
    setIsResetConfirmOpen(false);
    setIsResettingRecommendations(false);
  };

  const handleApplyStatus = async (item: AdminReportListItemDto) => {
    const nextStatus = draftStatuses[item.reportId] ?? item.status;

    if (nextStatus === item.status) {
      return;
    }

    setUpdatingReportId(item.reportId);

    try {
      const data = await adminRequest<AdminReportUpdateResultDto>(`/api/admin/reports/${item.reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      setReports((prevReports) => prevReports.map((report) => (
        report.reportId === item.reportId ? data.report : report
      )));
      setDraftStatuses((prev) => ({ ...prev, [item.reportId]: data.report.status }));
      await loadReports(filterStatus);
      showToast('신고 상태를 변경했어요.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '신고 상태를 변경하지 못했어요.', 'error');
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleApplyAction = async (item: AdminReportListItemDto, action: AdminReportAction) => {
    const actionKey = `${item.reportId}:${action}`;
    setRunningActionKey(actionKey);

    try {
      const data = await adminRequest<AdminReportActionResultDto>(`/api/admin/reports/${item.reportId}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });

      setReports((prevReports) => prevReports.map((report) => (
        report.reportId === item.reportId ? data.report : report
      )));
      setDraftStatuses((prev) => ({ ...prev, [item.reportId]: data.report.status }));
      await loadReports(filterStatus);
      showToast(`${ACTION_LABELS[action]} 조치를 적용했어요.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '신고 조치를 적용하지 못했어요.', 'error');
    } finally {
      setRunningActionKey(null);
      setActionTarget(null);
    }
  };

  const handleApplyInquiryStatus = async (item: AdminSupportInquiryDto) => {
    const nextStatus = inquiryDraftStatuses[item.id] ?? item.status;

    if (nextStatus === item.status || nextStatus === 'received') {
      return;
    }

    setUpdatingInquiryId(item.id);

    try {
      const data = await adminRequest<AdminSupportInquiryDto>(`/api/admin/support-inquiries/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      setInquiries((prevInquiries) => prevInquiries.map((inquiry) => (
        inquiry.id === item.id
          ? {
            ...inquiry,
            status: data.status,
            updatedAt: data.updatedAt,
          }
          : inquiry
      )));
      setInquiryDraftStatuses((prev) => ({ ...prev, [item.id]: data.status }));
      await loadInquiries(inquiryFilterStatus);
      showToast('문의 상태를 변경했어요.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '문의 상태를 변경하지 못했어요.', 'error');
    } finally {
      setUpdatingInquiryId(null);
    }
  };

  const handleApplyInquiryNickname = async (item: AdminSupportInquiryDto) => {
    const nextNickname = (inquiryNicknameDrafts[item.id] ?? '').trim();

    if (!item.user) {
      showToast('문의자 계정을 찾을 수 없어요.', 'error');
      return;
    }

    if (nextNickname.length < 2 || nextNickname.length > 50) {
      showToast('닉네임은 2자 이상 50자 이하여야 합니다.', 'error');
      return;
    }

    if (nextNickname === item.user.nickname) {
      return;
    }

    setUpdatingNicknameInquiryId(item.id);

    try {
      const data = await adminRequest<AdminSupportInquiryDto>(`/api/admin/support-inquiries/${item.id}/nickname`, {
        method: 'PATCH',
        body: JSON.stringify({ nickname: nextNickname }),
      });

      setInquiries((prevInquiries) => prevInquiries.map((inquiry) => (
        inquiry.id === item.id ? data : inquiry
      )));
      setInquiryNicknameDrafts((prev) => ({ ...prev, [item.id]: data.user?.nickname ?? nextNickname }));
      showToast('닉네임을 변경했어요.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '닉네임을 변경하지 못했어요.', 'error');
    } finally {
      setUpdatingNicknameInquiryId(null);
    }
  };

  const handleWithdrawInquiryUser = async (item: AdminSupportInquiryDto) => {
    if (!item.user) {
      showToast('문의자 계정을 찾을 수 없어요.', 'error');
      return;
    }

    if (item.user.status === 'withdrawn' || item.user.deletedAt) {
      showToast('이미 탈퇴 처리된 계정입니다.', 'info');
      return;
    }

    setWithdrawingInquiryId(item.id);

    try {
      const data = await adminRequest<AdminSupportInquiryDto>(`/api/admin/support-inquiries/${item.id}/withdraw-user`, {
        method: 'PATCH',
      });

      setInquiries((prevInquiries) => prevInquiries.map((inquiry) => (
        inquiry.id === item.id ? data : inquiry
      )));
      setInquiryNicknameDrafts((prev) => ({ ...prev, [item.id]: data.user?.nickname ?? '' }));
      setInquiryDraftStatuses((prev) => ({ ...prev, [item.id]: data.status }));
      await loadInquiries(inquiryFilterStatus);
      showToast('문의자 계정을 탈퇴 처리했어요.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '문의자 계정을 탈퇴 처리하지 못했어요.', 'error');
    } finally {
      setWithdrawingInquiryId(null);
      setWithdrawalTarget(null);
    }
  };

  const toggleOperatorFeedKeyword = (keywordId: number) => {
    setOperatorFeedKeywordIds((prevIds) => (
      prevIds.includes(keywordId)
        ? prevIds.filter((id) => id !== keywordId)
        : [...prevIds, keywordId]
    ));
  };

  const handleOperatorFeedImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'));
    const nextFiles = files.slice(0, 4);

    if (files.length > 4) {
      showToast('이미지는 최대 4장까지 첨부할 수 있어요.', 'error');
    }

    setOperatorFeedImages(nextFiles);
  };

  const handleSubmitOperatorFeed = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = operatorFeedText.trim();
    if (!text) {
      showToast('운영자 피드 본문을 입력해주세요.', 'error');
      return;
    }

    if (text.length > 200) {
      showToast('피드 본문은 200자 이하로 입력해주세요.', 'error');
      return;
    }

    if (operatorFeedKeywordIds.length === 0) {
      showToast('피드 키워드를 1개 이상 선택해주세요.', 'error');
      return;
    }

    setIsSubmittingOperatorFeed(true);

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('feedKeywordIds', JSON.stringify(operatorFeedKeywordIds));
      for (const image of operatorFeedImages) {
        formData.append('images', image);
      }

      const data = await adminRequest<AdminOperatorFeedResultDto>('/api/admin/operator/feed', {
        method: 'POST',
        body: formData,
      });

      setOperatorFeedText('');
      setOperatorFeedImages([]);
      showToast(`${data.operator.nickname} 피드를 올렸어요.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '운영자 피드를 올리지 못했어요.', 'error');
    } finally {
      setIsSubmittingOperatorFeed(false);
    }
  };

  const handleStartOperatorReactionChat = async (reaction: AdminOperatorReactionDto) => {
    setStartingOperatorReactionId(reaction.commentId);

    try {
      const data = await adminRequest<AdminOperatorChatStartDto>(
        `/api/admin/operator/chat/reactions/${reaction.commentId}/start`,
        { method: 'POST' },
      );

      setOperatorChatUser(data.operator);
      setSelectedOperatorChatRoomId(data.chatRoomId);
      await loadOperatorChats();
      await loadOperatorChatMessages(data.chatRoomId);
      showToast(`${reaction.commenter.nickname}님과 채팅을 열었어요.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '운영자 채팅을 열지 못했어요.', 'error');
    } finally {
      setStartingOperatorReactionId(null);
    }
  };

  const handleSelectOperatorChatRoom = async (roomId: number) => {
    if (selectedOperatorChatRoomId === roomId && operatorChatMessages.length > 0) {
      return;
    }

    await loadOperatorChatMessages(roomId);
  };

  const handleSendOperatorChatMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = operatorChatDraftMessage.trim();
    if (!selectedOperatorChatRoomId) {
      showToast('채팅방을 먼저 선택해주세요.', 'error');
      return;
    }

    if (!content) {
      return;
    }

    setIsSendingOperatorChatMessage(true);

    try {
      const data = await adminRequest<AdminOperatorChatSendDto>(
        `/api/admin/operator/chat/rooms/${selectedOperatorChatRoomId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        },
      );

      setOperatorChatUser(data.operator);
      setOperatorChatMessages((prevMessages) => [...prevMessages, data.message]);
      setOperatorChatDraftMessage('');
      await loadOperatorChats();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '운영자 채팅 메시지를 보내지 못했어요.', 'error');
    } finally {
      setIsSendingOperatorChatMessage(false);
    }
  };

  const handleExpireOperatorChatRoom = async () => {
    if (!selectedOperatorChatRoom) {
      return;
    }

    setExpiringOperatorChatRoomId(selectedOperatorChatRoom.roomId);

    try {
      const data = await adminRequest<AdminOperatorChatExpireDto>(
        `/api/admin/operator/chat/rooms/${selectedOperatorChatRoom.roomId}/expire`,
        { method: 'POST' },
      );

      setOperatorChatUser(data.operator);
      setOperatorChatRooms((prevRooms) => prevRooms.map((room) => (
        room.roomId === data.room.roomId ? data.room : room
      )));
      await loadOperatorChats();
      showToast('운영자 채팅방을 만료 처리했어요.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '운영자 채팅방을 만료 처리하지 못했어요.', 'error');
    } finally {
      setExpiringOperatorChatRoomId(null);
    }
  };

  const handleResetRecommendations = async () => {
    setIsResettingRecommendations(true);

    try {
      const data = await adminRequest<AdminRecommendationResetResultDto>('/api/admin/recommendations/reset', {
        method: 'POST',
      });
      const deletedCount = Object.values(data.deleted).reduce((sum, count) => sum + count, 0);

      await loadReports(filterStatus);
      showToast(`추천 데이터를 초기화했어요. 삭제된 데이터 ${deletedCount}건`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '추천 데이터를 초기화하지 못했어요.', 'error');
    } finally {
      setIsResettingRecommendations(false);
      setIsResetConfirmOpen(false);
    }
  };

  const handleToggleMaintenanceMode = async () => {
    const nextEnabled = !(maintenanceMode?.enabled ?? false);
    setIsUpdatingMaintenanceMode(true);

    try {
      const data = await adminRequest<AdminMaintenanceModeDto>('/api/admin/maintenance', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: nextEnabled }),
      });

      setMaintenanceMode(data);
      showToast(nextEnabled ? '서버 점검 화면을 켰어요.' : '서버 점검 화면을 껐어요.', 'success');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      showToast(error instanceof Error ? error.message : '점검 모드를 변경하지 못했어요.', 'error');
    } finally {
      setIsUpdatingMaintenanceMode(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-pink-cta)]" aria-label="불러오는 중" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPanel
        code={code}
        errorMessage={loginError}
        isSubmitting={isLoginSubmitting}
        onCodeChange={setCode}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] px-4 py-4 shadow-[0_3px_10px_rgba(34,34,34,0.045)]">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">관리자</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">운영 관리</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-9 items-center rounded-2xl border px-3 text-sm font-bold ${
              maintenanceMode?.enabled
                ? 'border-[color-mix(in_srgb,var(--color-pink-cta)_36%,var(--color-border))] bg-[var(--color-error-bg)] text-[var(--color-error)]'
                : 'border-[var(--color-border)] bg-[var(--color-chip-background)] text-[var(--color-text-secondary)]'
            }`}>
              {maintenanceMode?.enabled ? '점검 ON' : '점검 OFF'}
            </span>
            <Button
              type="button"
              variant={maintenanceMode?.enabled ? 'danger' : 'secondary'}
              size="sm"
              loading={isLoadingMaintenanceMode || isUpdatingMaintenanceMode}
              onClick={() => void handleToggleMaintenanceMode()}
            >
              {maintenanceMode?.enabled ? '서버점검 끄기' : '서버점검 켜기'}
            </Button>
            {SHOW_RECOMMENDATION_RESET_BUTTON && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={isResettingRecommendations}
                disabled={isLoadingReports || isLoadingInquiries || isLoadingOperatorFeedKeywords || isSubmittingOperatorFeed}
                onClick={() => setIsResetConfirmOpen(true)}
              >
                추천 초기화
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={isActiveSectionLoading}
              onClick={refreshActiveSection}
            >
              새로고침
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleLogout()}>
              나가기
            </Button>
          </div>
        </header>

        <section className="grid gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] p-2 sm:grid-cols-4">
          {ADMIN_SECTIONS.map((section) => {
            const isSelected = activeSection === section.value;

            return (
              <button
                key={section.value}
                type="button"
                onClick={() => setActiveSection(section.value)}
                className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                  isSelected
                    ? 'bg-[var(--color-pink-cta)] text-white shadow-[0_3px_10px_rgba(34,34,34,0.08)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </section>

        {activeSection === 'reports' && (
          <>
        <section className="grid gap-2 sm:grid-cols-5">
          {STATUS_FILTERS.map((status) => {
            const count = status.value === 'all' ? summary?.total : summary?.[status.value];
            const isSelected = filterStatus === status.value;

            return (
              <button
                key={status.value}
                type="button"
                onClick={() => setFilterStatus(status.value)}
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  isSelected
                    ? 'border-[var(--color-pink-cta)] bg-[var(--color-surface)] shadow-[0_3px_10px_rgba(34,34,34,0.06)]'
                    : 'border-[var(--color-border-light)] bg-[var(--color-surface)] hover:border-[var(--color-border)]'
                }`}
              >
                <p className="text-xs font-semibold text-[var(--color-text-secondary)]">{status.label}</p>
                <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{count ?? 0}</p>
              </button>
            );
          })}
        </section>

        <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">신고 목록</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{filteredCountLabel}</p>
            </div>
          </div>

          <div className="space-y-3 p-3 sm:p-4">
            {isLoadingReports ? (
              <div className="py-16 text-center text-sm font-medium text-[var(--color-text-secondary)]">
                불러오는 중이에요
              </div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-base font-bold text-[var(--color-text-primary)]">표시할 신고가 없어요</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">선택한 상태의 신고가 없습니다.</p>
              </div>
            ) : (
              reports.map((item) => (
                <ReportItem
                  key={item.reportId}
                  item={item}
                  draftStatus={draftStatuses[item.reportId] ?? item.status}
                  isUpdating={updatingReportId === item.reportId}
                  runningAction={
                    runningActionKey?.startsWith(`${item.reportId}:`)
                      ? runningActionKey.split(':')[1] as AdminReportAction
                      : null
                  }
                  onDraftChange={(status) => setDraftStatuses((prev) => ({ ...prev, [item.reportId]: status }))}
                  onApply={() => void handleApplyStatus(item)}
                  onAction={(action) => setActionTarget({ item, action })}
                />
              ))
            )}
          </div>
        </section>
          </>
        )}

        {activeSection === 'operator-feed' && (
          <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">운영자 피드 작성</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">인제우리 우곰이 명의로 지금우리 피드를 게시합니다.</p>
              </div>
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-xs font-bold text-[var(--color-text-secondary)]">
                이미지 {operatorFeedImageCountLabel}
              </span>
            </div>

            <form onSubmit={handleSubmitOperatorFeed} className="grid gap-4 p-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[var(--color-text-primary)]">본문</span>
                <textarea
                  value={operatorFeedText}
                  onChange={(event) => setOperatorFeedText(event.target.value.slice(0, 200))}
                  rows={5}
                  placeholder="인스타 홍보, 이벤트 안내 등 게시할 내용을 입력하세요."
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/15"
                />
                <span className="mt-1 block text-right text-xs text-[var(--color-text-tertiary)]">{operatorFeedText.length}/200</span>
              </label>

              <div>
                <p className="mb-2 text-sm font-bold text-[var(--color-text-primary)]">키워드</p>
                {isLoadingOperatorFeedKeywords ? (
                  <div className="rounded-lg bg-[var(--color-surface-secondary)] px-4 py-6 text-center text-sm font-medium text-[var(--color-text-secondary)]">
                    키워드를 불러오는 중이에요
                  </div>
                ) : operatorFeedLoadError ? (
                  <div className="rounded-lg bg-[#FFF1F6] px-4 py-3 text-sm font-medium text-[#9A3155]">
                    {operatorFeedLoadError}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {operatorFeedKeywords.map((keyword) => {
                      const isSelected = operatorFeedKeywordIds.includes(keyword.feedKeywordId);

                      return (
                        <button
                          key={keyword.feedKeywordId}
                          type="button"
                          onClick={() => toggleOperatorFeedKeyword(keyword.feedKeywordId)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            isSelected
                              ? 'border-[var(--color-pink-cta)] bg-[var(--color-brand-pink)] text-[var(--color-pink-cta)]'
                              : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'
                          }`}
                        >
                          {keyword.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[var(--color-text-primary)]">이미지</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleOperatorFeedImageChange}
                  className="block w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-surface-secondary)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-text-primary)]"
                />
                {operatorFeedImages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {operatorFeedImages.map((image) => (
                      <span key={`${image.name}-${image.size}`} className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                        {image.name}
                      </span>
                    ))}
                  </div>
                )}
              </label>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={isSubmittingOperatorFeed}
                  disabled={isLoadingOperatorFeedKeywords || Boolean(operatorFeedLoadError)}
                >
                  피드 올리기
                </Button>
              </div>
            </form>
          </section>
        )}

        {activeSection === 'operator-chat' && (
          <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">운영자 채팅</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {operatorChatUser
                    ? `${operatorChatUser.nickname} 계정으로 문의성 반응에 답장합니다.`
                    : '운영자 계정으로 지금우리 피드 반응 문의를 받습니다.'}
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-xs font-bold text-[var(--color-text-secondary)]">
                채팅 {operatorChatRooms.length}개
              </span>
            </div>

            {operatorChatLoadError ? (
              <div className="py-16 text-center">
                <p className="text-base font-bold text-[var(--color-text-primary)]">운영자 채팅을 불러오지 못했어요</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{operatorChatLoadError}</p>
              </div>
            ) : (
              <div className="grid min-w-0 gap-4 p-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                <div className="min-w-0 space-y-4">
                  <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--color-border-light)]">
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-light)] px-3 py-2">
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">새 문의 반응</h3>
                      <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">{unresolvedOperatorReactions.length}건</span>
                    </div>
                    <div className="max-h-[320px] space-y-2 overflow-y-auto p-3">
                      {isLoadingOperatorChats ? (
                        <p className="py-8 text-center text-sm font-medium text-[var(--color-text-secondary)]">불러오는 중이에요</p>
                      ) : unresolvedOperatorReactions.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">대기 중인 반응이 없어요</p>
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">하트 반응이 들어오면 여기서 채팅을 열 수 있어요.</p>
                        </div>
                      ) : (
                        unresolvedOperatorReactions.map((reaction) => (
                          <article key={reaction.commentId} className="min-w-0 rounded-lg bg-[var(--color-surface-secondary)] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{reaction.commenter.nickname}</p>
                                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{formatDateTime(reaction.createdAt)}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                loading={startingOperatorReactionId === reaction.commentId}
                                onClick={() => void handleStartOperatorReactionChat(reaction)}
                              >
                                채팅 열기
                              </Button>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-text-primary)]">
                              {reaction.content.trim() || '하트 반응'}
                            </p>
                            <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-[var(--color-text-secondary)]">
                              피드: {reaction.feed.text}
                            </p>
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--color-border-light)]">
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-light)] px-3 py-2">
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">채팅방</h3>
                      <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">{operatorChatRooms.length}개</span>
                    </div>
                    <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
                      {isLoadingOperatorChats ? (
                        <p className="py-8 text-center text-sm font-medium text-[var(--color-text-secondary)]">불러오는 중이에요</p>
                      ) : operatorChatRooms.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">열린 채팅방이 없어요</p>
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">새 문의 반응에서 채팅을 열어주세요.</p>
                        </div>
                      ) : (
                        operatorChatRooms.map((room) => {
                          const isSelected = selectedOperatorChatRoomId === room.roomId;
                          const isClosed = room.status !== 'active';
                          const preview = room.lastMessage
                            ? room.lastMessage.type === 'image'
                              ? '이미지 메시지'
                              : room.lastMessage.content
                            : '아직 메시지가 없어요';

                          return (
                            <button
                              key={room.roomId}
                              type="button"
                              onClick={() => void handleSelectOperatorChatRoom(room.roomId)}
                              className={`block w-full min-w-0 overflow-hidden rounded-lg border p-3 text-left transition ${
                                isSelected
                                  ? 'border-[var(--color-pink-cta)] bg-[var(--color-brand-pink)]'
                                  : 'border-[var(--color-border-light)] bg-white hover:border-[var(--color-border)]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-sm font-bold text-[var(--color-text-primary)]">
                                  {room.otherUser?.nickname ?? '알 수 없는 사용자'}
                                </p>
                                {room.unreadCount > 0 && (
                                  <span className="shrink-0 rounded-full bg-[var(--color-pink-cta)] px-2 py-0.5 text-[11px] font-bold text-white">
                                    {room.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 line-clamp-2 min-w-0 break-words text-xs leading-5 text-[var(--color-text-secondary)]">{preview}</p>
                              <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
                                {isClosed ? '닫힘' : '만료'} {formatDateTime(room.expiresAt)}
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>

                <div className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--color-border-light)]">
                  {selectedOperatorChatRoom ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">
                            {selectedOperatorChatRoom.otherUser?.nickname ?? '알 수 없는 사용자'}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                            {selectedOperatorChatRoom.status === 'active' ? '운영자 계정으로 답장 중' : '닫힌 채팅방'}
                            {' · '}
                            {selectedOperatorChatRoom.status === 'active' ? '만료' : '닫힘'} {formatDateTime(selectedOperatorChatRoom.expiresAt)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={expiringOperatorChatRoomId === selectedOperatorChatRoom.roomId}
                          disabled={selectedOperatorChatRoom.status !== 'active'}
                          onClick={() => void handleExpireOperatorChatRoom()}
                        >
                          만료
                        </Button>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-surface-secondary)] p-4">
                        {isLoadingOperatorMessages ? (
                          <p className="py-16 text-center text-sm font-medium text-[var(--color-text-secondary)]">메시지를 불러오는 중이에요</p>
                        ) : operatorChatMessages.length === 0 ? (
                          <div className="py-16 text-center">
                            <p className="text-sm font-bold text-[var(--color-text-primary)]">아직 메시지가 없어요</p>
                            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">아래 입력창에서 먼저 안내 메시지를 보낼 수 있어요.</p>
                          </div>
                        ) : (
                          operatorChatMessages.map((message) => {
                            const isMine = operatorChatUser?.userId === message.sender_user_id;
                            const messageContent = message.type === 'image' ? '이미지 메시지' : message.content;

                            return (
                              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[78%] rounded-lg px-3 py-2 ${
                                  isMine
                                    ? 'bg-[var(--color-pink-cta)] text-white'
                                    : 'bg-white text-[var(--color-text-primary)]'
                                }`}
                                >
                                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{messageContent}</p>
                                  <p className={`mt-1 text-[11px] ${isMine ? 'text-white/75' : 'text-[var(--color-text-tertiary)]'}`}>
                                    {formatDateTime(message.created_at)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <form onSubmit={handleSendOperatorChatMessage} className="flex gap-2 border-t border-[var(--color-border-light)] p-3">
                        <input
                          value={operatorChatDraftMessage}
                          onChange={(event) => setOperatorChatDraftMessage(event.target.value)}
                          placeholder={selectedOperatorChatRoom.status === 'active' ? '문의 답장을 입력하세요.' : '닫힌 채팅방에는 답장할 수 없어요.'}
                          disabled={selectedOperatorChatRoom.status !== 'active'}
                          className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/15"
                        />
                        <Button
                          type="submit"
                          loading={isSendingOperatorChatMessage}
                          disabled={selectedOperatorChatRoom.status !== 'active' || !operatorChatDraftMessage.trim() || isLoadingOperatorMessages}
                        >
                          보내기
                        </Button>
                      </form>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-8 text-center">
                      <div>
                        <p className="text-base font-bold text-[var(--color-text-primary)]">채팅방을 선택해주세요</p>
                        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                          여러 사용자와 열린 채팅방을 왼쪽 목록에서 전환하며 답장할 수 있어요.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === 'support' && (
          <>
            <section className="grid gap-2 sm:grid-cols-4">
              {INQUIRY_STATUS_FILTERS.map((status) => {
                const isSelected = inquiryFilterStatus === status.value;

                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setInquiryFilterStatus(status.value)}
                    className={`rounded-lg border px-3 py-3 text-left transition ${
                      isSelected
                        ? 'border-[var(--color-pink-cta)] bg-[var(--color-surface)] shadow-[0_3px_10px_rgba(34,34,34,0.06)]'
                        : 'border-[var(--color-border-light)] bg-[var(--color-surface)] hover:border-[var(--color-border)]'
                    }`}
                  >
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)]">{status.label}</p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                      {isSelected ? inquiryCountLabel : '보기'}
                    </p>
                  </button>
                );
              })}
            </section>

            <section className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-3">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">문의 목록</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{inquiryCountLabel}</p>
                </div>
              </div>

              <div className="space-y-3 p-3 sm:p-4">
                {isLoadingInquiries ? (
                  <div className="py-16 text-center text-sm font-medium text-[var(--color-text-secondary)]">
                    불러오는 중이에요
                  </div>
                ) : inquiryLoadError ? (
                  <div className="py-16 text-center">
                    <p className="text-base font-bold text-[var(--color-text-primary)]">문의 목록을 불러오지 못했어요</p>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{inquiryLoadError}</p>
                  </div>
                ) : inquiries.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-base font-bold text-[var(--color-text-primary)]">표시할 문의가 없어요</p>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">선택한 상태의 문의가 없습니다.</p>
                  </div>
                ) : (
                  inquiries.map((item) => (
                    <InquiryItem
                      key={item.id}
                      item={item}
                      draftStatus={inquiryDraftStatuses[item.id] ?? item.status}
                      nicknameDraft={inquiryNicknameDrafts[item.id] ?? item.user?.nickname ?? ''}
                      isUpdating={updatingInquiryId === item.id}
                      isUpdatingNickname={updatingNicknameInquiryId === item.id}
                      isWithdrawingUser={withdrawingInquiryId === item.id}
                      onDraftChange={(status) => setInquiryDraftStatuses((prev) => ({ ...prev, [item.id]: status }))}
                      onNicknameDraftChange={(nickname) => setInquiryNicknameDrafts((prev) => ({ ...prev, [item.id]: nickname }))}
                      onApply={() => void handleApplyInquiryStatus(item)}
                      onNicknameApply={() => void handleApplyInquiryNickname(item)}
                      onWithdrawUser={() => setWithdrawalTarget(item)}
                    />
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <ConfirmSheet
        isOpen={withdrawalTarget !== null}
        onClose={() => {
          if (withdrawingInquiryId === null) {
            setWithdrawalTarget(null);
          }
        }}
        onConfirm={() => {
          if (withdrawalTarget) {
            void handleWithdrawInquiryUser(withdrawalTarget);
          }
        }}
        title="문의자 계정을 탈퇴 처리할까요?"
        description={withdrawalTarget?.user ? `${withdrawalTarget.user.nickname} 계정은 withdrawn 상태가 되고 현재 세션이 삭제됩니다. DB 행은 보관됩니다.` : '문의자 계정을 찾을 수 없습니다.'}
        confirmText="탈퇴 처리"
        cancelText="취소"
        destructive
      />

      <ConfirmSheet
        isOpen={SHOW_RECOMMENDATION_RESET_BUTTON && isResetConfirmOpen}
        onClose={() => {
          if (!isResettingRecommendations) {
            setIsResetConfirmOpen(false);
          }
        }}
        onConfirm={() => void handleResetRecommendations()}
        title="추천 데이터를 초기화할까요?"
        description="채팅방, 호감, 오늘우리 추천, 추천 제외 설정, 추천 생성 기록이 삭제돼요. 배포 전 테스트 데이터 초기화가 필요할 때만 실행해주세요."
        confirmText="추천 초기화"
        cancelText="취소"
        destructive
      />

      <ConfirmSheet
        isOpen={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        onConfirm={() => {
          if (actionTarget) {
            void handleApplyAction(actionTarget.item, actionTarget.action);
          }
        }}
        title={actionTarget ? `${ACTION_LABELS[actionTarget.action]} 조치를 적용할까요?` : '조치를 적용할까요?'}
        description={
          actionTarget
            ? `${getTargetDisplayName(actionTarget.item)} 신고에 적용됩니다. ${ACTION_DESCRIPTIONS[actionTarget.action]}`
            : undefined
        }
        confirmText={actionTarget ? `${ACTION_LABELS[actionTarget.action]} 적용` : '적용'}
        cancelText="취소"
        destructive
      />
    </main>
  );
}
