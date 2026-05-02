'use client';

import { useRef, useState, FormEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
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

  const doSend = () => {
    const currentMessage = textareaRef.current?.value ?? message;
    const trimmed = currentMessage.trim();

    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSend();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="relative flex min-h-12 flex-1 items-center">
        <textarea
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
          rows={1}
          className="
            max-h-32 min-h-12 w-full resize-none rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-secondary)] px-4 py-3
            text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30
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
        type="submit"
        disabled={disabled}
        className="
          flex h-12 w-12 shrink-0 items-center justify-center rounded-full
          bg-[var(--color-primary)] text-white shadow-sm
          disabled:cursor-not-allowed disabled:opacity-50
          transition-transform active:scale-95
        "
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </form>
  );
}
