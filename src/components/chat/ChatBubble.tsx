import type { Message } from '@/lib/types';
import { currentUser } from '@/lib/data';
import { formatMessageTime } from '@/lib/utils';

interface ChatBubbleProps {
  message: Message;
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

export function ChatBubble({ message }: ChatBubbleProps) {
  const isMine = message.senderId === currentUser.id;
  
  // 시스템 메시지 처리
  if (message.type === 'system') {
    return <SystemMessage content={message.content} />;
  }
  
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`
          max-w-[75%] px-4 py-2.5 rounded-2xl
          ${isMine 
            ? 'bg-[var(--color-primary)] text-white rounded-br-md' 
            : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] rounded-bl-md'
          }
        `}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p suppressHydrationWarning className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-[var(--color-text-tertiary)]'}`}>
          {formatMessageTime(new Date(message.createdAt))}
          {isMine && message.isRead && ' ✓'}
        </p>
      </div>
    </div>
  );
}
