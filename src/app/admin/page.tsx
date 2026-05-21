'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfirmSheet, useToast } from '@/components/ui';
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
} from '@/lib/types';

const STATUS_FILTERS: Array<{ value: AdminReportStatusFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'reviewed', label: '검토' },
  { value: 'actioned', label: '조치' },
  { value: 'dismissed', label: '기각' },
];

const REPORT_STATUSES: Array<{ value: AdminReportStatus; label: string }> = [
  { value: 'pending', label: '대기' },
  { value: 'reviewed', label: '검토' },
  { value: 'actioned', label: '조치' },
  { value: 'dismissed', label: '기각' },
];

const TARGET_LABELS: Record<string, string> = {
  user: '사용자',
  feed: '피드',
  feed_comment: '댓글',
  chat_room: '채팅방',
  message: '메시지',
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

  if (init.body && !headers.has('Content-Type')) {
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
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">신고 관리</h1>
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
          <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
            {getTargetLabel(item.target.type)} #{item.target.id}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">사유: {item.reasonType}</p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">검토: {formatDateTime(item.reviewedAt)}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)]">상세</p>
          <p className="mt-1 min-h-10 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-text-primary)]">
            {item.description?.trim() || '상세 설명 없음'}
          </p>
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

export default function AdminPage() {
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AdminReportStatusFilter>('pending');
  const [reports, setReports] = useState<AdminReportListItemDto[]>([]);
  const [summary, setSummary] = useState<AdminReportListDto['summary'] | null>(null);
  const [draftStatuses, setDraftStatuses] = useState<Record<number, AdminReportStatus>>({});
  const [updatingReportId, setUpdatingReportId] = useState<number | null>(null);
  const [runningActionKey, setRunningActionKey] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ item: AdminReportListItemDto; action: AdminReportAction } | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

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

  useEffect(() => {
    void loadReports(filterStatus);
  }, [filterStatus, loadReports]);

  const filteredCountLabel = useMemo(() => {
    if (!summary) {
      return '0건';
    }

    if (filterStatus === 'all') {
      return `${summary.total}건`;
    }

    return `${summary[filterStatus]}건`;
  }, [filterStatus, summary]);

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
      await loadReports(filterStatus);
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
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">신고 관리</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" loading={isLoadingReports} onClick={() => void loadReports(filterStatus)}>
              새로고침
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleLogout()}>
              나가기
            </Button>
          </div>
        </header>

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
      </div>

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
            ? `${getTargetLabel(actionTarget.item.target.type)} #${actionTarget.item.target.id} 신고에 적용됩니다. ${ACTION_DESCRIPTIONS[actionTarget.action]}`
            : undefined
        }
        confirmText={actionTarget ? `${ACTION_LABELS[actionTarget.action]} 적용` : '적용'}
        cancelText="취소"
        destructive
      />
    </main>
  );
}
