'use client';

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { Button, useToast } from '@/components/ui';
import { useSafeBack } from '@/lib/navigation';

type SupportTab = 'faq' | 'contact' | 'safety' | 'history';

interface InquiryDraft {
  category: string;
  screen: string;
  title: string;
  content: string;
  email: string;
}

interface StoredInquiry extends InquiryDraft {
  id: string;
  createdAt: string;
  status: 'received';
}

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

const SUPPORT_INQUIRIES_STORAGE_KEY = 'injeuri:support-inquiries';

const tabs: Array<{ id: SupportTab; label: string }> = [
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: '1:1 문의' },
  { id: 'safety', label: '안전/신고' },
  { id: 'history', label: '문의 내역' },
];

const inquiryCategories = [
  '로그인/계정',
  '학번 인증',
  '프로필/사진',
  '오늘우리 추천',
  '지금우리 피드',
  '하트/채팅',
  '신고/차단',
  '버그/오류',
  '기타',
];

const relatedScreens = [
  '전체',
  '로그인',
  '회원가입',
  '오늘우리',
  '지금우리',
  '채팅',
  '마이페이지',
  '프로필 수정',
];

const faqItems: FaqItem[] = [
  {
    category: '오늘우리',
    question: '오늘우리 추천은 언제 바뀌나요?',
    answer: '오늘우리 추천은 하루 동안 고정되고, 서비스 기준 시간에 새 추천으로 갱신돼요. 하트를 보낸 뒤에는 오늘 하루 선택한 사람만 보여요.',
  },
  {
    category: '오늘우리',
    question: '이 사람 추천 안 하기를 누르면 오늘 추천에서 사라지나요?',
    answer: '오늘 추천 목록에서는 사라지지 않아요. 다음 추천부터 제외 조건으로 반영돼요.',
  },
  {
    category: '지금우리',
    question: '지금우리 피드는 얼마나 보여요?',
    answer: '작성한 피드는 24시간 동안 보여요. 서로 하트가 닿으면 2시간 채팅방이 열려요.',
  },
  {
    category: '하트/채팅',
    question: '하트를 보냈는데 채팅이 안 열려요.',
    answer: '상대방도 하트를 보내면 채팅이 열려요. 오늘우리와 지금우리는 채팅이 열리는 조건과 유지 시간이 다를 수 있어요.',
  },
  {
    category: '신고/차단',
    question: '신고하면 상대방이 알 수 있나요?',
    answer: '신고한 사람의 정보는 상대방에게 공개되지 않아요. 운영팀 검토에 필요한 정보만 확인돼요.',
  },
  {
    category: '신고/차단',
    question: '차단과 신고는 뭐가 다른가요?',
    answer: '차단은 내가 상대를 보거나 대화하지 않도록 막는 기능이고, 신고는 운영팀 검토가 필요한 내용을 접수하는 기능이에요.',
  },
  {
    category: '계정',
    question: '비밀번호 재설정은 어떻게 하나요?',
    answer: '가입할 때 입력한 이메일과 계정 정보를 확인한 뒤 비밀번호를 재설정할 수 있어요.',
  },
  {
    category: '프로필',
    question: '프로필 자기소개를 비워둘 수 있나요?',
    answer: '프로필 품질을 위해 자기소개는 비워둘 수 없어요. 짧게라도 본인을 표현해 주세요.',
  },
];

const safetyGuides = [
  {
    title: '신고는 비공개로 접수돼요',
    description: '신고한 사람의 정보는 상대방에게 공개되지 않아요. 운영팀은 신고 대상, 사유, 필요한 대화/피드 정보를 확인해요.',
  },
  {
    title: '차단은 즉시 내 화면에 반영돼요',
    description: '차단한 사용자는 지금우리 피드와 채팅에서 제한돼요. 차단 목록에서 다시 해제할 수 있어요.',
  },
  {
    title: '불쾌한 대화는 채팅방에서 신고해 주세요',
    description: '채팅방 신고는 대화 내역이 함께 제출돼요. 욕설, 성적 불쾌감, 개인정보 요구, 금전 요구는 바로 신고해 주세요.',
  },
  {
    title: '긴급한 위험은 외부 도움을 먼저 받아요',
    description: '실제 만남에서 위협을 느끼거나 신체적 위험이 있다면 앱 신고보다 경찰, 학교 담당 부서, 주변 사람의 도움을 먼저 요청해 주세요.',
  },
];

const initialDraft: InquiryDraft = {
  category: inquiryCategories[0],
  screen: relatedScreens[0],
  title: '',
  content: '',
  email: '',
};

function readStoredInquiries(): StoredInquiry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SUPPORT_INQUIRIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isStoredInquiry) : [];
  } catch {
    return [];
  }
}

function writeStoredInquiries(items: StoredInquiry[]): void {
  window.localStorage.setItem(SUPPORT_INQUIRIES_STORAGE_KEY, JSON.stringify(items));
}

function isStoredInquiry(value: unknown): value is StoredInquiry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<StoredInquiry>;
  return (
    typeof item.id === 'string'
    && typeof item.category === 'string'
    && typeof item.screen === 'string'
    && typeof item.title === 'string'
    && typeof item.content === 'string'
    && typeof item.email === 'string'
    && typeof item.createdAt === 'string'
  );
}

function formatInquiryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function SupportIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-brand-pink)] text-[var(--color-pink-cta)]">
      {children}
    </span>
  );
}

export default function SupportPage() {
  const { goBack } = useSafeBack({ fallbackPath: '/my' });
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SupportTab>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState<InquiryDraft>(initialDraft);
  const [inquiries, setInquiries] = useState<StoredInquiry[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInquiries(readStoredInquiries());
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const filteredFaqItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return faqItems;
    }

    return faqItems.filter((item) => (
      item.category.toLowerCase().includes(query)
      || item.question.toLowerCase().includes(query)
      || item.answer.toLowerCase().includes(query)
    ));
  }, [searchQuery]);

  const updateDraft = (key: keyof InquiryDraft, value: string) => {
    setDraft((prevDraft) => ({ ...prevDraft, [key]: value }));
  };

  const handleSubmitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = draft.title.trim();
    const content = draft.content.trim();
    const email = draft.email.trim();

    if (!title || !content) {
      showToast('제목과 문의 내용을 입력해주세요.', 'error');
      return;
    }

    const nextInquiry: StoredInquiry = {
      ...draft,
      title,
      content,
      email,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'received',
    };
    const nextInquiries = [nextInquiry, ...inquiries].slice(0, 20);

    writeStoredInquiries(nextInquiries);
    setInquiries(nextInquiries);
    setDraft(initialDraft);
    setActiveTab('history');
    showToast('문의가 저장되었어요.', 'success');
  };

  return (
    <PageContainer>
      <PageHeader title="고객센터" showBack onBack={goBack} />

      <PageContent className="space-y-5 pb-10">
        <section className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_4px_14px_rgba(34,34,34,0.055)]">
          <div
            className="px-5 py-5"
            style={{
              background: 'linear-gradient(104deg, #FFDCE8 0%, #F8EEF4 38%, #C2E9FF 100%)',
            }}
          >
            <p className="text-[13px] font-semibold text-[var(--color-text-secondary)]">인제우리 고객센터</p>
            <h2 className="mt-1 break-keep text-[24px] font-bold leading-8 tracking-[-0.04em] text-[var(--color-text-primary)]">
              무엇을 도와드릴까요?
            </h2>
            <p className="mt-2 break-keep text-[14px] leading-6 text-[var(--color-text-secondary)]">
              자주 묻는 질문을 확인하거나, 해결되지 않는 문제는 문의로 남겨주세요.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-4 gap-2 rounded-[18px] bg-[var(--color-surface-secondary)] p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-10 rounded-[14px] px-2 text-[12px] font-bold transition ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--color-text-primary)] shadow-[0_2px_8px_rgba(34,34,34,0.06)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'faq' && (
          <section className="space-y-4">
            <label className="block">
              <span className="sr-only">FAQ 검색</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="궁금한 내용을 검색해보세요"
                className="h-12 w-full rounded-[18px] border border-[var(--color-border-light)] bg-white px-4 text-[15px] font-medium outline-none transition focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/15"
              />
            </label>

            <div className="space-y-3">
              {filteredFaqItems.map((item) => (
                <details
                  key={`${item.category}-${item.question}`}
                  className="group rounded-[18px] border border-[var(--color-border-light)] bg-white px-4 py-4 shadow-[0_3px_10px_rgba(34,34,34,0.035)]"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                    <span>
                      <span className="text-[12px] font-bold text-[var(--color-pink-cta)]">{item.category}</span>
                      <span className="mt-1 block break-keep text-[15px] font-bold leading-6 text-[var(--color-text-primary)]">
                        {item.question}
                      </span>
                    </span>
                    <svg className="mt-1 h-5 w-5 shrink-0 text-[var(--color-text-tertiary)] transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="mt-3 break-keep text-[14px] leading-6 text-[var(--color-text-secondary)]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'contact' && (
          <form onSubmit={handleSubmitInquiry} className="space-y-4">
            <section className="rounded-[20px] border border-[var(--color-border-light)] bg-white px-4 py-4 shadow-[0_3px_10px_rgba(34,34,34,0.035)]">
              <div className="flex gap-3">
                <SupportIcon>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                  </svg>
                </SupportIcon>
                <div>
                  <h2 className="text-[17px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">1:1 문의하기</h2>
                  <p className="mt-1 break-keep text-[13px] leading-5 text-[var(--color-text-secondary)]">
                    문의 내역은 현재 기기에 임시 저장돼요. 서버 문의 API가 연결되면 운영팀 접수로 전환할 수 있어요.
                  </p>
                </div>
              </div>
            </section>

            <div className="space-y-3 rounded-[20px] border border-[var(--color-border-light)] bg-white p-4 shadow-[0_3px_10px_rgba(34,34,34,0.035)]">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-bold text-[var(--color-text-primary)]">문의 유형</span>
                  <select
                    value={draft.category}
                    onChange={(event) => updateDraft('category', event.target.value)}
                    className="h-12 w-full rounded-[16px] border border-[var(--color-border)] bg-white px-3 text-[14px] font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-focus)]"
                  >
                    {inquiryCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-bold text-[var(--color-text-primary)]">관련 화면</span>
                  <select
                    value={draft.screen}
                    onChange={(event) => updateDraft('screen', event.target.value)}
                    className="h-12 w-full rounded-[16px] border border-[var(--color-border)] bg-white px-3 text-[14px] font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-focus)]"
                  >
                    {relatedScreens.map((screen) => (
                      <option key={screen} value={screen}>{screen}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-bold text-[var(--color-text-primary)]">제목</span>
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft('title', event.target.value.slice(0, 60))}
                  placeholder="문의 제목을 입력해주세요"
                  className="h-12 w-full rounded-[16px] border border-[var(--color-border)] bg-white px-4 text-[15px] outline-none focus:border-[var(--color-focus)]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-bold text-[var(--color-text-primary)]">문의 내용</span>
                <textarea
                  value={draft.content}
                  onChange={(event) => updateDraft('content', event.target.value.slice(0, 700))}
                  placeholder="문제가 발생한 상황을 자세히 적어주세요"
                  className="h-36 w-full resize-none rounded-[16px] border border-[var(--color-border)] bg-white px-4 py-3 text-[15px] leading-6 outline-none focus:border-[var(--color-focus)]"
                />
                <span className="mt-1 block text-right text-[12px] text-[var(--color-text-tertiary)]">{draft.content.length}/700</span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-bold text-[var(--color-text-primary)]">답변 받을 이메일</span>
                <input
                  value={draft.email}
                  onChange={(event) => updateDraft('email', event.target.value.slice(0, 80))}
                  placeholder="선택 입력"
                  inputMode="email"
                  className="h-12 w-full rounded-[16px] border border-[var(--color-border)] bg-white px-4 text-[15px] outline-none focus:border-[var(--color-focus)]"
                />
              </label>
            </div>

            <Button type="submit" fullWidth size="lg">
              문의 저장하기
            </Button>
          </form>
        )}

        {activeTab === 'safety' && (
          <section className="space-y-3">
            {safetyGuides.map((guide) => (
              <article
                key={guide.title}
                className="flex gap-3 rounded-[20px] border border-[var(--color-border-light)] bg-white px-4 py-4 shadow-[0_3px_10px_rgba(34,34,34,0.035)]"
              >
                <SupportIcon>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </SupportIcon>
                <div className="min-w-0">
                  <h2 className="break-keep text-[16px] font-bold leading-6 text-[var(--color-text-primary)]">{guide.title}</h2>
                  <p className="mt-1 break-keep text-[13px] leading-6 text-[var(--color-text-secondary)]">{guide.description}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {activeTab === 'history' && (
          <section className="space-y-3">
            {inquiries.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[22px] bg-white px-6 text-center shadow-[0_3px_10px_rgba(34,34,34,0.035)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                  </svg>
                </div>
                <p className="mt-4 text-[16px] font-bold text-[var(--color-text-primary)]">저장된 문의가 없어요</p>
                <p className="mt-2 break-keep text-[13px] leading-6 text-[var(--color-text-secondary)]">
                  1:1 문의에서 내용을 남기면 이곳에서 확인할 수 있어요.
                </p>
              </div>
            ) : (
              inquiries.map((inquiry) => (
                <article
                  key={inquiry.id}
                  className="rounded-[20px] border border-[var(--color-border-light)] bg-white px-4 py-4 shadow-[0_3px_10px_rgba(34,34,34,0.035)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[var(--color-pink-cta)]">
                        {inquiry.category} · {inquiry.screen}
                      </p>
                      <h2 className="mt-1 truncate text-[16px] font-bold text-[var(--color-text-primary)]">{inquiry.title}</h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-secondary)]">
                      접수
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 break-keep text-[13px] leading-6 text-[var(--color-text-secondary)]">
                    {inquiry.content}
                  </p>
                  <p className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">
                    {formatInquiryDate(inquiry.createdAt)}
                  </p>
                </article>
              ))
            )}
          </section>
        )}
      </PageContent>
    </PageContainer>
  );
}
