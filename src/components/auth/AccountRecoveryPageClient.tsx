'use client';

import type { ReactNode } from 'react';
import { FormEvent, startTransition, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { useToast } from '@/components/ui';
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
  const [email, setEmail] = useState('');
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
    setEmail('');
    startTransition(() => {
      router.replace(`/account-recovery?mode=${nextMode}`);
    });
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedStudentNumber = studentNumber.trim();
    const normalizedBirth = birth.trim();
    const normalizedEmail = email.trim().toLowerCase();
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

    if (mode === 'password' && !normalizedEmail) {
      const message = '가입할 때 작성한 이메일을 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (mode === 'password' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const message = '이메일 형식을 확인해주세요.';
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
          mode,
          studentNumber: normalizedStudentNumber,
          birth: normalizedBirth,
          email: mode === 'password' ? normalizedEmail : undefined,
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
  const isPasswordResetReady = mode === 'password' && isVerified;

  return (
    <PageContainer
      withBottomNav={false}
      className="auth-background-page relative flex min-h-dvh flex-col overflow-hidden bg-white"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[44dvh] min-h-[300px] bg-contain bg-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/brand/reset.png')" }}
      />

      <main className="relative z-10 flex flex-1 flex-col px-[var(--page-padding-x)] pb-8 pt-10">
        <div className="w-full p-5">
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[28px] font-semibold text-[var(--color-text-primary)]">
              {mode === 'id' ? '아이디 찾기' : '비밀번호 재설정'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {mode === 'password'
                ? '가입할 때 인증한 학번, 생년월일, 이메일로 본인 확인을 진행합니다.'
                : '가입할 때 인증한 학번과 생년월일로 본인 확인을 진행합니다.'}
            </p>
          </div>

          <section className="mx-auto mt-[8vh] w-full max-w-[350px]">
            <div className="mb-5 flex items-center gap-5">
              <ModeButton active={mode === 'id'} onClick={() => handleModeChange('id')} disabled={isBusy}>
                아이디 찾기
              </ModeButton>
              <ModeButton active={mode === 'password'} onClick={() => handleModeChange('password')} disabled={isBusy}>
                비밀번호 재설정
              </ModeButton>
            </div>

            {isPasswordResetReady ? (
              <form onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <UnderlinedField fieldId="newPassword" icon={<LockIcon />} label="새 비밀번호">
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="새 비밀번호"
                      autoComplete="new-password"
                      className={inputClassName}
                      disabled={isBusy}
                    />
                  </UnderlinedField>

                  <UnderlinedField fieldId="confirmPassword" icon={<LockIcon />} label="새 비밀번호 확인">
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="새 비밀번호 확인"
                      autoComplete="new-password"
                      className={inputClassName}
                      disabled={isBusy}
                    />
                  </UnderlinedField>
                </div>

                <div className="mt-7 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={resetResult}
                    className="min-h-11 rounded-full px-1 text-sm font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                  >
                    다시 인증
                  </button>
                  <CircleActionButton type="submit" loading={isResetting} disabled={isBusy} label="비밀번호 재설정" />
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerify}>
                <div className="space-y-2">
                  <UnderlinedField fieldId="recoveryStudentNumber" icon={<span className="text-lg font-semibold">#</span>} label="학번">
                    <input
                      id="recoveryStudentNumber"
                      type="text"
                      inputMode="numeric"
                      value={studentNumber}
                      onChange={(event) => {
                        setStudentNumber(event.target.value);
                        resetResult();
                      }}
                      placeholder="학번"
                      className={inputClassName}
                      disabled={isBusy}
                    />
                  </UnderlinedField>

                  <UnderlinedField fieldId="recoveryBirth" icon={<CalendarIcon />} label="생년월일">
                    <input
                      id="recoveryBirth"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={birth}
                      onChange={(event) => {
                        setBirth(event.target.value.replace(/\D/g, '').slice(0, 6));
                        resetResult();
                      }}
                      placeholder="생년월일 6자리"
                      className={inputClassName}
                      disabled={isBusy}
                    />
                  </UnderlinedField>

                  {mode === 'password' ? (
                    <UnderlinedField fieldId="recoveryEmail" icon={<span className="text-lg font-semibold">@</span>} label="가입 이메일">
                      <input
                        id="recoveryEmail"
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          resetResult();
                        }}
                        placeholder="가입 이메일"
                        className={inputClassName}
                        disabled={isBusy}
                        autoComplete="email"
                      />
                    </UnderlinedField>
                  ) : null}
                </div>

                <div className="mt-7 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => router.push('/login')}
                    className="min-h-11 rounded-full px-1 text-sm font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                  >
                    로그인
                  </button>
                  <CircleActionButton type="submit" loading={isVerifying} disabled={isBusy} label="본인 확인" />
                </div>
              </form>
            )}

            {mode === 'id' && isVerified && (
              <div className="mt-5 rounded-xl border border-[var(--color-pink-cta)]/25 bg-white/82 px-4 py-3 text-sm text-[var(--color-text-primary)] backdrop-blur-sm">
                아이디는 <strong>{loginId}</strong> 입니다.
              </div>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[var(--color-pink-cta)]/25 bg-white/82 px-3 py-2 text-sm text-[var(--color-text-primary)] backdrop-blur-sm"
              >
                {errorMessage}
              </p>
            )}
          </section>
        </div>
      </main>
    </PageContainer>
  );
}

function ModeButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-10 border-b-2 px-1 text-sm font-semibold transition disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)] ${
        active
          ? 'border-[var(--color-action-primary)] text-[var(--color-text-primary)]'
          : 'border-transparent text-[var(--color-text-tertiary)]'
      }`}
    >
      {children}
    </button>
  );
}

function UnderlinedField({
  fieldId,
  icon,
  label,
  children,
}: {
  fieldId: string;
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]">
        {icon}
      </span>
      {children}
    </div>
  );
}

function CircleActionButton({
  disabled,
  label,
  loading,
  type,
}: {
  disabled: boolean;
  label: string;
  loading: boolean;
  type: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)]"
      aria-label={label}
    >
      {loading ? (
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
  );
}

function CalendarIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="4" y="5" width="16" height="17" rx="2" />
      <path d="M4 10h16" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const inputClassName = 'min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed';
