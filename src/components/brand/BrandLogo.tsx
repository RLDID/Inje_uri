'use client';

import { useState } from 'react';

type BrandLogoVariant = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  showText?: boolean;
  className?: string;
  logoClassName?: string;
  logoSrc?: string;
  text?: string;
  framed?: boolean;
}

const DEFAULT_LOGO_SRC = '/brand/bear-logo.png';
const DEFAULT_TEXT = '인제우리';

const variantStyles: Record<
  BrandLogoVariant,
  {
    iconSize: number;
    iconClassName: string;
    textClassName: string;
    fallbackClassName: string;
    gapClassName: string;
  }
> = {
  sm: {
    iconSize: 28,
    iconClassName: 'h-7 w-7 rounded-xl',
    textClassName: 'text-base',
    fallbackClassName: 'text-[10px]',
    gapClassName: 'gap-2',
  },
  md: {
    iconSize: 36,
    iconClassName: 'h-9 w-9 rounded-[14px]',
    textClassName: 'text-lg',
    fallbackClassName: 'text-xs',
    gapClassName: 'gap-2.5',
  },
  lg: {
    iconSize: 48,
    iconClassName: 'h-12 w-12 rounded-[18px]',
    textClassName: 'text-xl',
    fallbackClassName: 'text-sm',
    gapClassName: 'gap-1.5',
  },
};

function cx(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function BrandText({ text, className }: { text: string; className: string }) {
  if (text === DEFAULT_TEXT) {
    return (
      <span className={cx('bg-gradient-to-r from-[#5BAEF6] to-[var(--color-pink-cta)] bg-clip-text font-medium tracking-normal text-transparent', className)}>
        <span>인제</span>
        <span>우리</span>
      </span>
    );
  }

  return (
    <span className={cx('font-bold tracking-normal text-[var(--color-text-primary)]', className)}>
      {text}
    </span>
  );
}

export function BrandLogo({
  variant = 'md',
  showText = true,
  className,
  logoClassName,
  logoSrc = DEFAULT_LOGO_SRC,
  text = DEFAULT_TEXT,
  framed = true,
}: BrandLogoProps) {
  const [erroredLogoSrc, setErroredLogoSrc] = useState<string | null>(null);
  const styles = variantStyles[variant];
  const hasImageError = erroredLogoSrc === logoSrc;

  return (
    <span
      className={cx('inline-flex items-center', styles.gapClassName, className)}
      aria-label={text}
    >
      <span
        className={cx(
          'relative flex shrink-0 items-center justify-center',
          framed
            ? 'overflow-hidden bg-[var(--color-brand-pink)] shadow-sm'
            : 'overflow-visible bg-transparent shadow-none',
          styles.iconClassName,
          logoClassName,
        )}
      >
        {!hasImageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            width={styles.iconSize}
            height={styles.iconSize}
            className="h-full w-full object-contain"
            loading="eager"
            decoding="sync"
            draggable={false}
            onError={() => setErroredLogoSrc(logoSrc)}
          />
        ) : null}

        {hasImageError ? (
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-0 flex items-center justify-center font-bold text-[var(--color-pink-cta)]',
              styles.fallbackClassName,
            )}
          >
            인
          </span>
        ) : null}
      </span>

      {showText ? <BrandText text={text} className={styles.textClassName} /> : null}
    </span>
  );
}

export type { BrandLogoProps, BrandLogoVariant };
