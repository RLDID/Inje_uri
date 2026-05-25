'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import type { Message } from '@/lib/types';
import { formatMessageTime } from '@/lib/utils';

interface ChatBubbleProps {
  message: Message;
  currentUserId: string;
}

// 시스템 메시지 컴포넌트
export function SystemMessage({ content }: { content: string }) {
  return (
    <div className="my-4 flex justify-center" role="status" aria-live="polite">
      <div className="max-w-[85%] rounded-full bg-[var(--color-surface-secondary)] px-4 py-2">
        <p className="text-center text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          {content}
        </p>
      </div>
    </div>
  );
}

function ImageMessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const [isImageOpen, setIsImageOpen] = useState(false);

  const closeImage = useCallback(() => {
    setIsImageOpen(false);
  }, []);

  useEffect(() => {
    if (!isImageOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeImage, isImageOpen]);

  return (
    <>
      <div className={`mb-1.5 flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[72%] overflow-hidden rounded-[18px] shadow-sm ${
            isMine
              ? 'rounded-br-[6px] bg-[var(--color-action-primary)]'
              : 'rounded-bl-[6px] bg-[#EEF2F6]'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsImageOpen(true)}
            className="relative block h-44 w-44 max-w-[68vw] overflow-hidden bg-[var(--color-surface-secondary)]"
            aria-label="채팅 이미지 크게 보기"
          >
            <Image
              src={message.content}
              alt="채팅 이미지"
              fill
              sizes="176px"
              className="object-contain p-1.5"
            />
          </button>
          <p suppressHydrationWarning className={`px-2.5 py-1 text-[10px] leading-[14px] ${isMine ? 'text-white/75' : 'text-[var(--color-text-tertiary)]'}`}>
            {formatMessageTime(new Date(message.createdAt))}
            {isMine && message.isRead && ' ✓'}
          </p>
        </div>
      </div>

      {isImageOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[1000] bg-black/90 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-[calc(env(safe-area-inset-top,0px)+12px)]"
          role="dialog"
          aria-modal="true"
          aria-label="채팅 이미지 보기"
        >
          <div className="mx-auto flex h-full max-w-[430px] flex-col">
            <div className="flex min-h-12 justify-end">
              <button
                type="button"
                onClick={closeImage}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition-colors active:bg-white/20"
                aria-label="이미지 닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={closeImage}
              className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-2xl bg-black"
              aria-label="이미지 닫기"
            >
              <Image
                src={message.content}
                alt="채팅 이미지"
                fill
                sizes="(max-width: 430px) 100vw, 430px"
                className="object-contain"
                priority
              />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function ChatBubble({ message, currentUserId }: ChatBubbleProps) {
  const isMine = message.senderId === currentUserId;
  
  // 시스템 메시지 처리
  if (message.type === 'system') {
    return <SystemMessage content={message.content} />;
  }

  if (message.type === 'image') {
    return <ImageMessageBubble message={message} isMine={isMine} />;
  }
  
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`
          max-w-[75%] rounded-[16px] px-3.5 py-2
          ${isMine 
            ? 'rounded-br-[6px] bg-[var(--color-action-primary)] text-white'
            : 'rounded-bl-[6px] bg-[#EEF2F6] text-[var(--color-text-primary)]'
          }
        `}
      >
        <p data-clarity-mask className="text-[15px] leading-5 whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p suppressHydrationWarning className={`mt-0.5 text-[10px] leading-[14px] ${isMine ? 'text-white/75' : 'text-[var(--color-text-tertiary)]'}`}>
          {formatMessageTime(new Date(message.createdAt))}
          {isMine && message.isRead && ' ✓'}
        </p>
      </div>
    </div>
  );
}
