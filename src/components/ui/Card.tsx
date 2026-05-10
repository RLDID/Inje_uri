import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
}

const variantStyles = {
  default: 'bg-[var(--color-surface)] border border-[var(--color-border-light)] shadow-sm',
  outline: 'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-none',
  elevated: 'bg-[var(--color-surface)] border border-[var(--color-border-light)] shadow-md',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', clickable = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          overflow-hidden rounded-[var(--radius-2xl)]
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${clickable ? 'cursor-pointer transition duration-150 active:scale-[0.99]' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
