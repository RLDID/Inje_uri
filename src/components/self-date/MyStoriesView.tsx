'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { CenteredModal, useToast } from '@/components/ui';
import { FeedCard } from '@/components/self-date/FeedCard';
import { getActiveStories, getChatButtonStatus, getMyStories } from '@/lib/data';
import { analyzeFeedImage, type FeedImageAsset } from '@/lib/utils/feedImage';
import {
  buildChatRoomHref,
  buildProfileDetailHref,
  buildSelfDateDetailHref,
  type AppSection,
  useCurrentRouteContext,
} from '@/lib/navigation';
import { getFeedRemainingTime, isValidFeed } from '@/lib/utils/feed';
import { getUserAcademicLabel, readSelfDateLikedFeedIds } from '@/lib/utils';
import type { Story, FeedReaction } from '@/lib/types';

interface MyStoriesViewProps {
  ownerSection: AppSection;
  title: string;
  subtitle: string;
  onBack: () => void;
}

type MyFeedTab = 'mine' | 'liked';
type ReactionActionType = 'report' | 'block';
const REACTION_CHAT_SESSION_KEY = 'self-date:reaction-chats';

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
}: MyStoriesViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { currentPath } = useCurrentRouteContext();
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<MyFeedTab>('mine');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<{ story: Story; reaction: FeedReaction } | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editText, setEditText] = useState('');
  const [editImage, setEditImage] = useState<FeedImageAsset | null>(null);
  const [isUpdatingEditImage, setIsUpdatingEditImage] = useState(false);
  const [reactionMenuTarget, setReactionMenuTarget] = useState<ReactionMenuTarget | null>(null);
  const [reactionActionTarget, setReactionActionTarget] = useState<ReactionActionTarget | null>(null);
  const [myStories, setMyStories] = useState<Story[]>(() => getMyStories());
  const [likedFeedIds, setLikedFeedIds] = useState<string[]>(() => readSelfDateLikedFeedIds());
  const [reactionChatIds, setReactionChatIds] = useState<string[]>(() => readReactionChatIds());

  const likedStories = useMemo(() => {
    const activeStories = getActiveStories().filter(isValidFeed);

    return likedFeedIds
      .map((feedId) => activeStories.find((story) => story.id === feedId))
      .filter((story): story is Story => !!story);
  }, [likedFeedIds]);

  useEffect(() => {
    const syncLikedFeeds = () => {
      setLikedFeedIds(readSelfDateLikedFeedIds());
    };

    window.addEventListener('focus', syncLikedFeeds);
    window.addEventListener('storage', syncLikedFeeds);

    return () => {
      window.removeEventListener('focus', syncLikedFeeds);
      window.removeEventListener('storage', syncLikedFeeds);
    };
  }, []);

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
    setEditingStory(story);
    setEditText(story.content.text ?? '');
    setEditImage(
      story.content.images[0]
        ? {
            previewUrl: story.content.images[0],
            fileName: 'my-feed-image',
            fileSize: 0,
            mimeType: 'image/*',
            width: 0,
            height: 0,
            aspectRatio: 1,
            warnings: [],
          }
        : null,
    );
  };

  const closeEditModal = () => {
    setEditingStory(null);
    setEditText('');
    setEditImage(null);
  };

  const handleSaveEdit = () => {
    if (!editingStory || !editText.trim()) {
      return;
    }

    setMyStories((prevStories) => prevStories.map((story) => (
      story.id === editingStory.id
        ? {
            ...story,
            content: {
              ...story.content,
              text: editText.trim(),
              images: editImage ? [editImage.previewUrl] : [],
            },
          }
        : story
    )));

    showToast('피드를 수정했어요.', 'success');
    closeEditModal();
  };

  const handleEditImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUpdatingEditImage(true);

    try {
      const nextImage = await analyzeFeedImage(file);
      setEditImage(nextImage);
      showToast('대표 이미지를 바꿨어요.', 'success');
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

  const handleStartReactionChat = (reaction: FeedReaction) => {
    setReactionChatIds((prevReactionChatIds) => (
      prevReactionChatIds.includes(reaction.id)
        ? prevReactionChatIds
        : [...prevReactionChatIds, reaction.id]
    ));

    const chatStatus = getChatButtonStatus(reaction.fromUser.id);

    if (chatStatus.type === 'existing_chat') {
      router.push(buildChatRoomHref(chatStatus.chatId, {
        sourcePath: currentPath,
        fallbackPath: currentPath,
      }));
      return;
    }

    showToast('대화를 시작할 준비가 됐어요.', 'success');
    router.push('/chat');
  };

  const handleConfirmReactionAction = () => {
    if (!reactionActionTarget) {
      return;
    }

    const { action, reaction, storyId } = reactionActionTarget;

    if (action === 'block') {
      setMyStories((prevStories) => prevStories.map((story) => (
        story.id === storyId
          ? {
              ...story,
              reactions: story.reactions?.filter((item) => item.id !== reaction.id) ?? [],
            }
          : story
      )));
    }

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
              내가 호감 보낸 피드
            </button>
          </div>
        </div>

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
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white"
              >
                첫 피드 만들기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-light)]">
              {myStories.map((story) => {
                const timeRemaining = getFeedRemainingTime(story);
                const reactionCount = story.reactions?.length || 0;

                return (
                  <article key={story.id} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`text-sm font-medium ${
                          timeRemaining.isExpiringSoon
                            ? 'text-[var(--color-secondary)]'
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
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          수정
                        </button>
                      )}
                    </div>

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
                        <svg className="h-5 w-5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          호감 {reactionCount}개
                        </span>
                      </div>

                      {reactionCount === 0 ? (
                        <p className="text-sm text-[var(--color-text-tertiary)]">
                          아직 받은 호감이 없어요.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {story.reactions?.map((reaction) => {
                            const isReactionHandled =
                              reactionChatIds.includes(reaction.id)
                              || getChatButtonStatus(reaction.fromUser.id).type === 'existing_chat';

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

                              <button
                                type="button"
                                onClick={() => handleStartReactionChat(reaction)}
                                className={`absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center text-[var(--color-secondary)] transition-transform active:scale-95 ${
                                  isReactionHandled ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                                }`}
                                aria-label={isReactionHandled ? `${reaction.fromUser.nickname}님과 대화를 시작했어요` : `${reaction.fromUser.nickname}님과 대화하기`}
                                aria-pressed={isReactionHandled}
                              >
                                <svg
                                  className="h-[15px] w-[15px]"
                                  viewBox="0 0 24 24"
                                  fill={isReactionHandled ? 'currentColor' : 'none'}
                                  stroke="currentColor"
                                  strokeWidth={isReactionHandled ? 1.5 : 2}
                                  aria-hidden="true"
                                >
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                              </button>
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
                <svg className="h-8 w-8 text-[var(--color-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <p className="text-[var(--color-text-secondary)]">아직 호감을 보낸 피드가 없어요.</p>
              <Link
                href="/self-date"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white"
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
                />
              ))}
            </div>
          )
        )}
      </PageContent>

      {activeTab === 'mine' && myStories.length > 0 && (
        <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+12px)] right-4 z-40">
          <button
            type="button"
            onClick={() => setIsEditMode((prevIsEditMode) => !prevIsEditMode)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-transform active:scale-95"
            aria-label={isEditMode ? '편집 완료' : '피드 수정 모드 열기'}
          >
            {isEditMode ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                  handleStartReactionChat(selectedReaction.reaction);
                  setSelectedReaction(null);
                }}
                className="flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-4 py-3 font-medium text-white"
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
            <div className="rounded-[22px] bg-[var(--color-surface-secondary)] px-4 py-5">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {reactionMenuTarget.reaction.fromUser.nickname}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                필요한 작업을 선택해 주세요.
              </p>
            </div>

            <div className="mt-5 space-y-2">
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
        title="피드 수정"
      >
        <div className="px-5 pb-5 pt-4">
          <div className="space-y-4">
            <div className="rounded-[22px] bg-[var(--color-surface-secondary)] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">대표 이미지</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                    분위기를 보여주는 사진 한 장만 바꿔도 피드 인상이 달라져요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => editImageInputRef.current?.click()}
                  disabled={isUpdatingEditImage}
                  className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]"
                >
                  {editImage ? '이미지 변경' : '이미지 추가'}
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[20px] bg-white">
                {editImage ? (
                  <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-surface)]">
                    <Image
                      src={editImage.previewUrl}
                      alt="수정 중인 피드 이미지"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditImage(null)}
                      className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white"
                    >
                      제거
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editImageInputRef.current?.click()}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-2 text-[var(--color-text-tertiary)]"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-sm">이미지를 추가해보세요</span>
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[22px] bg-[var(--color-surface-secondary)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">글 수정</p>
                <span className="text-xs text-[var(--color-text-tertiary)]">{editText.length}/200</span>
              </div>

              <textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value.slice(0, 200))}
                placeholder="피드 내용을 수정해주세요."
                className="mt-3 h-36 w-full resize-none rounded-[18px] border border-white/70 bg-white px-4 py-4 text-[14px] leading-6 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

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
                disabled={!editText.trim()}
                className="rounded-2xl bg-[var(--color-primary)] py-3 font-medium text-white disabled:opacity-50"
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
                onClick={handleConfirmReactionAction}
                className={`rounded-2xl py-3 font-medium text-white ${
                  reactionActionTarget.action === 'report'
                    ? 'bg-[var(--color-secondary)]'
                    : 'bg-[var(--color-text-primary)]'
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
