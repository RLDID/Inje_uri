'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Button } from './Button';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-auto" role="dialog" aria-modal="true">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 시트 본체 - 앱 컨테이너 내부 정렬 */}
      <div className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 overflow-hidden rounded-t-[24px] bg-[var(--color-surface)] shadow-xl">
        {/* 헤더: 닫기 버튼 + 제목 */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-4 py-3">
          <div className="w-10" />
          {title && (
            <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 콘텐츠 영역 - 충분한 하단 패딩 */}
        <div className="max-h-[70vh] overflow-y-auto pb-8">{children}</div>
      </div>
    </div>
  );
}

interface CenteredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function CenteredModal({ isOpen, onClose, title, children }: CenteredModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-xs overflow-hidden rounded-[24px] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-lg">
        {title && (
          <div className="border-b border-[var(--color-border)] px-4 py-4">
            <h2 className="text-center text-lg font-semibold">{title}</h2>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  variant?: 'default' | 'destructive';
  showInput?: boolean;
  inputPlaceholder?: string;
  inputMaxLength?: number;
  inputRequired?: boolean;
}

export function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  destructive = false,
  variant = 'default',
  showInput = false,
  inputPlaceholder = '메시지를 입력해주세요',
  inputMaxLength = 100,
  inputRequired = false,
}: ConfirmSheetProps) {
  const [inputValue, setInputValue] = useState('');
  const isDestructive = variant === 'destructive' || destructive;

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  const handleConfirm = () => {
    if (showInput && inputRequired && !inputValue.trim()) {
      return;
    }

    onConfirm(showInput ? inputValue : undefined);
    setInputValue('');
    onClose();
  };

  const canConfirm = !showInput || !inputRequired || inputValue.trim().length > 0;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 pt-2">
        <h3 className="mb-2 text-center text-lg font-semibold tracking-[-0.02em]">{title}</h3>
        {description && <p className="mb-4 text-center text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>}

        {showInput && (
          <div className="mb-6">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, inputMaxLength))}
              placeholder={inputPlaceholder}
              className="h-24 w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
              maxLength={inputMaxLength}
            />
            <div className="mt-1 flex justify-end">
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {inputValue.length}/{inputMaxLength}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={handleConfirm} disabled={!canConfirm} variant={isDestructive ? 'danger' : 'primary'} size="md" fullWidth>
            {confirmText}
          </Button>
          <Button onClick={handleClose} variant="secondary" size="md" fullWidth>
            {cancelText}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
