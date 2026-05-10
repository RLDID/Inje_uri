'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageContainer, PageContent, PageHeader, PageSection, SectionHeading } from '@/components/layout';
import { Button, useToast } from '@/components/ui';
import { RecommendationSettingsFields } from '@/components/profile/RecommendationSettingsFields';
import { getRecommendationSettings, updateRecommendationSettings } from '@/lib/api/settings';
import { useSafeBack } from '@/lib/navigation';
import type { RecommendationSettings } from '@/lib/types';

const DEFAULT_SETTINGS: RecommendationSettings = {
  excludeSameDepartment: false,
  reduceSameYear: false,
  excludeSmokers: false,
  excludeFrequentDrinkers: false,
  preferredAgeRange: { min: 20, max: 29 },
  lastUpdated: new Date(),
};

function SettingsPageContent() {
  const { showToast } = useToast();
  const { goBack } = useSafeBack({ fallbackPath: '/my' });

  const [settings, setSettings] = useState<RecommendationSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const nextSettings = await getRecommendationSettings();
        if (!cancelled) {
          setSettings(nextSettings);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '추천 설정을 불러오지 못했어요.', 'error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleChange = (nextSettings: RecommendationSettings) => {
    setSettings(nextSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const savedSettings = await updateRecommendationSettings(settings);
      setSettings(savedSettings);
      showToast('추천 설정을 저장했어요. 다음 추천부터 차분히 반영될 거예요.', 'success', 4000);
      setHasChanges(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '추천 설정을 저장하지 못했어요.', 'error');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="추천 설정"
        showBack
        onBack={goBack}
      />

      <PageContent className="app-section-stack page-with-sticky-cta">
        <PageSection className="notice-card !border-0 shadow-[0_4px_14px_rgba(34,34,34,0.055)]">
          <SectionHeading
            eyebrow="Notice"
            title="변경한 설정은 다음 추천부터 반영돼요"
            description="이미 열려 있는 추천에는 바로 적용되지 않고, 다음에 새로 열리는 추천부터 반영돼요."
          />
        </PageSection>

        <PageSection className="!border-0 !p-0">
          <div>
            {isLoading ? (
              <div className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
                추천 설정을 불러오는 중이에요
              </div>
            ) : (
              <RecommendationSettingsFields settings={settings} onChange={handleChange} />
            )}
          </div>
        </PageSection>
      </PageContent>

      {hasChanges && (
        <div className="sticky-cta-container">
          <Button fullWidth size="lg" onClick={handleSave}>
            설정 저장하기
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <SettingsPageContent />
    </Suspense>
  );
}
