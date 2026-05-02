import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const SparkleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-primary)]">
    <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const HeartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-secondary)]">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ChatIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-primary)]">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CameraIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-primary)]">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-tertiary)]">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="section-card flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-5 flex h-18 w-18 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">{title}</h3>
      {description && <p className="mb-6 max-w-[280px] text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>}
      {action}
    </div>
  );
}

export function NoRecommendationsLeft() {
  return (
    <EmptyState
      icon={<SparkleIcon />}
      title="오늘의 추천을 모두 확인했어요"
      description="내일 열리는 새로운 추천을 기다려보세요."
    />
  );
}

export function NoInterests() {
  return (
    <EmptyState
      icon={<HeartIcon />}
      title="아직 호감 표시가 없어요"
      description="프로필을 조금 더 정리해두면 반응이 달라질 수 있어요."
    />
  );
}

export function NoChats() {
  return (
    <EmptyState
      icon={<ChatIcon />}
      title="아직 대화가 없어요"
      description="마음이 가는 상대에게 먼저 반응을 보내보세요."
    />
  );
}

export function NoStories() {
  return (
    <EmptyState
      icon={<CameraIcon />}
      title="지금 올라온 피드가 없어요"
      description="첫 글을 올리면 여기에서 바로 볼 수 있어요."
    />
  );
}

export function ChatLimitReached() {
  return (
    <EmptyState
      icon={<LockIcon />}
      title="채팅방이 가득 찼어요"
      description="기존 대화를 정리한 뒤 다시 시도해주세요."
    />
  );
}
