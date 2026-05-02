import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  withBottomNav?: boolean;
}

export function PageContainer({ children, className = '', withBottomNav = true }: PageContainerProps) {
  return (
    <div
      className={`
        app-container
        ${withBottomNav ? 'page-with-nav' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, action, showBack = false, onBack }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]/92 backdrop-blur-xl">
      <div className="flex min-h-16 items-start justify-between gap-3 px-[var(--page-padding-x)] py-3">
        <div className="flex min-w-0 items-start gap-3">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 -ml-2 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
              aria-label="이전으로"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-[18px] leading-6 font-semibold tracking-[-0.02em] break-keep text-[var(--color-text-primary)]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-xs leading-5 break-keep text-[var(--color-text-secondary)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action && <div className="flex shrink-0 items-start pt-0.5">{action}</div>}
      </div>
    </header>
  );
}

interface PageContentProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContent({ children, className = '', noPadding = false }: PageContentProps) {
  return (
    <main
      className={`
        ${noPadding ? '' : 'px-[var(--page-padding-x)] py-[var(--space-section)]'}
        ${className}
      `}
    >
      {children}
    </main>
  );
}

interface PageSectionProps {
  children: ReactNode;
  className?: string;
}

export function PageSection({ children, className = '' }: PageSectionProps) {
  return <section className={`section-card p-5 ${className}`}>{children}</section>;
}

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
  className?: string;
}

export function SectionHeading({
  title,
  description,
  action,
  eyebrow,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`mobile-split-row ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] break-keep text-[var(--color-text-primary)]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 break-keep text-[var(--color-text-secondary)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
}
