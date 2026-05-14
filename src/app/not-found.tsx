import Image from 'next/image';
import Link from 'next/link';
import { PageContainer, PageContent } from '@/components/layout';

export default function NotFound() {
  return (
    <PageContainer withBottomNav={false} className="min-h-dvh">
      <PageContent className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center" noPadding>
        <div className="w-full max-w-[320px]">
          <Image
            src="/brand/404.png"
            alt="페이지를 찾을 수 없어요"
            width={640}
            height={640}
            priority
            className="h-auto w-full object-contain"
          />
        </div>

        <h1 className="mt-8 text-[22px] font-semibold text-[var(--color-text-primary)]">
          페이지를 찾을 수 없어요
        </h1>
        <p className="mt-3 break-keep text-sm leading-6 text-[var(--color-text-secondary)]">
          주소가 바뀌었거나 사라진 페이지예요.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-action-primary)] px-6 text-[15px] font-semibold text-[var(--color-action-primary-text)] transition-transform active:scale-[0.99]"
        >
          홈으로 가기
        </Link>
      </PageContent>
    </PageContainer>
  );
}
