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
        subtitle="추천 알고리즘에 반영되는 조건만 이 화면에서 따로 관리해요."
        showBack
        onBack={goBack}
      />

      <PageContent className="app-section-stack page-with-sticky-cta">
        <PageSection className="notice-card shadow-none">
          <SectionHeading
            eyebrow="Notice"
            title="변경한 설정은 다음 추천부터 반영돼요"
            description="이미 열려 있는 추천에는 바로 적용되지 않고, 다음에 새로 열리는 추천부터 반영돼요."
          />
        </PageSection>

        <PageSection>
          <SectionHeading
            title="추천 기준 조정"
            description="선호 나이대와 같은 학과·학번 관련 조건은 이곳에서만 관리해요."
          />
          <div className="mt-5">
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
