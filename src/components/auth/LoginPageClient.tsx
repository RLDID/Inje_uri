'use client';

import { FormEvent, startTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, Card, useToast } from '@/components/ui';
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
    <PageContainer withBottomNav={false} className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <main className="flex flex-1 items-center px-[var(--page-padding-x)] py-10">
        <div className="w-full space-y-4">
          <Card variant="elevated" padding="lg" className="w-full border-[color-mix(in_srgb,var(--color-pink-cta)_18%,var(--color-border-light))] bg-[var(--color-surface)] backdrop-blur">
            <div className="mb-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                {APP_NAME}
              </p>
              <h1 className="mt-2 break-keep text-[26px] font-semibold text-[var(--color-text-primary)]">
                로그인
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                가입한 아이디와 비밀번호를 입력해주세요.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="loginId" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                  아이디
                </label>
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  autoComplete="username"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  placeholder="아이디"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/20"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/20"
                  disabled={isBusy}
                />
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-xl border border-[var(--color-pink-cta)]/25 bg-[var(--color-brand-pink)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                >
                  {errorMessage}
                </p>
              )}

              <Button type="submit" fullWidth size="lg" loading={isSubmitting} disabled={isBusy}>
                로그인
              </Button>
            </form>

            <div className="mt-5 space-y-3 border-t border-[var(--color-border-light)] pt-5">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                size="lg"
                disabled={isBusy}
                onClick={() => pushAuthPath('/register')}
              >
                회원가입
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  disabled={isBusy}
                  onClick={() => router.push('/account-recovery?mode=id')}
                >
                  아이디 찾기
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  disabled={isBusy}
                  onClick={() => router.push('/account-recovery?mode=password')}
                >
                  비밀번호 찾기
                </Button>
              </div>
            </div>
          </Card>

        </div>

      </main>
    </PageContainer>
  );
}
