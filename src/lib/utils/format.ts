import type {
  ConversationType,
  DateStyleType,
  DrinkingType,
  LifestyleType,
  SmokingType,
  User,
} from '@/lib/types';
import {
  CONVERSATION_OPTIONS,
  DATE_STYLE_OPTIONS,
  DEALBREAKER_OPTIONS,
  DRINKING_OPTIONS,
  INTEREST_OPTIONS,
  LIFESTYLE_OPTIONS,
  PERSONALITY_OPTIONS,
  SMOKING_OPTIONS,
  VIBE_OPTIONS,
} from '@/lib/types/keywords';

export function formatStudentYear(year: number): string {
  if (year <= 4) {
    return `${year}학년`;
  }

  if (year === 5) {
    return '대학원생';
  }

  return '졸업생';
}

export function formatStudentNumber(studentNumber?: number): string {
  if (!studentNumber) {
    return '';
  }

  const normalized = String(studentNumber).slice(-2).padStart(2, '0');
  return `${normalized}학번`;
}

export function getUserAcademicLabel(user: Pick<User, 'department' | 'studentNumber'>): string {
  const studentNumberLabel = formatStudentNumber(user.studentNumber);
  return studentNumberLabel ? `${user.department} · ${studentNumberLabel}` : user.department;
}

export function formatLifestyle(value: LifestyleType | undefined, withEmoji = false): string {
  const option = LIFESTYLE_OPTIONS.find((item) => item.id === value);
  return option ? (withEmoji ? `${option.emoji} ${option.label}` : option.label) : '';
}

export function formatDrinking(value: DrinkingType | undefined, withEmoji = false): string {
  const option = DRINKING_OPTIONS.find((item) => item.id === value);
  return option ? (withEmoji ? `${option.emoji} ${option.label}` : option.label) : '';
}

export function formatSmoking(value: SmokingType | undefined, withEmoji = false): string {
  const option = SMOKING_OPTIONS.find((item) => item.id === value);
  return option ? (withEmoji ? `${option.emoji} ${option.label}` : option.label) : '';
}

export function formatConversation(value: ConversationType | undefined, withEmoji = false): string {
  const option = CONVERSATION_OPTIONS.find((item) => item.id === value);
  return option ? (withEmoji ? `${option.emoji} ${option.label}` : option.label) : '';
}

export function formatDateStyle(value: DateStyleType | undefined, withEmoji = false): string {
  const option = DATE_STYLE_OPTIONS.find((item) => item.id === value);
  return option ? (withEmoji ? `${option.emoji} ${option.label}` : option.label) : '';
}

export function getKeywordLabel(categoryId: string, keywordId: string, withEmoji = false): string {
  const categories: Record<string, typeof PERSONALITY_OPTIONS> = {
    personality: PERSONALITY_OPTIONS,
    interests: INTEREST_OPTIONS,
    vibe: VIBE_OPTIONS,
    dealBreakers: DEALBREAKER_OPTIONS,
  };

  const options = categories[categoryId];
  if (!options) {
    return keywordId;
  }

  const option = options.find((item) => item.id === keywordId);
  if (!option) {
    return keywordId;
  }

  return withEmoji && option.emoji ? `${option.emoji} ${option.label}` : option.label;
}

export function getUserDisplayInfo(user: User): string {
  return getUserAcademicLabel(user);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}
