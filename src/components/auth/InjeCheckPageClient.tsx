'use client';

import { FormEvent, startTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, Card, useToast } from '@/components/ui';
import { PRE_AUTH_CREDENTIALS_STORAGE_KEY } from '@/lib/auth/constants';
import { APP_NAME } from '@/lib/constants';

interface InjeCheckResponse {
  success?: boolean;
  data?: {
    nextStep?: 'login' | 'register';
  };
  error?: {
    message?: string;
  };
}

interface LoginApiResponse {
  success?: boolean;
  error?: {
    message?: string;
  };
}

function resolveNextQuery(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '';
  }

  return `?next=${encodeURIComponent(nextPath)}`;
}

function resolveNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/match';
  }

  return nextPath;
}

export function InjeCheckPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [studentNumber, setStudentNumber] = useState('');
  const [birth, setBirth] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [recommendedNextStep, setRecommendedNextStep] = useState<'login' | 'register'>('register');

  const isSubmitting = isVerifying || isLoggingIn;

  const validateCredentials = (): { loginId: string; password: string } | null => {
    const normalizedLoginId = loginId.trim();
    const normalizedPassword = password.trim();

    if (!normalizedLoginId || !normalizedPassword) {
      const message = '아이디와 비밀번호를 모두 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return null;
    }

    return {
      loginId: normalizedLoginId,
      password: normalizedPassword,
    };
  };

  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedStudentNumber = studentNumber.trim();
    const normalizedBirth = birth.trim();
    if (!normalizedStudentNumber || !normalizedBirth) {
      const message = '학번과 생년월일을 모두 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!/^\d{6}$/.test(normalizedBirth)) {
      const message = '생년월일은 6자리 숫자로 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/inje-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: normalizedStudentNumber,
          birth: normalizedBirth,
        }),
      });

      let payload: InjeCheckResponse = {};
      try {
        payload = await response.json() as InjeCheckResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.success) {
        const message = payload.error?.message ?? '인증에 실패했습니다. 다시 시도해주세요.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      setIsVerified(true);
      setRecommendedNextStep(payload.data?.nextStep === 'login' ? 'login' : 'register');
      setErrorMessage('');
      showToast('인증되었습니다. 로그인 또는 회원가입을 진행해주세요.', 'success');
    } catch {
      const message = '인증 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const credentials = validateCredentials();
    if (!credentials) {
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
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
      setIsLoggingIn(false);
    }
  };

  const handleRegisterClick = () => {
    if (typeof window !== 'undefined') {
      const prefilledCredentials = {
        loginId: loginId.trim(),
        password: password.trim(),
        birth: birth.trim(),
      };

      if (prefilledCredentials.loginId || prefilledCredentials.password || prefilledCredentials.birth) {
        window.sessionStorage.setItem(PRE_AUTH_CREDENTIALS_STORAGE_KEY, JSON.stringify(prefilledCredentials));
      } else {
        window.sessionStorage.removeItem(PRE_AUTH_CREDENTIALS_STORAGE_KEY);
      }
    }

    const nextQuery = resolveNextQuery(searchParams.get('next'));
    startTransition(() => {
      router.push(`/register${nextQuery}`);
    });
  };

  const resetVerification = () => {
    setIsVerified(false);
    setRecommendedNextStep('register');
    setErrorMessage('');
    setLoginId('');
    setPassword('');
  };

  return (
    <PageContainer
      withBottomNav={false}
      className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top,#e9f7fb_0%,#f3f7f8_45%,#eef3f4_100%)]"
    >
      <main className="flex flex-1 items-center px-[var(--page-padding-x)] py-10">
        <Card
          variant="elevated"
          padding="lg"
          className="w-full border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border-light))] bg-white/95 backdrop-blur"
        >
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[26px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
              학번 인증
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {!isVerified
                ? '학번과 생년월일을 입력해 인증을 진행해주세요.'
                : '인증이 완료되었습니다. 아이디와 비밀번호를 입력한 뒤 로그인 또는 회원가입을 선택해주세요.'}
            </p>
          </div>

          {!isVerified ? (
            <form className="space-y-4" onSubmit={handleVerifySubmit}>
              <div>
                <label htmlFor="studentNumber" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                  학번
                </label>
                <input
                  id="studentNumber"
                  name="studentNumber"
                  type="text"
                  inputMode="numeric"
                  value={studentNumber}
                  onChange={(event) => setStudentNumber(event.target.value)}
                  placeholder="예: 20231234"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="birth" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                  생년월일 (6자리)
                </label>
                <input
                  id="birth"
                  name="birth"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={birth}
                  onChange={(event) => setBirth(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="예: 020408"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  disabled={isSubmitting}
                />
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-xl border border-[var(--color-secondary)]/25 bg-[var(--color-secondary-light)]/70 px-3 py-2 text-sm text-[var(--color-secondary-dark)]"
                >
                  {errorMessage}
                </p>
              )}

              <Button type="submit" fullWidth size="lg" loading={isVerifying}>
                인증
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)]/55 px-3 py-2 text-sm text-[var(--color-primary-dark)]">
                {recommendedNextStep === 'login'
                  ? '등록된 계정이 있으면 로그인, 신규 계정이면 회원가입을 진행하세요.'
                  : '신규 회원가입 또는 기존 계정 로그인을 진행할 수 있습니다.'}
              </p>

              <form className="space-y-4" onSubmit={handleLoginSubmit}>
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
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    disabled={isSubmitting}
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
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    disabled={isSubmitting}
                  />
                </div>

                {errorMessage && (
                  <p
                    role="alert"
                    className="rounded-xl border border-[var(--color-secondary)]/25 bg-[var(--color-secondary-light)]/70 px-3 py-2 text-sm text-[var(--color-secondary-dark)]"
                  >
                    {errorMessage}
                  </p>
                )}

                <Button type="submit" fullWidth size="lg" loading={isLoggingIn}>
                  로그인
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  size="lg"
                  disabled={isSubmitting}
                  onClick={handleRegisterClick}
                >
                  회원가입
                </Button>
              </form>

              <Button type="button" variant="ghost" fullWidth disabled={isSubmitting} onClick={resetVerification}>
                다시 인증하기
              </Button>
            </div>
          )}
        </Card>
      </main>
    </PageContainer>
  );
}
