'use client';

import { ChipGroup } from '@/components/ui';
import type { KeywordCategory } from '@/lib/types';

interface KeywordSelectorProps {
  category: KeywordCategory;
  selected: string | string[];
  onChange: (selected: string | string[]) => void;
  disabled?: boolean;
}

export function KeywordSelector({ category, selected, onChange, disabled = false }: KeywordSelectorProps) {
  const selectedCount = Array.isArray(selected) ? selected.length : (selected ? 1 : 0);

  return (
    <div className="content-stack-compact">
      <div className="mobile-split-row">
        <h3 className="text-base font-semibold break-keep text-[var(--color-text-primary)]">{category.label}</h3>
        {category.type === 'multi' && category.maxSelections && (
          <span className={`text-sm ${selectedCount >= category.maxSelections ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>
            {selectedCount}/{category.maxSelections}
          </span>
        )}
      </div>

      <ChipGroup
        options={category.options}
        selected={selected}
        onChange={onChange}
        type={category.type}
        maxSelections={category.maxSelections}
        disabled={disabled}
      />
    </div>
  );
}

interface ProfileSectionProps {
  id?: string;
  title: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ProfileSection({ id, title, description, required, className = '', children }: ProfileSectionProps) {
  return (
    <section id={id} className={`section-card p-5 scroll-mt-24 ${className}`}>
      <div className="mb-4">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-bold break-keep text-[var(--color-text-primary)]">{title}</h2>
          {required && <span className="text-sm text-[var(--color-secondary)]">*</span>}
        </div>
        {description && (
          <p className="mt-1 text-sm leading-6 break-keep text-[var(--color-text-secondary)]">{description}</p>
        )}
      </div>
      <div className="content-stack">
        {children}
      </div>
    </section>
  );
}
