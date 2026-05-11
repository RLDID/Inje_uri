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

export function ChatBubble({ message, currentUserId }: ChatBubbleProps) {
  const isMine = message.senderId === currentUserId;
  
  // 시스템 메시지 처리
  if (message.type === 'system') {
    return <SystemMessage content={message.content} />;
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
        <p className="text-[15px] leading-5 whitespace-pre-wrap break-words">
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
