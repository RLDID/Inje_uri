'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  emoji?: string;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected = false, emoji, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`
          inline-flex max-w-full items-center gap-1.5
          min-h-9 rounded-full border px-3.5 py-2 text-left text-sm leading-5 font-medium whitespace-normal break-keep
          transition-all duration-150
          ${selected
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'}
          disabled:cursor-not-allowed disabled:opacity-50
          ${className}
        `}
        {...props}
      >
        {emoji && <span className="text-base">{emoji}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

Chip.displayName = 'Chip';
