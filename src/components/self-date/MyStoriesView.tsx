'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { CenteredModal, useToast } from '@/components/ui';
import { FeedCard } from '@/components/self-date/FeedCard';
import { getFeedComments, getMyCommentedFeeds, getMyFeeds, selectFeedCommentChat } from '@/lib/api/feeds';
import { blockUser, reportTarget } from '@/lib/api/safety';
import { SELFDATE_KEYWORD_OPTIONS, getFeedCategoryLabel } from '@/lib/constants';
import { analyzeFeedImage, type FeedImageAsset } from '@/lib/utils/feedImage';
import {
  buildChatRoomHref,
  buildProfileDetailHref,
  buildSelfDateDetailHref,
  type AppSection,
  useCurrentRouteContext,
} from '@/lib/navigation';
import { getFeedRemainingTime } from '@/lib/utils/feed';
import { getUserAcademicLabel } from '@/lib/utils';
import type { FeedCategory, Story, FeedReaction } from '@/lib/types';

interface MyStoriesViewProps {
  ownerSection: AppSection;
  title: string;
  subtitle?: string;
  onBack: () => void;
  showTabs?: boolean;
}

type MyFeedTab = 'mine' | 'liked';
type ReactionActionType = 'report' | 'block';
const REACTION_CHAT_SESSION_KEY = 'self-date:reaction-chats';
const MAX_EDIT_IMAGES = 4;
const MAX_EDIT_KEYWORDS = 4;

function getStoryCategoryList(story: Story): FeedCategory[] {
  if (story.categories && story.categories.length > 0) {
    return story.categories;
  }

  return story.category ? [story.category] : [];
}

function readReactionChatIds(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.sessionStorage.getItem(REACTION_CHAT_SESSION_KEY);
    return storedValue ? JSON.parse(storedValue) : [];
  } catch {
    return [];
  }
}

function writeReactionChatIds(reactionIds: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(REACTION_CHAT_SESSION_KEY, JSON.stringify(reactionIds));
  } catch {
    // ignore session storage errors
  }
}

interface ReactionMenuTarget {
  storyId: string;
  reaction: FeedReaction;
}

interface ReactionActionTarget {
  storyId: string;
  reaction: FeedReaction;
  action: ReactionActionType;
}

export function MyStoriesView({
  ownerSection,
  title,
  subtitle,
  onBack,
  showTabs = true,
}: MyStoriesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { currentPath } = useCurrentRouteContext();
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<MyFeedTab>(() => (
    searchParams.get('tab') === 'liked' ? 'liked' : 'mine'
  ));
  const isEditMode = false;
  const [selectedReaction, setSelectedReaction] = useState<{ story: Story; reaction: FeedReaction } | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editText, setEditText] = useState('');
  const [editImages, setEditImages] = useState<FeedImageAsset[]>([]);
  const [editCategories, setEditCategories] = useState<FeedCategory[]>([]);
  const [isUpdatingEditImage, setIsUpdatingEditImage] = useState(false);
  const [reactionMenuTarget, setReactionMenuTarget] = useState<ReactionMenuTarget | null>(null);
  const [reactionActionTarget, setReactionActionTarget] = useState<ReactionActionTarget | null>(null);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [likedStories, setLikedStories] = useState<Story[]>([]);
  const [reactionChatIds, setReactionChatIds] = useState<string[]>(() => readReactionChatIds());

  useEffect(() => {
    let cancelled = false;

    async function loadStories() {
      try {
        const [mine, commented] = await Promise.all([
          getMyFeeds(),
          getMyCommentedFeeds(),
        ]);
        const mineWithReactions = await Promise.all(mine.map(async (story) => ({
          ...story,
          reactions: await getFeedComments(story.id),
        })));

        if (!cancelled) {
          setMyStories(mineWithReactions);
          setLikedStories(commented);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '피드 목록을 불러오지 못했어요.', 'error');
        }
      }
    }

    void loadStories();
    window.addEventListener('focus', loadStories);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadStories);
    };
  }, [showToast]);

  useEffect(() => {
    setActiveTab(searchParams.get('tab') === 'liked' ? 'liked' : 'mine');
  }, [searchParams]);

  useEffect(() => {
    writeReactionChatIds(reactionChatIds);
  }, [reactionChatIds]);

  const handleOpenFeedDetail = (story: Story) => {
    router.push(
      buildSelfDateDetailHref(story.id, {
        sourcePath: currentPath,
        sourceSection: ownerSection,
        fallbackPath: currentPath,
      }),
    );
  };

  const handleOpenProfile = (userId: string) => {
    router.push(
      buildProfileDetailHref(userId, 'self-date', {
        sourcePath: currentPath,
        sourceSection: ownerSection,
        fallbackPath: currentPath,
      }),
    );
  };

  const handleEditFeed = (story: Story) => {
    router.push(`/my/posts/${story.id}/edit`);
  };

  const handleOpenEditPage = () => {
    const [firstStory] = myStories;

    if (!firstStory) {
      return;
    }

    router.push(`/my/posts/${firstStory.id}/edit`);
  };

  const closeEditModal = () => {
    setEditingStory(null);
    setEditText('');
    setEditImages([]);
    setEditCategories([]);
  };

  const handleSaveEdit = () => {
    if (!editingStory) {
      return;
    }

    if (editCategories.length === 0) {
      showToast('카테고리를 선택해주세요.', 'error');
      return;
    }

    if (!editText.trim()) {
      showToast('내용을 입력해주세요.', 'error');
      return;
    }

    setMyStories((prevStories) => prevStories.map((story) => (
      story.id === editingStory.id
        ? {
            ...story,
            category: editCategories[0],
            categories: editCategories,
            content: {
              ...story.content,
              text: editText.trim(),
              images: editImages.map((image) => image.previewUrl),
            },
          }
        : story
    )));

    showToast('피드를 수정했어요.', 'success');
    closeEditModal();
  };

  const handleEditImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_EDIT_IMAGES - editImages.length;
    if (remainingSlots <= 0) {
      showToast(`이미지는 ${MAX_EDIT_IMAGES}개까지만 등록할 수 있어요.`, 'info');
      event.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      showToast(`이미지는 최대 ${MAX_EDIT_IMAGES}개까지만 등록할 수 있어요.`, 'info');
    }

    setIsUpdatingEditImage(true);

    try {
      const nextImages = await Promise.all(filesToProcess.map((file) => analyzeFeedImage(file)));
      setEditImages((prevImages) => [...prevImages, ...nextImages].slice(0, MAX_EDIT_IMAGES));
      showToast('이미지를 추가했어요.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '이미지를 불러오지 못했어요. 다시 시도해주세요.',
        'error',
      );
    } finally {
      setIsUpdatingEditImage(false);
      event.target.value = '';
    }
  };

  const handleRemoveEditImage = (indexToRemove: number) => {
    setEditImages((prevImages) => prevImages.filter((_, index) => index !== indexToRemove));
  };

  const handleToggleEditCategory = (category: FeedCategory) => {
    setEditCategories((prevCategories) => {
      if (prevCategories.includes(category)) {
        return prevCategories.filter((item) => item !== category);
      }

      if (prevCategories.length >= MAX_EDIT_KEYWORDS) {
        showToast(`카테고리는 ${MAX_EDIT_KEYWORDS}개까지만 선택할 수 있어요.`, 'info');
        return prevCategories;
      }

      return [...prevCategories, category];
    });
  };

  const handleStartReactionChat = async (reaction: FeedReaction) => {
    try {
      const result = await selectFeedCommentChat(reaction.id);
      setReactionChatIds((prevReactionChatIds) => (
        prevReactionChatIds.includes(reaction.id)
          ? prevReactionChatIds
          : [...prevReactionChatIds, reaction.id]
      ));
      showToast('채팅방이 열렸어요.', 'success');
      router.push(buildChatRoomHref(String(result.chatRoomId), {
        sourcePath: currentPath,
        fallbackPath: currentPath,
      }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : '채팅방을 만들지 못했어요.', 'error');
    }
  };

  const handleConfirmReactionAction = async () => {
    if (!reactionActionTarget) {
      return;
    }

    const { action, reaction, storyId } = reactionActionTarget;

    try {
      if (action === 'report') {
        await reportTarget({
          targetType: 'feed_comment',
          targetId: reaction.id,
          reasonType: 'inappropriate',
          description: null,
        });
      } else {
        await blockUser(reaction.fromUser.id);
      }

      setMyStories((prevStories) => prevStories.map((story) => (
        story.id === storyId
          ? {
              ...story,
              reactions: story.reactions?.filter((item) => item.id !== reaction.id) ?? [],
            }
          : story
      )));

      if (selectedReaction?.reaction.id === reaction.id) {
        setSelectedReaction(null);
      }

      showToast(
        action === 'report'
          ? `${reaction.fromUser.nickname}님을 신고했어요.`
          : `${reaction.fromUser.nickname}님을 차단했어요.`,
        'success',
      );
      setReactionActionTarget(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '요청을 처리하지 못했어요.', 'error');
    }
  };

  const selectedReactionProfileHref = selectedReaction
    ? buildProfileDetailHref(selectedReaction.reaction.fromUser.id, 'self-date', {
        sourcePath: currentPath,
        sourceSection: ownerSection,
        fallbackPath: currentPath,
      })
    : '/match';

  return (
    <PageContainer>
      <PageHeader title={title} subtitle={subtitle} showBack onBack={onBack} />

      <PageContent className="px-5 pb-36 pt-4" noPadding>
        {showTabs && (
          <div className="mb-5 rounded-[22px] bg-[var(--color-surface-secondary)] p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('mine')}
                className={`rounded-[18px] px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === 'mine'
                    ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                내 피드
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('liked')}
                className={`rounded-[18px] px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === 'liked'
                    ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                반응한 피드
              </button>
            </div>
          </div>
        )}

        {activeTab === 'mine' ? (
          myStories.length === 0 ? (
            <div className="rounded-[24px] bg-[var(--color-surface-secondary)] px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <svg className="h-8 w-8 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <p className="text-[var(--color-text-secondary)]">아직 작성한 피드가 없어요.</p>
              <Link
                href="/self-date/create"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-action-primary)] px-5 py-2.5 text-sm font-medium text-white"
              >
                첫 피드 만들기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-light)]">
              {myStories.map((story) => {
                const timeRemaining = getFeedRemainingTime(story);
                const reactionCount = story.reactions?.length || 0;
                const storyCategories = getStoryCategoryList(story);

                return (
                  <article key={story.id} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`text-sm font-medium ${
                          timeRemaining.isExpiringSoon
                            ? 'text-[var(--color-text-primary)]'
                            : 'text-[var(--color-text-secondary)]'
                        }`}>
                          {timeRemaining.isExpired ? '만료됨' : timeRemaining.formatted}
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          · 조회 {story.viewCount}
                        </span>
                      </div>

                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => handleEditFeed(story)}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-chip-background)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)]"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          수정
                        </button>
                      )}
                    </div>

                    {storyCategories.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {storyCategories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full bg-[var(--color-chip-background)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)]"
                          >
                            {getFeedCategoryLabel(category)}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-3 leading-7 text-[var(--color-text-primary)]">
                      {story.content.text}
                    </p>

                    {story.content.images && story.content.images.length > 0 && (
                      <div className="mt-4 overflow-hidden rounded-[22px] bg-[var(--color-surface-secondary)]">
                        <Image
                          src={story.content.images[0]}
                          alt="피드 이미지"
                          width={400}
                          height={300}
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="mt-5">
                      <div className="mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-[var(--color-text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          하트 {reactionCount}개
                        </span>
                      </div>

                      {reactionCount === 0 ? (
                        <p className="text-sm text-[var(--color-text-tertiary)]">
                          아직 받은 하트가 없어요.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {story.reactions?.map((reaction) => {
                            const isReactionHandled = reactionChatIds.includes(reaction.id);

                            return (
                              <div
                                key={reaction.id}
                                className="relative rounded-[20px] bg-[var(--color-surface-secondary)] px-4 py-4"
                              >
                              <button
                                type="button"
                                onClick={() => setReactionMenuTarget({ storyId: story.id, reaction })}
                                className="absolute right-2 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-white/80"
                                aria-label="댓글 더보기"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <circle cx="5" cy="12" r="2" />
                                  <circle cx="12" cy="12" r="2" />
                                  <circle cx="19" cy="12" r="2" />
                                </svg>
                              </button>

                              <div className="flex items-start gap-3 pr-10">
                                <button
                                  type="button"
                                  onClick={() => handleOpenProfile(reaction.fromUser.id)}
                                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full"
                                  aria-label={`${reaction.fromUser.nickname} 프로필 보기`}
                                >
                                  <Image
                                    src={reaction.fromUser.profileImages[0]}
                                    alt={reaction.fromUser.nickname}
                                    width={44}
                                    height={44}
                                    className="h-full w-full object-cover"
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedReaction({ story, reaction })}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-[var(--color-text-primary)]">
                                      {reaction.fromUser.nickname}
                                    </span>
                                    <span className="text-xs text-[var(--color-text-tertiary)]">
                                      {reaction.fromUser.department}
                                    </span>
                                  </div>

                                  {reaction.message ? (
                                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                                      &ldquo;{reaction.message}&rdquo;
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-tertiary)]">
                                      하트만 보냈어요.
                                    </p>
                                  )}
                                </button>
                              </div>

                              {!isReactionHandled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleStartReactionChat(reaction);
                                  }}
                                  className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#e9799f] text-[14px] font-semibold text-white shadow-[0_3px_8px_rgba(233,121,159,0.24)] transition-transform active:scale-[0.99]"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                  </svg>
                                  채팅 시작하기
                                </button>
                              )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : (
          likedStories.length === 0 ? (
            <div className="rounded-[24px] bg-[var(--color-surface-secondary)] px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <svg className="h-8 w-8 text-[var(--color-text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <p className="text-[var(--color-text-secondary)]">아직 반응한 피드가 없어요.</p>
              <Link
                href="/self-date"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-action-primary)] px-5 py-2.5 text-sm font-medium text-white"
              >
                지금 우리 둘러보기
              </Link>
            </div>
          ) : (
            <div className="content-stack">
              {likedStories.map((story) => (
                <FeedCard
                  key={story.id}
                  story={story}
                  onCardClick={() => handleOpenFeedDetail(story)}
                  onProfileClick={() => handleOpenProfile(story.author.id)}
                  isLiked
                  showHeartButton={false}
                />
              ))}
            </div>
          )
        )}
      </PageContent>

      {activeTab === 'mine' && myStories.length > 0 && (
        <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+28px)] right-4 z-40">
          <button
            type="button"
            onClick={handleOpenEditPage}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-like-active)] text-white shadow-[0_6px_14px_rgba(243,167,192,0.22)] transition-transform active:scale-95"
            aria-label={isEditMode ? '편집 완료' : '피드 수정 모드 열기'}
          >
            {isEditMode ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            )}
          </button>
        </div>
      )}

      <CenteredModal
        isOpen={selectedReaction !== null}
        onClose={() => setSelectedReaction(null)}
        title="받은 호감"
      >
        {selectedReaction && (
          <div className="px-5 pb-5 pt-4">
            <div className="rounded-[22px] bg-[var(--color-surface-secondary)] px-4 py-5 text-center">
              <div className="mx-auto h-20 w-20 overflow-hidden rounded-full ring-4 ring-white">
                <Image
                  src={selectedReaction.reaction.fromUser.profileImages[0]}
                  alt={selectedReaction.reaction.fromUser.nickname}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
                {selectedReaction.reaction.fromUser.nickname}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                {getUserAcademicLabel(selectedReaction.reaction.fromUser)}
              </p>
            </div>

            {selectedReaction.reaction.message ? (
              <div className="mt-4 rounded-[20px] border border-[var(--color-border-light)] bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                  남긴 한마디
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-primary)]">
                  &ldquo;{selectedReaction.reaction.message}&rdquo;
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] border border-[var(--color-border-light)] bg-white px-4 py-4">
                <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                  메시지 없이 호감만 전달했어요.
                </p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href={selectedReactionProfileHref}
                className="flex items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] px-4 py-3 font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]/80"
              >
                프로필 보기
              </Link>
              <button
                type="button"
                onClick={() => {
                  void handleStartReactionChat(selectedReaction.reaction);
                  setSelectedReaction(null);
                }}
                className="flex items-center justify-center rounded-2xl bg-[var(--color-action-primary)] px-4 py-3 font-medium text-[var(--color-action-primary-text)]"
              >
                대화하기
              </button>
            </div>
          </div>
        )}
      </CenteredModal>

      <CenteredModal
        isOpen={reactionMenuTarget !== null}
        onClose={() => setReactionMenuTarget(null)}
        title="댓글 옵션"
      >
        {reactionMenuTarget && (
          <div className="px-5 pb-5 pt-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setReactionActionTarget({
                    storyId: reactionMenuTarget.storyId,
                    reaction: reactionMenuTarget.reaction,
                    action: 'report',
                  });
                  setReactionMenuTarget(null);
                }}
                className="flex w-full items-center justify-between rounded-2xl bg-[var(--color-surface-secondary)] px-4 py-3 text-left font-medium text-[var(--color-text-primary)]"
              >
                <span>신고하기</span>
                <svg className="h-4 w-4 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReactionActionTarget({
                    storyId: reactionMenuTarget.storyId,
                    reaction: reactionMenuTarget.reaction,
                    action: 'block',
                  });
                  setReactionMenuTarget(null);
                }}
                className="flex w-full items-center justify-between rounded-2xl bg-[var(--color-surface-secondary)] px-4 py-3 text-left font-medium text-[var(--color-text-primary)]"
              >
                <span>차단하기</span>
                <svg className="h-4 w-4 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </CenteredModal>

      <CenteredModal
        isOpen={editingStory !== null}
        onClose={closeEditModal}
        title="피드 수정하기"
      >
        <div className="max-h-[72vh] overflow-y-auto px-5 pb-5 pt-4">
          <div className="space-y-5">
            <section className="rounded-[24px] bg-white px-4 py-4 shadow-[0_4px_12px_rgba(34,34,34,0.055)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                    대표 이미지
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                    내가 올렸던 사진을 확인하고 수정할 수 있어요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => editImageInputRef.current?.click()}
                  disabled={isUpdatingEditImage || editImages.length >= MAX_EDIT_IMAGES}
                  className="shrink-0 rounded-full bg-[var(--color-chip-background)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] disabled:opacity-50"
                >
                  사진 추가
                </button>
              </div>

              <div className="mt-4">
                {editImages.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-[var(--color-surface-secondary)]">
                      <Image
                        src={editImages[0].previewUrl}
                        alt="대표 이미지 미리보기"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {editImages.map((image, index) => (
                        <div key={`${image.previewUrl}-${index}`} className="relative aspect-square overflow-hidden rounded-[10px] bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)]">
                          <Image
                            src={image.previewUrl}
                            alt={`첨부 이미지 ${index + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEditImage(index)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[var(--color-text-secondary)] shadow-[0_2px_6px_rgba(34,34,34,0.18)] ring-1 ring-black/5"
                            aria-label={`첨부 이미지 ${index + 1} 삭제`}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {editImages.length < MAX_EDIT_IMAGES && (
                        <button
                          type="button"
                          onClick={() => editImageInputRef.current?.click()}
                          disabled={isUpdatingEditImage}
                          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] disabled:opacity-50"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          <span className="text-[11px] font-medium">추가</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editImageInputRef.current?.click()}
                    disabled={isUpdatingEditImage}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-[var(--color-border)] bg-white text-[var(--color-text-tertiary)] disabled:opacity-50"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-sm font-semibold">사진을 추가해보세요</span>
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-[24px] bg-white px-4 py-4 shadow-[0_4px_12px_rgba(34,34,34,0.055)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                  카테고리
                </h3>
                <span className="text-sm text-[var(--color-text-tertiary)]">
                  {editCategories.length}/{MAX_EDIT_KEYWORDS}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SELFDATE_KEYWORD_OPTIONS.map((option) => {
                  const category = option.id as FeedCategory;
                  const isSelected = editCategories.includes(category);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleToggleEditCategory(category)}
                      className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-blue-secondary)] text-white'
                          : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[24px] bg-white px-4 py-4 shadow-[0_4px_12px_rgba(34,34,34,0.055)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                  내용
                </h3>
                <span className="text-xs text-[var(--color-text-tertiary)]">{editText.length}/200</span>
              </div>

              <textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value.slice(0, 200))}
                placeholder="피드 내용을 수정해주세요."
                className="mt-3 h-36 w-full resize-none rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-[14px] leading-6 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-focus)] focus:outline-none"
              />
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-2xl bg-[var(--color-surface-secondary)] py-3 font-medium text-[var(--color-text-primary)]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editText.trim() || editCategories.length === 0}
                className="rounded-2xl bg-[var(--color-action-primary)] py-3 font-medium text-[var(--color-action-primary-text)] disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </CenteredModal>

      <CenteredModal
        isOpen={reactionActionTarget !== null}
        onClose={() => setReactionActionTarget(null)}
        title={reactionActionTarget?.action === 'report' ? '신고하기' : '차단하기'}
      >
        {reactionActionTarget && (
          <div className="px-5 pb-5 pt-4">
            <div className="rounded-[22px] bg-[var(--color-surface-secondary)] px-4 py-5">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {reactionActionTarget.reaction.fromUser.nickname}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {reactionActionTarget.action === 'report'
                  ? '이 사용자를 신고하면 운영 검토가 진행돼요.'
                  : '이 사용자를 차단하면 이후 이 반응을 다시 보지 않게 돼요.'}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReactionActionTarget(null)}
                className="rounded-2xl bg-[var(--color-surface-secondary)] py-3 font-medium text-[var(--color-text-primary)]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmReactionAction();
                }}
                className={`rounded-2xl py-3 font-medium ${
                  reactionActionTarget.action === 'report'
                    ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
                    : 'bg-[var(--color-text-primary)] text-[var(--color-text-inverse)]'
                }`}
              >
                {reactionActionTarget.action === 'report' ? '신고하기' : '차단하기'}
              </button>
            </div>
          </div>
        )}
      </CenteredModal>

      <input
        ref={editImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void handleEditImageChange(event);
        }}
      />
    </PageContainer>
  );
}
