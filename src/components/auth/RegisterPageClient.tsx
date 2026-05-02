'use client';

import type { ReactNode } from 'react';
import { FormEvent, startTransition, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, Card, useToast } from '@/components/ui';
import { PRE_AUTH_CREDENTIALS_STORAGE_KEY } from '@/lib/auth/constants';
import { APP_NAME } from '@/lib/constants';

interface RegisterApiResponse {
  success?: boolean;
  data?: {
    nextPath?: string;
  };
  error?: {
    message?: string;
  };
}

interface RegisterFormState {
  loginId: string;
  password: string;
  nickname: string;
  birth: string;
  age: string;
  studentYear: string;
  department: string;
  gender: 'male' | 'female';
  realName: string;
  email: string;
  university: string;
}

const INITIAL_FORM_STATE: RegisterFormState = {
  loginId: '',
  password: '',
  nickname: '',
  birth: '',
  age: '',
  studentYear: '',
  department: '',
  gender: 'male',
  realName: '',
  email: '',
  university: '인제대학교',
};

function resolveNextPath(nextPath: string | null): string | null {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return null;
  }

  return nextPath;
}

function resolveLoginPath(nextPath: string | null): string {
  const resolvedNextPath = resolveNextPath(nextPath);
  if (!resolvedNextPath) {
    return '/login';
  }

  return `/login?next=${encodeURIComponent(resolvedNextPath)}`;
}

export function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM_STATE);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.sessionStorage.getItem(PRE_AUTH_CREDENTIALS_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { loginId?: unknown; password?: unknown; birth?: unknown };
      const prefilledLoginId = typeof parsed.loginId === 'string' ? parsed.loginId.trim() : '';
      const prefilledPassword = typeof parsed.password === 'string' ? parsed.password : '';
      const prefilledBirth = typeof parsed.birth === 'string' ? parsed.birth.replace(/\D/g, '').slice(0, 6) : '';

      if (!prefilledLoginId && !prefilledPassword && !prefilledBirth) {
        return;
      }

      setForm((prev) => ({
        ...prev,
        loginId: prev.loginId || prefilledLoginId,
        password: prev.password || prefilledPassword,
        birth: prev.birth || prefilledBirth,
      }));
    } catch {
      window.sessionStorage.removeItem(PRE_AUTH_CREDENTIALS_STORAGE_KEY);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          age: Number(form.age),
          studentYear: Number(form.studentYear),
          birth: form.birth.trim(),
        }),
      });

      let payload: RegisterApiResponse = {};
      try {
        payload = await response.json() as RegisterApiResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.success) {
        const message = payload.error?.message ?? '회원가입에 실패했습니다.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(PRE_AUTH_CREDENTIALS_STORAGE_KEY);
      }

      showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
      const apiNextPath = payload.data?.nextPath?.startsWith('/') ? payload.data.nextPath : '/login';
      const nextPath = apiNextPath === '/login'
        ? resolveLoginPath(searchParams.get('next'))
        : apiNextPath;

      startTransition(() => {
        router.replace(nextPath);
      });
    } catch {
      const message = '회원가입 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PageContainer withBottomNav={false} className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top,#e9f7fb_0%,#f3f7f8_45%,#eef3f4_100%)]">
      <main className="flex flex-1 items-center px-[var(--page-padding-x)] py-10">
        <Card variant="elevated" padding="lg" className="w-full border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border-light))] bg-white/95 backdrop-blur">
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[26px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
              회원가입
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              인증된 학번 정보와 생년월일로 계정을 생성합니다.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <LabeledInput label="아이디">
              <input
                type="text"
                value={form.loginId}
                onChange={(event) => updateField('loginId', event.target.value)}
                placeholder="아이디"
                autoComplete="username"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="비밀번호">
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="비밀번호"
                autoComplete="new-password"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="닉네임">
              <input
                type="text"
                value={form.nickname}
                onChange={(event) => updateField('nickname', event.target.value)}
                placeholder="닉네임"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="생년월일 (6자리)">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.birth}
                onChange={(event) => updateField('birth', event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="예: 020408"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="나이">
              <input
                type="number"
                min={1}
                max={100}
                value={form.age}
                onChange={(event) => updateField('age', event.target.value)}
                placeholder="나이"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="학년">
              <input
                type="number"
                min={1}
                max={8}
                value={form.studentYear}
                onChange={(event) => updateField('studentYear', event.target.value)}
                placeholder="1~8"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="학과">
              <input
                type="text"
                value={form.department}
                onChange={(event) => updateField('department', event.target.value)}
                placeholder="학과"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="성별">
              <select
                value={form.gender}
                onChange={(event) => updateField('gender', event.target.value as 'male' | 'female')}
                className={inputClassName}
                disabled={isSubmitting}
              >
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </LabeledInput>

            <LabeledInput label="이름">
              <input
                type="text"
                value={form.realName}
                onChange={(event) => updateField('realName', event.target.value)}
                placeholder="이름"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="이메일">
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="이메일"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            <LabeledInput label="대학교">
              <input
                type="text"
                value={form.university}
                onChange={(event) => updateField('university', event.target.value)}
                placeholder="대학교"
                className={inputClassName}
                disabled={isSubmitting}
              />
            </LabeledInput>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl border border-[var(--color-secondary)]/25 bg-[var(--color-secondary-light)]/70 px-3 py-2 text-sm text-[var(--color-secondary-dark)]"
              >
                {errorMessage}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              회원가입
            </Button>
          </form>
        </Card>
      </main>
    </PageContainer>
  );
}

function LabeledInput({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">{label}</label>
      {children}
    </div>
  );
}

const inputClassName = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20';
