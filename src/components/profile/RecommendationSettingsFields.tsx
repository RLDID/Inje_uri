'use client';

import type { RecommendationSettings } from '@/lib/types';

const AGE_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 19);

interface RecommendationSettingsFieldsProps {
  settings: RecommendationSettings;
  onChange: (nextSettings: RecommendationSettings) => void;
}

export function RecommendationSettingsFields({
  settings,
  onChange,
}: RecommendationSettingsFieldsProps) {
  const updateSettings = (patch: Partial<RecommendationSettings>) => {
    onChange({
      ...settings,
      ...patch,
      lastUpdated: new Date(),
      pendingChanges: undefined,
    });
  };

  const handleToggle = (key: 'excludeSameDepartment' | 'reduceSameYear', value: boolean) => {
    updateSettings(
      key === 'excludeSameDepartment'
        ? { excludeSameDepartment: value }
        : { reduceSameYear: value },
    );
  };

  const handleAgeRangeChange = (key: 'min' | 'max', value: number) => {
    const currentRange = settings.preferredAgeRange;
    const nextRange =
      key === 'min'
        ? {
            min: value,
            max: Math.max(value, currentRange.max),
          }
        : {
            min: Math.min(currentRange.min, value),
            max: value,
          };

    updateSettings({ preferredAgeRange: nextRange });
  };

  return (
    <div className="content-stack">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface)]">
        <ToggleRow
          title="같은 학과는 덜 보이게"
          description="같은 학과 학생이 반복해서 보이지 않도록 추천 빈도를 조금 낮춰요."
          checked={settings.excludeSameDepartment}
          onChange={(checked) => handleToggle('excludeSameDepartment', checked)}
        />
        <ToggleRow
          title="같은 학번 비중 줄이기"
          description="비슷한 학번보다 다른 학번이 조금 더 섞여 보이도록 조정해요."
          checked={settings.reduceSameYear}
          onChange={(checked) => handleToggle('reduceSameYear', checked)}
        />
      </div>

      <div className="section-card-muted p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">선호 나이대</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
            추천에서 우선적으로 보고 싶은 나이 범위를 정할 수 있어요.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">최소 나이</label>
            <select
              value={settings.preferredAgeRange.min}
              onChange={(event) => handleAgeRangeChange('min', Number(event.target.value))}
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
            >
              {AGE_OPTIONS.map((age) => (
                <option key={age} value={age}>
                  {age}세
                </option>
              ))}
            </select>
          </div>

          <span className="pb-3 text-sm text-[var(--color-text-tertiary)]">~</span>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">최대 나이</label>
            <select
              value={settings.preferredAgeRange.max}
              onChange={(event) => handleAgeRangeChange('max', Number(event.target.value))}
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
            >
              {AGE_OPTIONS.map((age) => (
                <option key={age} value={age}>
                  {age}세
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-[var(--color-text-tertiary)]">
        조건을 너무 좁게 잡으면 보여줄 추천이 줄어들 수 있어요. 저장한 설정은 다음 추천부터 반영돼요.
      </p>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-b border-[var(--color-border-light)] px-4 py-4 last:border-b-0">
      <div className="mobile-split-row gap-4">
        <div className="min-w-0">
          <p className="font-medium break-keep text-[var(--color-text-primary)]">{title}</p>
          <p className="mt-1 text-sm leading-6 break-keep text-[var(--color-text-secondary)]">{description}</p>
        </div>

        <div className="shrink-0">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onChange(event.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-[var(--color-border)] transition-colors peer-checked:bg-[var(--color-primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)]/25 peer-checked:after:translate-x-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-['']" />
          </label>
        </div>
      </div>
    </div>
  );
}
