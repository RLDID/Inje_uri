'use client';

import { useRef, useState, FormEvent } from 'react';

const MAX_CHAT_MESSAGE_LENGTH = 1000;

interface ChatInputProps {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = '메시지를 입력하세요...' }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [message, setMessage] = useState('');

  const syncMessage = (nextMessage: string) => {
    setMessage(nextMessage);
  };

  const syncFromTextarea = () => {
    syncMessage(textareaRef.current?.value ?? '');
  };

  const keepTextareaFocused = () => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) {
      return;
    }

    textarea.focus({ preventScroll: true });
  };

  const doSend = () => {
    const currentMessage = textareaRef.current?.value ?? message;
    const trimmed = currentMessage.trim();

    if (trimmed && !disabled) {
      void Promise.resolve(onSend(trimmed)).finally(() => {
        keepTextareaFocused();
      });
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.value = '';
        keepTextareaFocused();
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSend();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 [@media(max-height:560px)]:p-2.5 [@media(max-height:500px)]:gap-1.5 [@media(max-height:500px)]:p-2"
    >
      <div className="relative flex min-h-12 flex-1 items-center [@media(max-height:560px)]:min-h-11 [@media(max-height:500px)]:min-h-10">
        <textarea
          data-clarity-mask
          ref={textareaRef}
          name="message"
          value={message}
          onInput={syncFromTextarea}
          onBeforeInput={syncFromTextarea}
          onChange={(e) => syncMessage(e.currentTarget.value)}
          onCompositionUpdate={(e) => syncMessage(e.currentTarget.value)}
          onCompositionEnd={(e) => syncMessage(e.currentTarget.value)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={MAX_CHAT_MESSAGE_LENGTH}
          rows={1}
          className="
            max-h-32 min-h-12 w-full resize-none rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-secondary)] px-4 py-3
            [@media(max-height:560px)]:min-h-11 [@media(max-height:560px)]:rounded-xl [@media(max-height:560px)]:px-3.5 [@media(max-height:560px)]:py-2.5
            [@media(max-height:500px)]:min-h-10 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2
            text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
            [@media(max-height:500px)]:text-[14px]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/30
            disabled:opacity-50
          "
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              doSend();
            }
          }}
        />
      </div>

      <button
        type="button"
        onPointerDown={(event) => {
          if (!disabled) {
            event.preventDefault();
          }
        }}
        onClick={doSend}
        disabled={disabled}
        aria-label="메시지 보내기"
        className="
          flex h-12 w-12 shrink-0 items-center justify-center rounded-full
          [@media(max-height:560px)]:h-11 [@media(max-height:560px)]:w-11
          [@media(max-height:500px)]:h-10 [@media(max-height:500px)]:w-10
          bg-[var(--color-action-primary)] text-white shadow-sm
          disabled:cursor-not-allowed disabled:opacity-50
          transition-transform active:scale-95
        "
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 [@media(max-height:500px)]:h-[18px] [@media(max-height:500px)]:w-[18px]">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </form>
  );
}
