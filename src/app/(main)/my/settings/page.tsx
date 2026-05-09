'use client';

import { Suspense, useState } from 'react';
import { PageContainer, PageContent, PageHeader, PageSection, SectionHeading } from '@/components/layout';
import { Button, useToast } from '@/components/ui';
import { RecommendationSettingsFields } from '@/components/profile/RecommendationSettingsFields';
import { mockRecommendationSettings } from '@/lib/data';
import { useSafeBack } from '@/lib/navigation';
import type { RecommendationSettings } from '@/lib/types';
import { persistRecommendationSettings, readRecommendationSettings } from '@/lib/utils/recommendationSettings';

function SettingsPageContent() {
  const { showToast } = useToast();
  const { goBack } = useSafeBack({ fallbackPath: '/my' });

  const [settings, setSettings] = useState<RecommendationSettings>(() => readRecommendationSettings(mockRecommendationSettings));
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (nextSettings: RecommendationSettings) => {
    setSettings(nextSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    persistRecommendationSettings(settings);
    showToast('추천 설정을 저장했어요. 다음 추천부터 차분히 반영될 거예요.', 'success', 4000);
    setHasChanges(false);
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
            <RecommendationSettingsFields settings={settings} onChange={handleChange} />
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
