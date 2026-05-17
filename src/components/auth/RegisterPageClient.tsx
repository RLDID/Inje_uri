'use client';

import type { ReactNode, UIEvent } from 'react';
import { FormEvent, startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, useToast } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';
import { findCanonicalDepartment, getDepartmentSuggestions } from '@/lib/departments';
import { PROFILE_CATEGORIES, type KeywordSelectionPayload, type ProfileCategoryCode } from '@/lib/types';

type RegisterStep = 'verify' | 'account' | 'nickname' | 'academic' | 'private' | 'categories';
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
  data?: {
    nextPath?: string;
  };
  error?: {
    code?: string;
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

const PASSWORD_SPECIAL_CHARACTER_PATTERN = /[^\p{L}\p{N}\s]/u;
const AGE_OPTIONS = Array.from({ length: 11 }, (_, index) => String(index + 20));
const STUDENT_YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => String(index + 1));
const WHEEL_ITEM_HEIGHT = 48;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_SETTLE_TIMEOUT_MS = 850;

function resolveInitialStep(step: string | null): RegisterStep {
  if (step === 'account' || step === 'nickname' || step === 'academic' || step === 'private' || step === 'categories') {
    return step;
  }

  return 'verify';
}

function resolveNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/match';
  }

  return nextPath;
}

function toSelectionArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function toKeywordCode(categoryCode: ProfileCategoryCode, optionId: string): string {
  if (categoryCode === 'mbti') {
    return optionId.toLowerCase();
  }

  return optionId;
}

function findMissingPreferenceCategory(selectedPreferences: Record<string, string | string[]>) {
  return PROFILE_CATEGORIES.find((category) => (
    toSelectionArray(selectedPreferences[category.id]).length === 0
  ));
}

function buildKeywordSelections(selectedPreferences: Record<string, string | string[]>): KeywordSelectionPayload[] {
  return PROFILE_CATEGORIES.map((profileCategory) => {
    const categoryCode = profileCategory.id;
    const selectedOptionIds = toSelectionArray(selectedPreferences[profileCategory.id]);

    return {
      categoryCode,
      keywordCodes: selectedOptionIds.map((optionId) => toKeywordCode(categoryCode, optionId)),
    };
  });
}

function hasPasswordSpecialCharacter(password: string): boolean {
  return PASSWORD_SPECIAL_CHARACTER_PATTERN.test(password);
}

function validateRegisterProfile(form: RegisterFormState): string | null {
  const loginId = form.loginId.trim();
  const password = form.password.trim();
  const nickname = form.nickname.trim();
  const birth = form.birth.trim();
  const age = Number(form.age);
  const studentYear = Number(form.studentYear);
  const department = form.department.trim();
  const realName = form.realName.trim();
  const email = form.email.trim();
  const university = form.university.trim();

  if (!loginId || !password || !nickname || !birth || !form.age.trim() || !form.studentYear.trim() || !department || !realName || !email || !university) {
    return '회원가입 필드를 모두 입력해주세요.';
  }

  if (!findCanonicalDepartment(department)) {
    return '학과는 목록에서 선택해주세요.';
  }

  if (loginId.length < 4 || loginId.length > 100) {
    return '아이디는 4자 이상 100자 이하로 입력해주세요.';
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상이어야 합니다.';
  }

  if (!hasPasswordSpecialCharacter(password)) {
    return '비밀번호에는 특수문자를 1개 이상 포함해주세요.';
  }

  if (!/^\d{6}$/.test(birth)) {
    return '생년월일 6자리를 입력해주세요.';
  }

  if (!Number.isInteger(age) || age < 1 || age > 100) {
    return '나이 범위를 확인해주세요.';
  }

  if (!Number.isInteger(studentYear) || studentYear < 1 || studentYear > 8) {
    return '학년 범위를 확인해주세요.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return '이메일 형식을 확인해주세요.';
  }

  return null;
}

function validateRegisterAccount(form: RegisterFormState): string | null {
  const loginId = form.loginId.trim();
  const password = form.password.trim();

  if (!loginId || !password) {
    return '아이디와 비밀번호를 모두 입력해주세요.';
  }

  if (loginId.length < 4 || loginId.length > 100) {
    return '아이디는 4자 이상 100자 이하로 입력해주세요.';
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상이어야 합니다.';
  }

  if (!hasPasswordSpecialCharacter(password)) {
    return '비밀번호에는 특수문자를 1개 이상 포함해주세요.';
  }

  return null;
}

function resolveRegisterErrorStep(code: string | undefined, message: string): RegisterStep | null {
  if (code === 'UNAUTHORIZED' || code === 'INVALID_VERIFICATION') {
    return 'verify';
  }

  if (code === 'NICKNAME_ALREADY_EXISTS') {
    return 'nickname';
  }

  if (code === 'CONFLICT') {
    if (message.includes('아이디')) {
      return 'account';
    }

    if (message.includes('학번')) {
      return 'verify';
    }

    if (message.includes('이메일')) {
      return 'private';
    }

    if (message.includes('닉네임')) {
      return 'nickname';
    }

    return 'private';
  }

  if (code === 'VALIDATION_ERROR') {
    const isPreferenceError = message.includes('성향') || message.includes('카테고리') || message.includes('키워드') || message.includes('단일 선택');
    if (message.includes('아이디') || message.includes('비밀번호')) {
      return 'account';
    }

    if (message.includes('닉네임')) {
      return 'nickname';
    }

    if (message.includes('나이') || message.includes('학년') || message.includes('학과')) {
      return 'academic';
    }

    if (message.includes('이름') || message.includes('이메일')) {
      return 'private';
    }

    return isPreferenceError ? null : 'private';
  }

  return null;
}
export function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const stepParam = searchParams.get('step');

  const [step, setStep] = useState<RegisterStep>(() => resolveInitialStep(stepParam));
  const [studentNumber, setStudentNumber] = useState('');
  const [verifyBirth, setVerifyBirth] = useState('');
  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM_STATE);
  const [selectedPreferences, setSelectedPreferences] = useState<Record<string, string | string[]>>({});
  const [keywordCategoryIndex, setKeywordCategoryIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(false);
  const [hasRequestedTaxonomy, setHasRequestedTaxonomy] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isDepartmentListOpen, setIsDepartmentListOpen] = useState(false);
  const moveToStep = useCallback((nextStep: RegisterStep, mode: 'push' | 'replace' = 'push') => {
    setStep(nextStep);
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set('step', nextStep);
    const nextPath = `/register?${nextSearchParams.toString()}`;

    if (mode === 'replace') {
      router.replace(nextPath, { scroll: false });
      return;
    }

    router.push(nextPath, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (stepParam) {
      setStep(resolveInitialStep(stepParam));
      return;
    }

    moveToStep('verify', 'replace');
  }, [moveToStep, stepParam]);

  useEffect(() => {
    if ((step === 'account' || step === 'nickname' || step === 'academic' || step === 'private' || step === 'categories') && !form.birth) {
      moveToStep('verify', 'replace');
      return;
    }

    if ((step === 'nickname' || step === 'academic' || step === 'private' || step === 'categories') && !form.loginId) {
      moveToStep('account', 'replace');
      return;
    }

    if ((step === 'academic' || step === 'private' || step === 'categories') && !form.nickname.trim()) {
      moveToStep('nickname', 'replace');
      return;
    }

    if ((step === 'private' || step === 'categories') && (!form.age.trim() || !form.studentYear.trim() || !findCanonicalDepartment(form.department))) {
      moveToStep('academic', 'replace');
      return;
    }

    if (step === 'categories' && (!form.realName.trim() || !form.email.trim())) {
      moveToStep('private', 'replace');
    }
  }, [form.age, form.birth, form.department, form.email, form.loginId, form.nickname, form.realName, form.studentYear, moveToStep, step]);

  useEffect(() => {
    if (step !== 'categories' || isLoadingTaxonomy || hasRequestedTaxonomy) {
      return;
    }

    let isActive = true;
    setHasRequestedTaxonomy(true);
    setIsLoadingTaxonomy(true);

    fetch('/api/profile-taxonomy', {
      credentials: 'include',
    })
      .then(() => {
        // Signup saves categoryCode/keywordCodes and does not depend on this response.
      })
      .catch(() => undefined)
      .finally(() => {
        if (isActive) {
          setIsLoadingTaxonomy(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [hasRequestedTaxonomy, isLoadingTaxonomy, step]);

  useEffect(() => {
    if (step === 'categories') {
      setKeywordCategoryIndex(0);
    }
  }, [step]);

  const isBusy = isVerifying || isSavingPreferences;
  const departmentSuggestions = getDepartmentSuggestions(form.department);
  const activeKeywordCategory = PROFILE_CATEGORIES[Math.min(keywordCategoryIndex, PROFILE_CATEGORIES.length - 1)];
  const activeKeywordSelection = activeKeywordCategory
    ? selectedPreferences[activeKeywordCategory.id] ?? (activeKeywordCategory.type === 'multi' ? [] : '')
    : '';
  const activeKeywordSelectedCount = toSelectionArray(activeKeywordSelection).length;
  const keywordProgress = (keywordCategoryIndex + 1) / PROFILE_CATEGORIES.length;
  const keywordProgressPercent = keywordProgress * 100;
  const keywordBarProgressPercent = Math.max(0, keywordProgressPercent - 5);
  const keywordPawOffsetPx = 32 * keywordProgress;

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
        credentials: 'include',
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
        loginId: '',
        password: '',
      }));
      moveToStep('account');
      showToast('인증되었습니다. 아이디와 비밀번호를 입력해주세요.', 'success');
    } catch {
      const message = '인증 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validateRegisterAccount(form);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      showToast(validationMessage, 'error');
      return;
    }

    setErrorMessage('');
    setForm((prev) => ({
      ...prev,
      loginId: prev.loginId.trim(),
      password: prev.password.trim(),
    }));
    moveToStep('nickname');
  };

  const handleNicknameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nickname = form.nickname.trim();
    if (!nickname) {
      const message = '닉네임을 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setErrorMessage('');
    setForm((prev) => ({
      ...prev,
      nickname,
    }));
    moveToStep('academic');
  };

  const handleAcademicSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const age = Number(form.age);
    const studentYear = Number(form.studentYear);
    const canonicalDepartment = findCanonicalDepartment(form.department);

    if (!Number.isInteger(age) || age < 1 || age > 100) {
      const message = '나이를 선택해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!Number.isInteger(studentYear) || studentYear < 1 || studentYear > 8) {
      const message = '학년을 선택해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!canonicalDepartment) {
      const message = '학과는 목록에서 선택해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      setIsDepartmentListOpen(true);
      return;
    }

    setErrorMessage('');
    setForm((prev) => ({
      ...prev,
      age: prev.age.trim(),
      studentYear: prev.studentYear.trim(),
      department: canonicalDepartment,
    }));
    moveToStep('private');
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const realName = form.realName.trim();
    const email = form.email.trim();

    if (!realName || !email) {
      const message = '이름과 이메일을 모두 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const message = '이메일 형식을 확인해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    const validationMessage = validateRegisterProfile({
      ...form,
      realName,
      email,
      university: INITIAL_FORM_STATE.university,
    });
    if (validationMessage) {
      setErrorMessage(validationMessage);
      showToast(validationMessage, 'error');
      if (validationMessage.includes('학과')) {
        setIsDepartmentListOpen(true);
        moveToStep('academic', 'replace');
      }
      return;
    }

    setErrorMessage('');
    setForm((prev) => ({
      ...prev,
      loginId: prev.loginId.trim(),
      password: prev.password.trim(),
      nickname: prev.nickname.trim(),
      birth: prev.birth.trim(),
      realName,
      email,
      university: INITIAL_FORM_STATE.university,
    }));
    moveToStep('categories');
    showToast('가입 정보를 확인했습니다. 성향을 선택해주세요.', 'success');
  };

  const submitPreferences = async (preferences: Record<string, string | string[]> = selectedPreferences) => {
    const missingCategory = findMissingPreferenceCategory(preferences);
    if (missingCategory) {
      const message = `${missingCategory.label} 항목을 선택해주세요.`;
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsSavingPreferences(true);
    setErrorMessage('');

    try {
      const keywordSelections = buildKeywordSelections(preferences);
      const canonicalDepartment = findCanonicalDepartment(form.department);
      if (!canonicalDepartment) {
        throw new Error('학과는 목록에서 선택해주세요.');
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          department: canonicalDepartment,
          age: Number(form.age),
          studentYear: Number(form.studentYear),
          birth: form.birth.trim(),
          keywordSelections,
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
        const nextErrorStep = resolveRegisterErrorStep(payload.error?.code, message);
        setErrorMessage(message);
        showToast(message, 'error');
        if (nextErrorStep) {
          moveToStep(nextErrorStep, 'replace');
        }
        return;
      }

      showToast('회원가입이 완료되었습니다.', 'success');
      const nextPath = resolveNextPath(searchParams.get('next') ?? payload.data?.nextPath ?? null);
      startTransition(() => {
        router.replace(nextPath);
      });
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        showToast(error.message, 'error');
        return;
      }
      const message = '성향 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handlePreferenceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitPreferences();
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

  const moveToNextKeywordCategory = async (preferences: Record<string, string | string[]> = selectedPreferences) => {
    setErrorMessage('');

    if (keywordCategoryIndex < PROFILE_CATEGORIES.length - 1) {
      setKeywordCategoryIndex((prev) => Math.min(prev + 1, PROFILE_CATEGORIES.length - 1));
      return;
    }

    await submitPreferences(preferences);
  };

  const handleKeywordOptionSelect = async (optionId: string) => {
    if (!activeKeywordCategory || isBusy) {
      return;
    }

    if (activeKeywordCategory.type === 'single') {
      const nextPreferences = {
        ...selectedPreferences,
        [activeKeywordCategory.id]: optionId,
      };
      setSelectedPreferences(nextPreferences);
      return;
    }

    const currentValues = toSelectionArray(selectedPreferences[activeKeywordCategory.id]);
    const isSelected = currentValues.includes(optionId);
    const nextValues = isSelected
      ? currentValues.filter((value) => value !== optionId)
      : activeKeywordCategory.maxSelections && currentValues.length >= activeKeywordCategory.maxSelections
        ? currentValues
        : [...currentValues, optionId];

    setSelectedPreferences((prev) => ({
      ...prev,
      [activeKeywordCategory.id]: nextValues,
    }));
  };

  const handleKeywordNext = async () => {
    if (!activeKeywordCategory) {
      return;
    }

    if (activeKeywordSelectedCount === 0) {
      const message = `${activeKeywordCategory.label} 항목을 선택해주세요.`;
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    await moveToNextKeywordCategory();
  };

  const handleKeywordBack = () => {
    if (keywordCategoryIndex > 0) {
      setKeywordCategoryIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    moveToStep('private', 'replace');
  };

  return (
    <PageContainer
      withBottomNav={false}
      className={`auth-background-page relative flex flex-col overflow-hidden bg-white ${step === 'categories' ? 'h-dvh max-h-dvh' : 'min-h-dvh'}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[44dvh] min-h-[300px] bg-contain bg-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/brand/signup.png')" }}
      />

      <main className={`relative z-10 flex min-h-0 flex-1 flex-col px-[var(--page-padding-x)] ${step === 'categories' ? 'h-full overflow-hidden pb-0 pt-4' : 'pb-8 pt-10'}`}>
        <div className={step === 'categories' ? 'flex h-full min-h-0 flex-1 flex-col overflow-hidden p-5' : 'w-full p-5'}>
          <div className={step === 'categories' ? 'mb-4' : 'mb-7'}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[28px] font-semibold text-[var(--color-text-primary)]">
              회원가입
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {step === 'verify' && '학번 인증을 먼저 완료하면 가입 정보를 입력할 수 있습니다.'}
              {step === 'account' && '로그인에 사용할 아이디와 비밀번호를 입력해주세요.'}
              {step === 'nickname' && '프로필에 표시될 닉네임을 입력해주세요.'}
              {step === 'academic' && '추천에 사용할 기본 정보를 선택해주세요.'}
              {step === 'private' && '프로필에 표기되지 않는 정보를 입력해주세요.'}
              {step === 'categories' && '성향까지 저장하면 계정 생성이 완료됩니다.'}
            </p>
          </div>

          {step === 'verify' && (
            <form key="register-verify" className="mx-auto mt-[8vh] w-full max-w-[350px]" onSubmit={handleVerifySubmit} autoComplete="off">
              <div className="space-y-2">
                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="studentNumber" className="sr-only">
                    학번
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-semibold text-[var(--color-text-secondary)]">
                    ID
                  </span>
                  <input
                    id="studentNumber"
                    name="registerStudentNumber"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={studentNumber}
                    onChange={(event) => setStudentNumber(event.target.value)}
                    placeholder="학번"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>

                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="verifyBirth" className="sr-only">
                    생년월일
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                  <input
                    id="verifyBirth"
                    name="registerVerifyBirth"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={verifyBirth}
                    onChange={(event) => setVerifyBirth(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="생년월일 6자리"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => router.push('/login')}
                  className="rounded-full px-1 py-2 text-xs font-semibold text-[var(--color-text-secondary)] underline underline-offset-4 disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                >
                  로그인
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)]"
                  aria-label="인증"
                >
                  {isVerifying ? (
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
            </form>
          )}

          {step === 'account' && (
            <form key="register-account" className="mx-auto mt-[8vh] w-full max-w-[350px]" onSubmit={handleAccountSubmit} autoComplete="off">
              <div className="space-y-2">
                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="registerLoginId" className="sr-only">
                    아이디
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xl font-semibold text-[var(--color-text-secondary)]">
                    @
                  </span>
                  <input
                    id="registerLoginId"
                    name="registerLoginId"
                    type="text"
                    autoComplete="off"
                    value={form.loginId}
                    onChange={(event) => updateField('loginId', event.target.value)}
                    placeholder="아이디"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>

                <div className="flex min-h-14 items-center gap-3 border-b border-[var(--color-border)] py-2 focus-within:border-[var(--color-focus)]">
                  <label htmlFor="registerPassword" className="sr-only">
                    비밀번호
                  </label>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-text-secondary)]">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    id="registerPassword"
                    name="registerPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder="비밀번호"
                    className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isBusy}
                  />
                </div>
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
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)]"
                  aria-label="다음"
                >
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            </form>
          )}

          {step === 'nickname' && (
            <form className="mx-auto mt-[8vh] w-full max-w-[350px]" onSubmit={handleNicknameSubmit}>
              <div>
                <label htmlFor="nickname" className="mb-3 block text-[15px] font-semibold text-[var(--color-text-primary)]">
                  닉네임을 입력해주세요
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={form.nickname}
                  onChange={(event) => updateField('nickname', event.target.value)}
                  placeholder="닉네임"
                  className="w-full border-b border-[var(--color-border)] bg-transparent px-0 py-4 text-[22px] font-semibold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-focus)] focus:outline-none disabled:cursor-not-allowed"
                  disabled={isBusy}
                  autoComplete="nickname"
                />
              </div>

              <Button type="submit" fullWidth size="lg" className="mt-8">
                확인
              </Button>
            </form>
          )}

          {step === 'academic' && (
            <form className="mt-6 space-y-7" onSubmit={handleAcademicSubmit}>
              <WheelPickerField
                label="나이"
                options={AGE_OPTIONS}
                value={form.age}
                unit="살"
                placeholder="나이를 선택해주세요"
                formatValue={(age) => (age === '30' ? '30살 이상' : `${age}살`)}
                onChange={(value) => updateField('age', value)}
                disabled={isBusy}
              />

              <WheelPickerField
                label="학년"
                options={STUDENT_YEAR_OPTIONS}
                value={form.studentYear}
                unit="학년"
                placeholder="학년을 선택해주세요"
                onChange={(value) => updateField('studentYear', value)}
                disabled={isBusy}
              />

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
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'male', label: '남성' },
                    { value: 'female', label: '여성' },
                  ].map((option) => {
                    const isSelected = form.gender === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('gender', option.value as Gender)}
                        disabled={isBusy}
                        className={`h-12 rounded-xl border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? 'border-[var(--color-action-primary)] bg-[var(--color-brand-pink)] text-[var(--color-text-primary)]'
                            : 'border-[var(--color-border)] bg-white/65 text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </LabeledInput>

              <Button type="submit" fullWidth size="lg">
                확인
              </Button>
            </form>
          )}

          {step === 'private' && (
            <form className="mt-6 space-y-5" onSubmit={handleRegisterSubmit}>
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)]/65 px-4 py-3 text-sm font-medium text-[var(--color-primary-dark)]">
                이름과 이메일은 프로필에 표기되지 않습니다.
              </div>

              <LabeledInput label="이름">
                <input
                  type="text"
                  value={form.realName}
                  onChange={(event) => updateField('realName', event.target.value)}
                  placeholder="이름"
                  className={inputClassName}
                  disabled={isBusy}
                  autoComplete="name"
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
                  autoComplete="email"
                />
              </LabeledInput>

              <Button type="submit" fullWidth size="lg">
                확인
              </Button>
            </form>
          )}

          {step === 'categories' && (
            <form className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handlePreferenceSubmit}>
              {activeKeywordCategory && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="shrink-0">
                    <div className="mb-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleKeywordBack}
                        disabled={isBusy}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-primary)] transition active:bg-[var(--color-chip-background)] disabled:cursor-not-allowed disabled:text-[var(--color-text-tertiary)]"
                        aria-label="이전"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M19 12H5" />
                          <path d="m12 19-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="relative h-8 flex-1 overflow-visible">
                        <div className="absolute left-4 right-4 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-[var(--color-border-light)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-action-primary)] transition-[width] duration-300"
                            style={{ width: `${keywordBarProgressPercent}%` }}
                          />
                        </div>
                        <span
                          className="pointer-events-none absolute top-1/2 z-10 h-8 w-8 -translate-y-1/2 bg-contain bg-center bg-no-repeat drop-shadow-[0_3px_6px_rgba(34,34,34,0.16)] transition-[left] duration-300"
                          style={{
                            backgroundImage: "url('/brand/bear-hero-paw.png')",
                            left: `calc(${keywordProgressPercent}% - ${keywordPawOffsetPx}px)`,
                          }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                      {keywordCategoryIndex + 1}/{PROFILE_CATEGORIES.length}
                    </p>
                    <h2 className="mt-1 break-keep text-[21px] font-bold leading-[1.25] tracking-normal text-[var(--color-text-primary)]">
                      {activeKeywordCategory.label}
                    </h2>
                    {activeKeywordCategory.type === 'multi' && activeKeywordCategory.maxSelections && (
                      <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
                        최대 {activeKeywordCategory.maxSelections}개까지 선택할 수 있어요.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 pb-28 scrollbar-none">
                    {activeKeywordCategory.options.map((option) => {
                      const selectedValues = toSelectionArray(activeKeywordSelection);
                      const isSelected = selectedValues.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => void handleKeywordOptionSelect(option.id)}
                          disabled={isBusy}
                          aria-pressed={isSelected}
                          className={`flex min-h-[52px] w-full items-center rounded-[16px] px-4 text-left text-[15px] font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected
                              ? 'border border-[var(--color-action-primary)]/55 bg-[var(--color-brand-pink)] text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_rgba(243,167,192,0.35)]'
                              : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 bg-white px-[calc(var(--page-padding-x)+20px)] pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_28px_rgba(255,255,255,0.96)]">
                    <Button
                      type="button"
                      fullWidth
                      size="md"
                      loading={isSavingPreferences}
                      disabled={isBusy || activeKeywordSelectedCount === 0}
                      onClick={() => void handleKeywordNext()}
                    >
                      {keywordCategoryIndex === PROFILE_CATEGORIES.length - 1 ? '완료' : '확인'}
                    </Button>
                  </div>
                </div>
              )}
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
        </div>
      </main>
    </PageContainer>
  );
}

function WheelPickerField({
  label,
  options,
  value,
  unit,
  placeholder,
  formatValue,
  onChange,
  disabled,
}: {
  label: string;
  options: string[];
  value: string;
  unit: string;
  placeholder: string;
  formatValue?: (value: string) => string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const initialScrollIndexRef = useRef(0);
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getDisplayValue = (option: string) => formatValue?.(option) ?? `${option}${unit}`;
  const selectedLabel = value ? getDisplayValue(value) : placeholder;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    window.requestAnimationFrame(() => {
      scroller.scrollTop = initialScrollIndexRef.current * WHEEL_ITEM_HEIGHT;
    });
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current);
      }

      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  const syncSelectedValue = (scrollTop: number) => {
    const nextIndex = Math.min(
      options.length - 1,
      Math.max(0, Math.round(scrollTop / WHEEL_ITEM_HEIGHT)),
    );
    const nextValue = options[nextIndex];

    if (nextValue && nextValue !== value) {
      onChange(nextValue);
    }

    return nextIndex;
  };

  const handleOpen = () => {
    if (disabled) {
      return;
    }

    initialScrollIndexRef.current = Math.max(0, options.indexOf(value));
    setIsOpen(true);
  };

  const commitAndClose = () => {
    const scroller = scrollerRef.current;

    if (scroller) {
      const nextIndex = syncSelectedValue(scroller.scrollTop);
      scroller.scrollTop = nextIndex * WHEEL_ITEM_HEIGHT;
    }

    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
    }

    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }

    setIsOpen(false);
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    syncSelectedValue(scroller.scrollTop);

    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
    }

    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }

    snapTimeoutRef.current = setTimeout(() => {
      const nextIndex = syncSelectedValue(scroller.scrollTop);
      scroller.scrollTo({
        top: nextIndex * WHEEL_ITEM_HEIGHT,
        behavior: 'smooth',
      });
    }, 90);

    settleTimeoutRef.current = setTimeout(() => {
      const nextIndex = syncSelectedValue(scroller.scrollTop);
      scroller.scrollTo({
        top: nextIndex * WHEEL_ITEM_HEIGHT,
        behavior: 'smooth',
      });
      setIsOpen(false);
    }, WHEEL_SETTLE_TIMEOUT_MS);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">{label}</label>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-base transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-secondary)] ${
          value ? 'font-semibold text-[var(--color-text-primary)]' : 'font-normal text-[var(--color-text-tertiary)]'
        }`}
      >
        <span>{selectedLabel}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20" onClick={commitAndClose}>
          <div
            className="w-full max-w-[430px] rounded-t-[24px] bg-[var(--color-surface)] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-16px_40px_rgba(15,23,42,0.2)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="relative mx-auto overflow-hidden"
              style={{ height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS }}
            >
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 h-12 -translate-y-1/2 rounded-xl border-y border-[var(--color-border)] bg-[var(--color-chip-background)]/65" />
              <div
                ref={scrollerRef}
                onScroll={handleScroll}
                className="scrollbar-none relative z-20 h-full snap-y snap-mandatory overflow-y-auto scroll-smooth"
                style={{
                  paddingBottom: WHEEL_ITEM_HEIGHT * 2,
                  paddingTop: WHEEL_ITEM_HEIGHT * 2,
                }}
              >
                {options.map((option) => {
                  const isSelected = value === option;

                  return (
                    <div
                      key={option}
                      className={`pointer-events-none flex snap-center items-center justify-center text-xl font-semibold transition-colors ${
                        isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
                      }`}
                      style={{ height: WHEEL_ITEM_HEIGHT }}
                    >
                      {getDisplayValue(option)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
