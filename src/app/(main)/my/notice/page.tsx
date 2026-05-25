'use client';

import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { useSafeBack } from '@/lib/navigation';

const NOTICES = [
  {
    id: '2026-05-25-now-woori-update',
    date: '2026.05.25',
    badge: '업데이트',
    title: '지금우리와 계정 이용이 더 편해졌어요',
    summary: '피드를 다시 확인하고, 내 피드에 온 하트도 더 쉽게 볼 수 있도록 정리했어요.',
    sections: [
      {
        title: '지금우리 피드 확인이 편해졌어요',
        items: [
          '내가 올린 피드도 지금우리 메인에서 확인할 수 있어요.',
          '내 피드에는 하트 보내기 대신 피드 수정하기가 보여요.',
          '내 피드에 온 하트와 메시지를 피드 상세에서 바로 확인할 수 있어요.',
          '이미 하트를 보낸 피드도 지금우리에서 다시 볼 수 있어요.',
        ],
      },
      {
        title: '프로필 수정 중인 내용이 유지돼요',
        items: [
          '프로필 사진이나 소개를 수정하다가 이상형 키워드, 추천 설정으로 이동해도 작성 중인 내용이 남아 있어요.',
          '프로필 수정 화면에서 저장을 완료하면 임시 저장된 내용은 자동으로 정리돼요.',
        ],
      },
      {
        title: '닉네임 변경은 문의로 신청할 수 있어요',
        items: [
          '마이페이지의 고객센터에서 1:1 문의를 작성해 닉네임 변경을 요청할 수 있어요.',
          '요청한 닉네임은 중복 여부를 확인한 뒤 운영팀이 반영해드려요.',
        ],
      },
      {
        title: '운영팀 안내를 지금우리에서 볼 수 있어요',
        items: [
          '이벤트나 안내가 있을 때 지금우리에서 운영팀 피드로 확인할 수 있어요.',
          '운영팀과 대화가 필요한 경우 채팅으로 문의할 수 있어요.',
        ],
      },
    ],
  },
] as const;

export default function NoticePage() {
  const { goBack } = useSafeBack({ fallbackPath: '/my' });

  return (
    <PageContainer>
      <PageHeader title="공지사항" showBack onBack={goBack} />

      <PageContent className="pb-28">
        <div className="space-y-4">
          {NOTICES.map((notice) => (
            <article
              key={notice.id}
              className="overflow-hidden rounded-[24px] border border-[var(--color-border-light)] bg-white shadow-[0_4px_14px_rgba(34,34,34,0.055)]"
            >
              <div className="border-b border-[var(--color-border-light)] px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-7 items-center rounded-full bg-[var(--color-brand-pink)] px-3 text-[12px] font-bold text-[var(--color-pink-cta)]">
                    {notice.badge}
                  </span>
                  <time className="shrink-0 text-[12px] font-semibold text-[var(--color-text-tertiary)]">
                    {notice.date}
                  </time>
                </div>

                <h2 className="mt-4 break-keep text-[19px] font-bold leading-7 text-[var(--color-text-primary)]">
                  {notice.title}
                </h2>
                <p className="mt-2 break-keep text-[14px] leading-6 text-[var(--color-text-secondary)]">
                  {notice.summary}
                </p>
              </div>

              <div className="divide-y divide-[var(--color-border-light)]">
                {notice.sections.map((section) => (
                  <section key={section.title} className="px-5 py-5">
                    <h3 className="text-[15px] font-bold leading-6 text-[var(--color-text-primary)]">
                      {section.title}
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2.5 break-keep text-[13px] leading-6 text-[var(--color-text-secondary)]">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-pink-cta)]" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      </PageContent>
    </PageContainer>
  );
}
