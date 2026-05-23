'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageContainer, PageHeader, PageContent } from '@/components/layout';
import { ProfilePreview } from '@/components/profile/ProfilePreview';
import { Button, CenteredModal, ConfirmSheet, useToast } from '@/components/ui';
import { declineInterest } from '@/lib/api/interests';
import { getMe } from '@/lib/api/profile';
import { dismissRecommendation, selectRecommendation } from '@/lib/api/recommendations';
import { blockUser, reportTarget } from '@/lib/api/safety';
import { getUserProfile, type UserProfileDetail } from '@/lib/api/users';
import {
  buildChatRoomHref,
  readRouteViewState,
  useCurrentRouteContext,
  useSafeBack,
  writeRouteViewState,
} from '@/lib/navigation';
import { readSelfDateHiddenUserIds, writeSelfDateHiddenUserIds } from '@/lib/utils';
import { recordRecentProfileView } from '@/lib/utils/recentProfiles';

type ProfileSource = 'recommendation' | 'interest' | 'self-date' | 'chat';
type ModalAction = 'hide_recommendation' | 'reject' | 'block' | 'report' | null;
const MATCH_VIEW_STATE_KEY = 'match:daily-recommendation';

interface MatchViewState {
  currentIndex: number;
  viewedCount: number;
  selectedUserId?: string;
  isSelectionMade: boolean;
  hiddenUserIds?: string[];
}

function toPositiveNumberParam(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function ProfileDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { currentPath, sourcePath } = useCurrentRouteContext();
  const { goBack, fallbackPath } = useSafeBack();

  const userId = params.id as string;
  const source = (searchParams.get('source') as ProfileSource) || 'recommendation';
  const recommendationItemId = toPositiveNumberParam(searchParams.get('recommendationItemId'));
  const interestId = toPositiveNumberParam(searchParams.get('interestId'));
  const initialRecommendationViewState = source === 'recommendation'
    ? readRouteViewState<MatchViewState>(MATCH_VIEW_STATE_KEY, {
      currentIndex: 0,
      viewedCount: 0,
      isSelectionMade: false,
      hiddenUserIds: [],
    })
    : {
      currentIndex: 0,
      viewedCount: 0,
      isSelectionMade: false,
      hiddenUserIds: [],
    };

  const [showMenu, setShowMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ModalAction>(null);
  const [recommendationViewState, setRecommendationViewState] = useState<MatchViewState>(initialRecommendationViewState);
  const [profileDetail, setProfileDetail] = useState<UserProfileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const user = profileDetail?.user ?? null;

  const chatButtonStatus = useMemo(
    () => {
      if (profileDetail?.relationship.hasActiveChat && profileDetail.relationship.chatRoomId) {
        return { type: 'existing_chat' as const, chatId: String(profileDetail.relationship.chatRoomId) };
      }

      return { type: 'can_create' as const };
    },
    [profileDetail],
  );

  const isFromInterest = source === 'interest';
  const isFromRecommendation = source === 'recommendation';
  const isFromSelfDate = source === 'self-date';
  const isFromChat = source === 'chat';
  const hasExistingChat = chatButtonStatus.type === 'existing_chat';
  const hasStickyActions = false;

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const [detail, me] = await Promise.all([
          getUserProfile(userId),
          getMe(),
        ]);

        if (cancelled) {
          return;
        }

        setProfileDetail(detail);
        setLoadError(null);

        if (detail.user.id !== me.id) {
          recordRecentProfileView(detail.user.id);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : '프로필을 불러오지 못했어요.');
          showToast(error instanceof Error ? error.message : '프로필을 불러오지 못했어요.', 'error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [showToast, source, userId]);

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="프로필" showBack onBack={goBack} />
        <PageContent>
          <div className="py-20 text-center">
            <p className="text-[var(--color-text-secondary)]">프로필을 불러오는 중이에요</p>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <PageHeader title="프로필" showBack onBack={goBack} />
        <PageContent>
          <div className="py-20 text-center">
            <p className="text-[var(--color-text-secondary)]">{loadError ?? '프로필을 찾을 수 없어요'}</p>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  const handleMenuAction = (action: ModalAction) => {
    setShowMenu(false);
    setConfirmAction(action);
  };

  const handleDestructiveAction = async () => {
    if (!confirmAction) {
      return;
    }

    try {
      if (confirmAction === 'block') {
        await blockUser(user.id);
      }

      if (confirmAction === 'report') {
        await reportTarget({
          targetType: 'user',
          targetId: user.id,
          reasonType: 'inappropriate',
          description: null,
        });
      }

      if (isFromSelfDate && (confirmAction === 'report' || confirmAction === 'block')) {
        const hiddenUserIds = readSelfDateHiddenUserIds();
        writeSelfDateHiddenUserIds(Array.from(new Set([...hiddenUserIds, user.id])));
      }

      showToast(
        confirmAction === 'report'
          ? '신고가 접수되었어요.'
          : '사용자를 차단했어요.',
        'success',
      );
      setConfirmAction(null);
      router.replace(isFromSelfDate ? '/self-date' : fallbackPath);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '요청을 처리하지 못했어요.', 'error');
    }
  };

  const handleHideRecommendation = async () => {
    if (!recommendationItemId) {
      showToast('추천 항목 정보를 확인할 수 없어 제외 처리하지 못했어요.', 'error');
      setConfirmAction(null);
      return;
    }

    try {
      await dismissRecommendation(recommendationItemId);

      const currentViewState = readRouteViewState<MatchViewState>(MATCH_VIEW_STATE_KEY, {
        currentIndex: 0,
        viewedCount: 0,
        isSelectionMade: false,
        hiddenUserIds: [],
      });
      const nextViewState: MatchViewState = {
        ...currentViewState,
        hiddenUserIds: [],
      };

      writeRouteViewState<MatchViewState>(MATCH_VIEW_STATE_KEY, nextViewState);
      setRecommendationViewState(nextViewState);
      showToast('다음 추천부터 반영돼요.', 'success');
      setConfirmAction(null);
      router.replace(fallbackPath);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '추천 제외를 처리하지 못했어요.', 'error');
    }
  };

  const handleReject = async () => {
    if (!interestId) {
      showToast('받은 하트 정보를 확인할 수 없어 거절 처리하지 못했어요.', 'error');
      setConfirmAction(null);
      return;
    }

    try {
      await declineInterest(interestId);
      showToast('하트를 거절했어요.', 'success');
      setConfirmAction(null);
      router.replace(fallbackPath);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '하트를 거절하지 못했어요.', 'error');
    }
  };

  const handleStartChat = () => {
    if (chatButtonStatus.type === 'existing_chat') {
      router.push(
        buildChatRoomHref(chatButtonStatus.chatId, {
          sourcePath: currentPath,
          fallbackPath: currentPath,
        }),
      );
      return;
    }

    showToast('채팅을 시작할 수 있어요.', 'success');
    router.replace('/interest');
  };

  const handleSendRecommendationInterest = async () => {
    if (!recommendationItemId) {
      showToast('추천 항목 정보를 확인할 수 없어 하트를 보내지 못했어요.', 'error');
      return;
    }

    const currentViewState = readRouteViewState<MatchViewState>(MATCH_VIEW_STATE_KEY, {
      currentIndex: 0,
      viewedCount: 0,
      isSelectionMade: false,
      hiddenUserIds: [],
    });

    if (currentViewState.isSelectionMade) {
      if (currentViewState.selectedUserId === user.id) {
        return;
      }

      showToast('오늘은 이미 하트를 보냈어요.', 'info');
      return;
    }

    const nextViewState: MatchViewState = {
      ...currentViewState,
      selectedUserId: user.id,
      isSelectionMade: true,
    };

    try {
      const result = await selectRecommendation(recommendationItemId);
      writeRouteViewState<MatchViewState>(MATCH_VIEW_STATE_KEY, nextViewState);
      setRecommendationViewState(nextViewState);
      showToast(result.chat_room_id ? '채팅이 시작되었어요.' : '하트를 보냈어요!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '하트를 보내지 못했어요.', 'error');
    }
  };

  const getActionConfig = (action: ModalAction) => {
    switch (action) {
      case 'hide_recommendation':
        return {
          title: '다음 추천부터 제외할까요?',
          description: '오늘우리의 오늘 추천 목록에는 그대로 남고, 다음 추천부터 반영돼요.',
          confirmText: '추천 안 하기',
          onConfirm: handleHideRecommendation,
          destructive: false,
        };
      case 'reject':
        return {
          title: '하트를 거절할까요?',
          description: '거절하면 받은 하트 목록에서 사라져요.',
          confirmText: '하트 거절하기',
          onConfirm: handleReject,
          destructive: false,
        };
      case 'block':
        return {
          title: '이 사람을 차단할까요?',
          description: '차단하면 더 이상 이 사람과 대화하거나 프로필을 볼 수 없어요.',
          confirmText: '차단하기',
          onConfirm: handleDestructiveAction,
          destructive: true,
        };
      case 'report':
        return {
          title: '이 사람을 신고할까요?',
          description: '신고 내용은 운영팀에 전달돼요. 허위 신고는 제재될 수 있어요.',
          confirmText: '신고하기',
          onConfirm: handleDestructiveAction,
          destructive: true,
        };
      default:
        return {
          title: '',
          description: '',
          confirmText: '',
          onConfirm: () => undefined,
          destructive: false,
        };
    }
  };

  const confirmConfig = confirmAction ? getActionConfig(confirmAction) : null;

  return (
    <PageContainer>
      <PageHeader
        title=""
        showBack
        onBack={goBack}
        showBorder={false}
        action={(
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
            aria-label="프로필 옵션"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        )}
      />

      <PageContent className={hasStickyActions ? 'page-with-sticky-cta' : ''} noPadding>
        <ProfilePreview
          user={user}
          source={source}
          onSendInterest={isFromRecommendation ? handleSendRecommendationInterest : undefined}
          isInterestSent={recommendationViewState.selectedUserId === user.id}
          isInterestDisabled={recommendationViewState.isSelectionMade && recommendationViewState.selectedUserId !== user.id}
        />
      </PageContent>

      {hasStickyActions && (
        <div className="sticky-cta-container">
          <div className="action-stack mx-auto max-w-[430px]">
            {isFromInterest && (
              <>
                <Button fullWidth size="lg" onClick={handleStartChat}>
                  {hasExistingChat ? '대화 이어가기' : '맞호감 보내기'}
                </Button>
                <Button variant="secondary" size="lg" onClick={goBack}>
                  목록으로
                </Button>
              </>
            )}

            {isFromSelfDate && (
              <>
                <Button fullWidth size="lg" onClick={handleStartChat}>
                  {hasExistingChat ? '대화 이어가기' : '호감 확인하기'}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push(sourcePath ?? fallbackPath)}
                >
                  피드로 돌아가기
                </Button>
              </>
            )}

            {isFromChat && (
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  if (chatButtonStatus.type === 'existing_chat') {
                    router.push(
                      sourcePath ??
                        buildChatRoomHref(chatButtonStatus.chatId, {
                          fallbackPath: '/chat',
                        }),
                    );
                    return;
                  }

                  router.push(sourcePath ?? '/chat');
                }}
              >
                {chatButtonStatus.type === 'existing_chat' ? '대화 이어가기' : '채팅 목록으로'}
              </Button>
            )}
          </div>
        </div>
      )}

      <CenteredModal isOpen={showMenu} onClose={() => setShowMenu(false)} title="옵션">
        <div className="divide-y divide-[var(--color-border)]">
          {(isFromRecommendation || isFromInterest) && (
            <button
              type="button"
              onClick={() => handleMenuAction('hide_recommendation')}
              className="w-full px-5 py-4 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              <p className="font-medium text-[var(--color-text-primary)]">이 사람 추천 안 하기</p>
            </button>
          )}

          {isFromInterest && !hasExistingChat && (
            <button
              type="button"
              onClick={() => handleMenuAction('reject')}
              className="w-full px-5 py-4 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              <p className="font-medium text-[var(--color-text-primary)]">하트 거절하기</p>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleMenuAction('block')}
            className="w-full px-5 py-4 text-left text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-bg)]"
          >
            <p className="font-medium">차단하기</p>
          </button>

          <button
            type="button"
            onClick={() => handleMenuAction('report')}
            className="w-full px-5 py-4 text-left text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-bg)]"
          >
            <p className="font-medium">신고하기</p>
          </button>
        </div>
      </CenteredModal>

      {confirmConfig && (
        <ConfirmSheet
          isOpen
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmText={confirmConfig.confirmText}
          cancelText="취소"
          variant={confirmConfig.destructive ? 'destructive' : 'default'}
        />
      )}
    </PageContainer>
  );
}

export default function ProfileDetailPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <ProfileDetailPageContent />
    </Suspense>
  );
}
