'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-dark)] active:bg-[var(--color-primary-dark)] disabled:border-transparent disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] disabled:shadow-none disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 focus-visible:ring-offset-2',
  secondary:
    'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-primary-light)] active:bg-[var(--color-primary-light)] disabled:border-[var(--color-border-light)] disabled:bg-[var(--color-surface-secondary)] disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 focus-visible:ring-offset-2',
  tertiary:
    'border border-transparent bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 active:bg-[var(--color-primary)]/15 disabled:bg-[var(--color-surface-secondary)] disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 focus-visible:ring-offset-2',
  danger:
    'border border-transparent bg-[var(--color-error)] text-white hover:brightness-95 active:brightness-95 disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--color-error)]/30 focus-visible:ring-offset-2',
  ghost:
    'border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)] disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 focus-visible:ring-offset-2',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 py-2 text-sm rounded-xl',
  md: 'min-h-12 px-4 py-3 text-sm rounded-xl',
  lg: 'min-h-14 px-6 py-4 text-base rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center text-center font-semibold leading-5 tracking-[-0.01em] whitespace-normal break-keep
          transition-colors duration-150 ease-in-out
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${loading ? 'cursor-wait' : ''}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z" />
            </svg>
            <span>처리 중...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
