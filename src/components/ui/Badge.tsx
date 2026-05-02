import { HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  category?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'border border-[var(--color-border-light)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]',
  primary: 'border border-[var(--color-primary)]/10 bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  secondary: 'border border-[var(--color-secondary)]/10 bg-[var(--color-secondary-light)] text-[var(--color-secondary)]',
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border border-[var(--color-secondary)]/10 bg-[var(--color-secondary-light)] text-[var(--color-secondary)]',
  error: 'border border-rose-200 bg-rose-50 text-rose-700',
  info: 'border border-sky-200 bg-sky-50 text-sky-700',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-3.5 py-1.5 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'sm', category, className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex max-w-full items-center justify-center rounded-full text-center font-semibold leading-[1.25] tracking-[-0.01em] whitespace-normal break-keep
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {category && <span className="mr-1.5 text-[var(--color-text-tertiary)]">{category}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

interface CategoryBadgeGroupProps {
  category: string;
  items: string[];
  variant?: BadgeVariant;
  size?: BadgeSize;
  maxDisplay?: number;
}

export function CategoryBadgeGroup({
  category,
  items,
  variant = 'default',
  size = 'md',
  maxDisplay,
}: CategoryBadgeGroupProps) {
  const displayItems = maxDisplay ? items.slice(0, maxDisplay) : items;
  const remainingCount = maxDisplay ? items.length - maxDisplay : 0;

  if (items.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">{category}</span>
      <div className="chip-wrap">
        {displayItems.map((item, index) => (
          <Badge key={index} variant={variant} size={size}>
            {item}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="default" size={size}>
            +{remainingCount}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface CountBadgeProps {
  count: number;
  max?: number;
}

export function CountBadge({ count, max = 99 }: CountBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-secondary)] px-1 text-xs font-bold text-white shadow-sm">
      {displayCount}
    </span>
  );
}
