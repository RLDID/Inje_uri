import {
  PROFILE_CATEGORY_CODES,
  type KeywordSelectionPayload,
  type ProfileCategoryCode,
  type RawKeywordSelectionGroup,
} from '@/lib/types';

type ApiProfileWithKeywordSelections = {
  user?: {
    keywordSelections?: RawKeywordSelectionGroup[];
  };
  keywordSelections?: RawKeywordSelectionGroup[];
};

const PROFILE_CATEGORY_CODE_SET = new Set<ProfileCategoryCode>(PROFILE_CATEGORY_CODES);

function isProfileCategoryCode(value: string): value is ProfileCategoryCode {
  return PROFILE_CATEGORY_CODE_SET.has(value as ProfileCategoryCode);
}

function normalizeCategoryCode(group: RawKeywordSelectionGroup): string {
  return group.categoryCode ?? group.categoryName ?? '';
}

function normalizeKeywordCodes(categoryCode: ProfileCategoryCode, codes: string[]): string[] {
  return categoryCode === 'mbti'
    ? codes.map((code) => code.toLowerCase())
    : codes;
}

function denormalizeKeywordCodes(categoryCode: ProfileCategoryCode, codes: string[]): string[] {
  return categoryCode === 'mbti'
    ? codes.map((code) => code.toUpperCase())
    : codes;
}

export function getProfileKeywordSelections(profile: ApiProfileWithKeywordSelections): KeywordSelectionPayload[] {
  const rawSelections = profile.user?.keywordSelections ?? profile.keywordSelections ?? [];

  return rawSelections
    .map((group) => {
      const categoryCode = normalizeCategoryCode(group);
      if (!isProfileCategoryCode(categoryCode)) {
        return null;
      }

      const keywordCodes = (group.keywords ?? [])
        .map((keyword) => keyword.code)
        .filter((code): code is string => Boolean(code));

      return {
        categoryCode,
        keywordCodes: normalizeKeywordCodes(categoryCode, keywordCodes),
      };
    })
    .filter((selection): selection is KeywordSelectionPayload => selection !== null);
}

export function getKeywordSelectionValues(
  selections: KeywordSelectionPayload[],
  categoryCode: ProfileCategoryCode,
): string[] {
  const keywordCodes = selections.find((selection) => selection.categoryCode === categoryCode)?.keywordCodes ?? [];
  return denormalizeKeywordCodes(categoryCode, keywordCodes);
}

export function toKeywordCodes(
  categoryCode: ProfileCategoryCode,
  value: string | string[] | null | undefined,
): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return normalizeKeywordCodes(categoryCode, values);
}

export function buildKeywordSelection(
  categoryCode: ProfileCategoryCode,
  value: string | string[] | null | undefined,
): KeywordSelectionPayload {
  return {
    categoryCode,
    keywordCodes: toKeywordCodes(categoryCode, value),
  };
}

export function mergeKeywordSelections(
  originalSelections: KeywordSelectionPayload[],
  replacementSelections: KeywordSelectionPayload[],
): { keywordSelections: KeywordSelectionPayload[] | null; missingCategoryCodes: ProfileCategoryCode[] } {
  const originalByCategory = new Map(
    originalSelections.map((selection) => [selection.categoryCode, selection]),
  );
  const replacementByCategory = new Map(
    replacementSelections.map((selection) => [selection.categoryCode, selection]),
  );
  const missingCategoryCodes = PROFILE_CATEGORY_CODES.filter((categoryCode) => {
    if (originalByCategory.has(categoryCode)) {
      return false;
    }

    const replacement = replacementByCategory.get(categoryCode);
    return !replacement || replacement.keywordCodes.length === 0;
  });

  if (missingCategoryCodes.length > 0) {
    return { keywordSelections: null, missingCategoryCodes };
  }

  return {
    keywordSelections: PROFILE_CATEGORY_CODES.map((categoryCode) => {
      const replacement = replacementByCategory.get(categoryCode);
      if (replacement) {
        return replacement;
      }

      return originalByCategory.get(categoryCode) as KeywordSelectionPayload;
    }),
    missingCategoryCodes: [],
  };
}
