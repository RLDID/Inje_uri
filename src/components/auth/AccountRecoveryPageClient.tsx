'use client';

import type { ReactNode } from 'react';
import { FormEvent, startTransition, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, Card, SegmentedControl, useToast } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';

type RecoveryMode = 'id' | 'password';

interface VerifyResponse {
  success?: boolean;
  data?: {
    loginId?: string;
  };
  error?: {
    message?: string;
  };
}

interface ResetPasswordResponse {
  success?: boolean;
  error?: {
    message?: string;
  };
}

function resolveMode(value: string | null): RecoveryMode {
  return value === 'password' ? 'password' : 'id';
}

export function AccountRecoveryPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [mode, setMode] = useState<RecoveryMode>(() => resolveMode(searchParams.get('mode')));
  const [studentNumber, setStudentNumber] = useState('');
  const [birth, setBirth] = useState('');
  const [loginId, setLoginId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const nextMode = resolveMode(searchParams.get('mode'));
    setMode(nextMode);
  }, [searchParams]);

  const resetResult = () => {
    setLoginId('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setIsVerified(false);
  };

  const handleModeChange = (nextMode: RecoveryMode) => {
    setMode(nextMode);
    resetResult();
    startTransition(() => {
      router.replace(`/account-recovery?mode=${nextMode}`);
    });
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
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
      const response = await fetch('/api/auth/account-recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: normalizedStudentNumber,
          birth: normalizedBirth,
        }),
      });

      let payload: VerifyResponse = {};
      try {
        payload = await response.json() as VerifyResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.success || !payload.data?.loginId) {
        const message = payload.error?.message ?? '일치하는 계정을 찾을 수 없습니다.';
        setErrorMessage(message);
        setIsVerified(false);
        showToast(message, 'error');
        return;
      }

      setLoginId(payload.data.loginId);
      setIsVerified(true);
      showToast('본인 확인이 완료되었습니다.', 'success');
    } catch {
      const message = '계정 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      setIsVerified(false);
      showToast(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isVerified) {
      const message = '먼저 본인 확인을 완료해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (newPassword.trim().length < 8) {
      const message = '새 비밀번호는 8자 이상이어야 합니다.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = '새 비밀번호가 서로 일치하지 않습니다.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsResetting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/account-recovery/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      let payload: ResetPasswordResponse = {};
      try {
        payload = await response.json() as ResetPasswordResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.success) {
        const message = payload.error?.message ?? '비밀번호 재설정에 실패했습니다.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      showToast('비밀번호가 재설정되었습니다. 다시 로그인해주세요.', 'success');
      startTransition(() => {
        router.replace('/login');
      });
    } catch {
      const message = '비밀번호 재설정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const isBusy = isVerifying || isResetting;

  return (
    <PageContainer withBottomNav={false} className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top,#e9f7fb_0%,#f3f7f8_45%,#eef3f4_100%)]">
      <main className="flex flex-1 items-center px-[var(--page-padding-x)] py-10">
        <Card variant="elevated" padding="lg" className="w-full border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border-light))] bg-white/95 backdrop-blur">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[26px] font-semibold text-[var(--color-text-primary)]">
              계정 찾기
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              가입할 때 인증한 학번과 생년월일로 본인 확인을 진행합니다.
            </p>
          </div>

          <SegmentedControl
            options={[
              { value: 'id', label: '아이디 찾기' },
              { value: 'password', label: '비밀번호 재설정' },
            ]}
            value={mode}
            onChange={handleModeChange}
            className="mb-6 w-full"
            size="sm"
          />

          <form className="space-y-4" onSubmit={handleVerify}>
            <LabeledInput label="학번">
              <input
                type="text"
                inputMode="numeric"
                value={studentNumber}
                onChange={(event) => {
                  setStudentNumber(event.target.value);
                  resetResult();
                }}
                placeholder="예: 20231234"
                className={inputClassName}
                disabled={isBusy}
              />
            </LabeledInput>

            <LabeledInput label="생년월일 (6자리)">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={birth}
                onChange={(event) => {
                  setBirth(event.target.value.replace(/\D/g, '').slice(0, 6));
                  resetResult();
                }}
                placeholder="예: 020408"
                className={inputClassName}
                disabled={isBusy}
              />
            </LabeledInput>

            <Button type="submit" fullWidth size="lg" loading={isVerifying}>
              본인 확인
            </Button>
          </form>

          {isVerified && (
            <div className="mt-5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)]/55 px-4 py-3 text-sm text-[var(--color-primary-dark)]">
              아이디는 <strong>{loginId}</strong> 입니다.
            </div>
          )}

          {mode === 'password' && isVerified && (
            <form className="mt-5 space-y-4" onSubmit={handleResetPassword}>
              <LabeledInput label="새 비밀번호">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="8자 이상"
                  autoComplete="new-password"
                  className={inputClassName}
                  disabled={isBusy}
                />
              </LabeledInput>

              <LabeledInput label="새 비밀번호 확인">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="새 비밀번호 확인"
                  autoComplete="new-password"
                  className={inputClassName}
                  disabled={isBusy}
                />
              </LabeledInput>

              <Button type="submit" fullWidth size="lg" loading={isResetting}>
                비밀번호 재설정
              </Button>
            </form>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-[var(--color-secondary)]/25 bg-[var(--color-secondary-light)]/70 px-3 py-2 text-sm text-[var(--color-secondary-dark)]"
            >
              {errorMessage}
            </p>
          )}

          <Button
            type="button"
            variant="ghost"
            fullWidth
            className="mt-5"
            disabled={isBusy}
            onClick={() => router.push('/login')}
          >
            로그인으로 돌아가기
          </Button>
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

const inputClassName = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-secondary)] disabled:text-[var(--color-text-tertiary)]';
