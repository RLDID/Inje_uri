'use client';

import { FormEvent, startTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StartPageAnimation } from '@/components/brand/StartPageAnimation';
import { PageContainer } from '@/components/layout';
import { useToast } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';

interface LoginApiResponse {
  success?: boolean;
  data?: {
    user?: {
      onboardingCompleted?: boolean;
    };
  };
  error?: {
    message?: string;
  };
}

function resolveNextPath(nextPath: string | null | undefined): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/match';
  }
  return nextPath;
}

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isSubmitting;

  const pushAuthPath = (path: string) => {
    const next = searchParams.get('next');
    const query = next && next.startsWith('/') && !next.startsWith('//')
      ? `?next=${encodeURIComponent(next)}`
      : '';

    startTransition(() => {
      router.push(`${path}${query}`);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedLoginId = loginId.trim();
    const normalizedPassword = password.trim();
    if (!normalizedLoginId || !normalizedPassword) {
      const message = '아이디와 비밀번호를 모두 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginId: normalizedLoginId,
          password: normalizedPassword,
        }),
      });

      let payload: LoginApiResponse = {};
      try {
        payload = await response.json() as LoginApiResponse;
      } catch {
        payload = {};
      }

      if (response.ok && payload.success) {
        showToast('로그인되었습니다.', 'success');
        const nextPath = resolveNextPath(searchParams.get('next'));
        if (payload.data?.user?.onboardingCompleted === false) {
          const nextQuery = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
          startTransition(() => {
            router.replace(`/register?step=categories${nextQuery}`);
          });
          return;
        }

        startTransition(() => {
          router.replace(nextPath);
        });
        return;
      }

      const message = payload.error?.message ?? '로그인에 실패했습니다.';
      setErrorMessage(message);
      showToast(message, 'error');
    } catch {
      const message = '로그인 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      withBottomNav={false}
      className="auth-background-page relative flex min-h-dvh flex-col overflow-hidden bg-white"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[44dvh] min-h-[300px] bg-contain bg-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/brand/login.png')" }}
      />

      <main className="relative z-10 flex flex-1 flex-col px-[var(--page-padding-x)] pb-8 pt-10">
        <div className="flex flex-1 items-center p-5 pb-[14vh]">
          <div className="mx-auto w-full max-w-[350px]">
            <div className="mb-8 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                {APP_NAME}
              </p>
              <h1 className="mt-2 break-keep text-[28px] font-semibold text-[var(--color-text-primary)]">
                로그인
              </h1>
            </div>

            <form className="w-full" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="loginId" className="sr-only">
                    아이디
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xl font-semibold text-[var(--color-text-secondary)]">
                    @
                  </span>
                  <input
                    id="loginId"
                    name="loginId"
                    type="text"
                    autoComplete="username"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    placeholder="아이디"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>

                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="password" className="sr-only">
                    비밀번호
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-[var(--color-pink-cta)]/25 bg-white/82 px-3 py-2 text-sm text-[var(--color-text-primary)] backdrop-blur-sm"
                >
                  {errorMessage}
                </p>
              )}

              <div className="mt-7 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => router.push('/account-recovery?mode=id')}
                  className="min-h-11 rounded-full px-1 text-sm font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                >
                  문제가 있나요?
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)]"
                  aria-label="로그인"
                >
                  {isSubmitting ? (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                    </svg>
                  ) : (
                    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mt-4 text-right">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => pushAuthPath('/register')}
                  className="rounded-full px-1 py-2 text-xs font-semibold text-[var(--color-text-secondary)] underline underline-offset-4 disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                >
                  회원가입
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <StartPageAnimation />
    </PageContainer>
  );
}
