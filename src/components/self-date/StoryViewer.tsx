'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Badge, Button } from '@/components/ui';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { getStoryTimeRemaining } from '@/lib/data';
import { buildProfileDetailHref } from '@/lib/navigation';
import type { Story } from '@/lib/types';

interface StoryViewerProps {
  story: Story;
  onClose: () => void;
}

export function StoryViewer({ story, onClose }: StoryViewerProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState(getStoryTimeRemaining(story));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getStoryTimeRemaining(story));
    }, 60_000);

    return () => clearInterval(interval);
  }, [story]);

  const { author, content } = story;
  const timeLabel = timeRemaining.isExpired
    ? '곧 사라질 수 있어요'
    : `${timeRemaining.hours}시간 ${timeRemaining.minutes}분 남음`;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="mb-4 h-1 rounded-full bg-white/30">
          <div className="h-full w-full rounded-full bg-white" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full">
              <Image
                src={author.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE}
                alt={author.nickname}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{author.nickname}</p>
              <p className="text-sm text-white/70">{timeLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-white"
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {content.images[0] ? (
          <Image src={content.images[0]} alt="스토리 이미지" fill className="object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] p-8">
            <p className="text-center text-2xl font-medium leading-relaxed text-white">{content.text}</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
        <div className="mx-auto flex max-w-[430px] flex-col gap-4">
          {content.text && content.images[0] && (
            <p className="text-center text-white">{content.text}</p>
          )}

          {content.question && (
            <div className="rounded-3xl bg-white/20 p-4 backdrop-blur-sm">
              <p className="mb-3 text-center text-white">{content.question}</p>
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  router.push(
                    buildProfileDetailHref(author.id, 'self-date', {
                      sourcePath: '/self-date',
                      sourceSection: 'self-date',
                      fallbackPath: '/self-date',
                    }),
                  );
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mr-1.5 inline-block -mt-0.5"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                프로필로 이어보기
              </Button>
            </div>
          )}

          <div className="chip-wrap justify-center text-white/85">
            <Badge variant="primary" size="sm">
              {author.department}
            </Badge>
            {author.mbti && <span className="text-sm">{author.mbti}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
