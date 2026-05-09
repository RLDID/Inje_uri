'use client';

import type { ReactNode } from 'react';
import { FormEvent, startTransition, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { KeywordSelector, ProfileSection } from '@/components/profile';
import { Button, Card, useToast } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';
import { findCanonicalDepartment, getDepartmentSuggestions } from '@/lib/departments';
import { buildKeywordCodeSelections } from '@/lib/profile-keyword-selections';
import { PROFILE_CATEGORIES } from '@/lib/types';

type RegisterStep = 'verify' | 'profile' | 'categories';
type Gender = 'male' | 'female';

interface InjeCheckResponse {
  success?: boolean;
  data?: {
    nextStep?: 'login' | 'register';
  };
  error?: {
    message?: string;
  };
}

interface RegisterApiResponse {
  success?: boolean;
  error?: {
    message?: string;
  };
}

interface SavePreferencesResponse {
  success?: boolean;
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
  gender: Gender;
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

const aboutMeCategories = PROFILE_CATEGORIES.filter((category) => category.belongsTo === 'aboutMe');
const partnerCategories = PROFILE_CATEGORIES.filter((category) => category.belongsTo === 'desiredPartner');

function resolveInitialStep(step: string | null): RegisterStep {
  return step === 'categories' ? 'categories' : 'verify';
}

function resolveNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/match';
  }

  return nextPath;
}

function getNextQuery(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '';
  }

  return `&next=${encodeURIComponent(nextPath)}`;
}

function toSelectionArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

export function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [step, setStep] = useState<RegisterStep>(() => resolveInitialStep(searchParams.get('step')));
  const [studentNumber, setStudentNumber] = useState('');
  const [verifyBirth, setVerifyBirth] = useState('');
  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM_STATE);
  const [selectedPreferences, setSelectedPreferences] = useState<Record<string, string | string[]>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isDepartmentListOpen, setIsDepartmentListOpen] = useState(false);

  useEffect(() => {
    setStep(resolveInitialStep(searchParams.get('step')));
  }, [searchParams]);

  const isBusy = isVerifying || isSubmitting || isSavingPreferences;
  const departmentSuggestions = getDepartmentSuggestions(form.department);

  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedStudentNumber = studentNumber.trim();
    const normalizedBirth = verifyBirth.trim();
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

      if (payload.data?.nextStep === 'login') {
        const message = '이미 가입된 학번입니다. 로그인해주세요.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      setForm((prev) => ({
        ...prev,
        birth: normalizedBirth,
      }));
      setStep('profile');
      showToast('인증되었습니다. 회원가입 정보를 입력해주세요.', 'success');
    } catch {
      const message = '인증 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const canonicalDepartment = findCanonicalDepartment(form.department);
    if (!canonicalDepartment) {
      const message = '학과는 목록에서 선택해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      setIsDepartmentListOpen(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          department: canonicalDepartment,
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

      showToast('회원가입이 완료되었습니다. 성향을 선택해주세요.', 'success');
      setStep('categories');
      startTransition(() => {
        router.replace(`/register?step=categories${getNextQuery(searchParams.get('next'))}`);
      });
    } catch {
      const message = '회원가입 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreferenceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missingCategory = PROFILE_CATEGORIES.find((category) => (
      toSelectionArray(selectedPreferences[category.id]).length === 0
    ));
    if (missingCategory) {
      const message = `${missingCategory.label} 항목을 선택해주세요.`;
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsSavingPreferences(true);
    setErrorMessage('');

    try {
      const keywordSelections = buildKeywordCodeSelections(selectedPreferences);
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { onboardingCompleted: true },
          ...(keywordSelections.length > 0 ? { keywordSelections } : {}),
        }),
      });

      let payload: SavePreferencesResponse = {};
      try {
        payload = await response.json() as SavePreferencesResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.success) {
        const message = payload.error?.message ?? '성향 저장에 실패했습니다.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      showToast('성향이 저장되었습니다.', 'success');
      const nextPath = resolveNextPath(searchParams.get('next'));
      startTransition(() => {
        router.replace(nextPath);
      });
    } catch {
      const message = '성향 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const updateField = <K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDepartmentChange = (value: string) => {
    updateField('department', value);
    setIsDepartmentListOpen(true);
  };

  const handleDepartmentSelect = (department: string) => {
    updateField('department', department);
    setIsDepartmentListOpen(false);
    setErrorMessage('');
  };

  const handleCategoryChange = (categoryId: string, value: string | string[]) => {
    setSelectedPreferences((prev) => ({
      ...prev,
      [categoryId]: value,
    }));
  };

  return (
    <PageContainer withBottomNav={false} className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top,#e9f7fb_0%,#f3f7f8_45%,#eef3f4_100%)]">
      <main className="flex flex-1 items-center px-[var(--page-padding-x)] py-10">
        <Card variant="elevated" padding="lg" className="w-full border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border-light))] bg-white/95 backdrop-blur">
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[26px] font-semibold text-[var(--color-text-primary)]">
              회원가입
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {step === 'verify' && '학번 인증을 먼저 완료하면 가입 정보를 입력할 수 있습니다.'}
              {step === 'profile' && '인증된 학번 정보로 계정을 생성합니다.'}
              {step === 'categories' && '프로필 수정과 이상형 설정에서 쓰는 항목을 선택해주세요.'}
            </p>
          </div>

          <StepIndicator step={step} />

          {step === 'verify' && (
            <form className="mt-6 space-y-4" onSubmit={handleVerifySubmit}>
              <LabeledInput label="학번">
                <input
                  type="text"
                  inputMode="numeric"
                  value={studentNumber}
                  onChange={(event) => setStudentNumber(event.target.value)}
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
                  value={verifyBirth}
                  onChange={(event) => setVerifyBirth(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="예: 020408"
                  className={inputClassName}
                  disabled={isBusy}
                />
              </LabeledInput>

              <Button type="submit" fullWidth size="lg" loading={isVerifying}>
                인증
              </Button>

              <Button
                type="button"
                variant="ghost"
                fullWidth
                disabled={isBusy}
                onClick={() => router.push('/login')}
              >
                로그인으로 돌아가기
              </Button>
            </form>
          )}

          {step === 'profile' && (
            <form className="mt-6 space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)]/55 px-3 py-2 text-sm text-[var(--color-primary-dark)]">
                학번 {studentNumber.trim()} 인증이 완료되었습니다.
              </div>

              <LabeledInput label="아이디">
                <input
                  type="text"
                  value={form.loginId}
                  onChange={(event) => updateField('loginId', event.target.value)}
                  placeholder="아이디"
                  autoComplete="username"
                  className={inputClassName}
                  disabled={isBusy}
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
                  disabled={isBusy}
                />
              </LabeledInput>

              <LabeledInput label="닉네임">
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(event) => updateField('nickname', event.target.value)}
                  placeholder="닉네임"
                  className={inputClassName}
                  disabled={isBusy}
                />
              </LabeledInput>

              <LabeledInput label="생년월일 (6자리)">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.birth}
                  readOnly
                  placeholder="예: 020408"
                  className={`${inputClassName} cursor-not-allowed bg-[var(--color-surface-secondary)]`}
                  disabled={isBusy}
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
                  disabled={isBusy}
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
                  disabled={isBusy}
                />
              </LabeledInput>

              <LabeledInput label="학과">
                <div className="relative">
                  <input
                    type="text"
                    value={form.department}
                    onChange={(event) => handleDepartmentChange(event.target.value)}
                    onFocus={() => setIsDepartmentListOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsDepartmentListOpen(false), 120);
                    }}
                    placeholder="학과를 입력하거나 선택해주세요"
                    className={inputClassName}
                    autoComplete="off"
                    disabled={isBusy}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isDepartmentListOpen}
                    aria-controls="department-options"
                  />

                  {isDepartmentListOpen && !isBusy && (
                    <div
                      id="department-options"
                      role="listbox"
                      className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-60 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                    >
                      {departmentSuggestions.length > 0 ? (
                        departmentSuggestions.map((department) => (
                          <button
                            key={department}
                            type="button"
                            role="option"
                            aria-selected={form.department === department}
                            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-primary-light)] focus:bg-[var(--color-primary-light)] focus:outline-none"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleDepartmentSelect(department);
                            }}
                          >
                            {department}
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">
                          일치하는 학과가 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
                  목록에서 선택한 학과명으로 저장됩니다.
                </p>
              </LabeledInput>

              <LabeledInput label="성별">
                <select
                  value={form.gender}
                  onChange={(event) => updateField('gender', event.target.value as Gender)}
                  className={inputClassName}
                  disabled={isBusy}
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
                  disabled={isBusy}
                />
              </LabeledInput>

              <LabeledInput label="이메일">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="이메일"
                  className={inputClassName}
                  disabled={isBusy}
                />
              </LabeledInput>

              <LabeledInput label="대학교">
                <input
                  type="text"
                  value={form.university}
                  onChange={(event) => updateField('university', event.target.value)}
                  placeholder="대학교"
                  className={inputClassName}
                  disabled={isBusy}
                />
              </LabeledInput>

              <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
                다음
              </Button>
            </form>
          )}

          {step === 'categories' && (
            <form className="mt-6 space-y-6" onSubmit={handlePreferenceSubmit}>
              <ProfileSection title="내 성향">
                {aboutMeCategories.map((category) => (
                  <KeywordSelector
                    key={category.id}
                    category={category}
                    selected={selectedPreferences[category.id] ?? (category.type === 'multi' ? [] : '')}
                    onChange={(value) => handleCategoryChange(category.id, value)}
                    disabled={isBusy}
                  />
                ))}
              </ProfileSection>

              <ProfileSection title="이상형">
                {partnerCategories.map((category) => (
                  <KeywordSelector
                    key={category.id}
                    category={category}
                    selected={selectedPreferences[category.id] ?? (category.type === 'multi' ? [] : '')}
                    onChange={(value) => handleCategoryChange(category.id, value)}
                    disabled={isBusy}
                  />
                ))}
              </ProfileSection>

              <Button type="submit" fullWidth size="lg" loading={isSavingPreferences}>
                성향 저장
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
        </Card>
      </main>
    </PageContainer>
  );
}

function StepIndicator({ step }: { step: RegisterStep }) {
  const steps: Array<{ id: RegisterStep; label: string }> = [
    { id: 'verify', label: '인증' },
    { id: 'profile', label: '정보' },
    { id: 'categories', label: '성향' },
  ];
  const activeIndex = steps.findIndex((item) => item.id === step);

  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((item, index) => {
        const isActive = item.id === step;
        const isComplete = index < activeIndex;

        return (
          <li
            key={item.id}
            className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${
              isActive || isComplete
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]'
            }`}
          >
            {item.label}
          </li>
        );
      })}
    </ol>
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
