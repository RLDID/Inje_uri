interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`skeleton rounded-lg ${className}`} />
  );
}

// Profile card skeleton
export function ProfileCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden shadow-md">
      <LoadingSkeleton className="aspect-[3/4] w-full" />
      <div className="p-4 space-y-3">
        <LoadingSkeleton className="h-6 w-32" />
        <LoadingSkeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <LoadingSkeleton className="h-8 w-20 rounded-full" />
          <LoadingSkeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Chat list skeleton
export function ChatListSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <LoadingSkeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton className="h-5 w-24" />
            <LoadingSkeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Story card skeleton
export function StoryCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 w-20">
      <LoadingSkeleton className="w-16 h-16 rounded-full" />
      <LoadingSkeleton className="h-3 w-12" />
    </div>
  );
}

// Interest card skeleton
export function InterestCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--color-surface)] rounded-2xl">
      <LoadingSkeleton className="w-16 h-16 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton className="h-5 w-28" />
        <LoadingSkeleton className="h-4 w-40" />
      </div>
      <LoadingSkeleton className="h-10 w-20 rounded-xl" />
    </div>
  );
}

// Full page loading
export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--color-text-secondary)]">로딩 중...</p>
      </div>
    </div>
  );
}
