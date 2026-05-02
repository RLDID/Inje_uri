'use client';

import { ReactNode } from 'react';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'h-9 text-sm',
    md: 'h-11 text-base',
  };

  return (
    <div
      className={`
        inline-flex rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-secondary)] p-1
        ${className}
      `}
      role="tablist"
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={`
              flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 font-semibold tracking-[-0.01em]
              transition-all duration-200 ease-out
              ${sizeStyles[size]}
              ${isSelected
                ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            {option.icon && <span className={isSelected ? 'text-[var(--color-primary)]' : ''}>{option.icon}</span>}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export type { SegmentOption };
