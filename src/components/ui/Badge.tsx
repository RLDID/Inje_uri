import { HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'profilePink' | 'profileBlue';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  category?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'border border-transparent bg-[var(--color-chip-background)] text-[var(--color-text-secondary)]',
  primary: 'border border-[var(--color-pink-cta)]/20 bg-[var(--color-brand-pink)] text-[var(--color-text-primary)]',
  secondary: 'border border-[var(--color-blue-secondary)]/30 bg-[var(--color-chip-background)] text-[var(--color-text-primary)]',
  success: 'border border-[var(--color-blue-secondary)]/30 bg-[var(--color-chip-background)] text-[var(--color-text-primary)]',
  warning: 'border border-[var(--color-pink-cta)]/20 bg-[var(--color-brand-pink)] text-[var(--color-text-primary)]',
  error: 'border border-[var(--color-pink-cta)]/20 bg-[var(--color-brand-pink)] text-[var(--color-text-primary)]',
  info: 'border border-[var(--color-blue-secondary)]/30 bg-[var(--color-chip-background)] text-[var(--color-text-primary)]',
  profilePink: 'border border-transparent bg-[var(--color-pink-cta)] text-white',
  profileBlue: 'border border-transparent bg-[var(--color-chip-background)] text-[var(--color-text-secondary)]',
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
  layout?: 'stack' | 'inline';
}

export function CategoryBadgeGroup({
  category,
  items,
  variant = 'default',
  size = 'md',
  maxDisplay,
  layout = 'stack',
}: CategoryBadgeGroupProps) {
  const displayItems = maxDisplay ? items.slice(0, maxDisplay) : items;
  const remainingCount = maxDisplay ? items.length - maxDisplay : 0;

  if (items.length === 0) return null;

  return (
    <div className={layout === 'inline' ? 'flex items-start gap-3.5' : 'space-y-2.5'}>
      <span className={layout === 'inline'
        ? 'w-[82px] shrink-0 pt-1 text-[14px] font-semibold text-[var(--color-text-secondary)]'
        : 'text-xs font-semibold text-[var(--color-text-tertiary)]'}
      >
        {category}
      </span>
      <div className={`chip-wrap ${layout === 'inline' ? 'min-w-0 flex-1 gap-2.5' : ''}`}>
        {displayItems.map((item, index) => (
          <Badge
            key={index}
            variant={variant}
            size={size}
            className={layout === 'inline' ? 'px-3.5 py-1.5 text-[13px]' : ''}
          >
            {item}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="default" size={size} className={layout === 'inline' ? 'px-3.5 py-1.5 text-[13px]' : ''}>
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
    <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-pink-icon-active)] px-1 text-xs font-bold text-white shadow-sm">
      {displayCount}
    </span>
  );
}
