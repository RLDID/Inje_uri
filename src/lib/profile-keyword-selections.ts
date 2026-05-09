import { PROFILE_CATEGORIES } from '@/lib/types';

export interface KeywordCodeSelection {
  categoryCode: string;
  keywordCodes: string[];
}

export interface UserKeywordSelectionGroup {
  categoryCode: string;
  keywords: Array<{
    code: string;
  }>;
}

const PROFILE_TO_TAXONOMY_CODE: Record<string, string> = {
  lifestyle: 'lifestyle',
  drinking: 'drinking',
  smoking: 'smoking',
  mbti: 'mbti',
  personality: 'personality',
  conversation: 'conversation',
  interests: 'interests',
  vibe: 'desired_vibe',
  dateStyle: 'date_style',
  dealBreakers: 'deal_breakers',
};

const TAXONOMY_TO_PROFILE_CODE = Object.fromEntries(
  Object.entries(PROFILE_TO_TAXONOMY_CODE).map(([profileCode, taxonomyCode]) => [taxonomyCode, profileCode]),
) as Record<string, string>;

const LEGACY_KEYWORD_TO_OPTION_CODE: Record<string, Record<string, string>> = {
  lifestyle: {
    outdoor: 'active',
  },
  drinking: {
    frequent: 'often',
    social: 'sometimes',
    occasional: 'sometimes',
  },
  smoking: {
    smoker: 'yes',
    non_smoker: 'no',
    outside_only: 'yes',
    occasional: 'yes',
  },
  personality: {
    energetic: 'passionate',
    romantic: 'affectionate',
    warm: 'positive',
    thoughtful: 'careful',
    ambitious: 'independent',
  },
  interests: {
    books: 'reading',
    games: 'gaming',
  },
  desired_vibe: {
    comfortable: 'comfortable',
    exciting: 'exciting',
    serious: 'serious',
    casual: 'casual',
    romantic: 'serious',
  },
  date_style: {
    good_food: 'restaurant',
    cafe_talk: 'cafe',
    drive: 'home',
  },
  deal_breakers: {
    smoking: 'smoker',
    heavy_drinking: 'heavy-drinker',
    late_reply: 'slow-replier',
    ghosting: 'no-plans',
    rude: 'too-fast',
  },
};

function toSelectionArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function toKeywordCode(categoryId: string, optionId: string): string {
  if (categoryId === 'mbti') {
    return optionId.toLowerCase();
  }

  return optionId;
}

function toOptionCode(categoryCode: string, keywordCode: string): string {
  if (categoryCode === 'mbti') {
    return keywordCode.toUpperCase();
  }

  return LEGACY_KEYWORD_TO_OPTION_CODE[categoryCode]?.[keywordCode] ?? keywordCode;
}

export function buildKeywordCodeSelections(
  selectedPreferences: Record<string, string | string[]>,
  categories = PROFILE_CATEGORIES,
  options: { includeEmpty?: boolean } = {},
): KeywordCodeSelection[] {
  return categories.flatMap((profileCategory) => {
    const categoryCode = PROFILE_TO_TAXONOMY_CODE[profileCategory.id];
    if (!categoryCode) {
      return [];
    }

    const keywordCodes = toSelectionArray(selectedPreferences[profileCategory.id])
      .map((optionId) => toKeywordCode(profileCategory.id, optionId))
      .filter(Boolean);

    if (keywordCodes.length === 0 && !options.includeEmpty) {
      return [];
    }

    return [{
      categoryCode,
      keywordCodes: [...new Set(keywordCodes)],
    }];
  });
}

export function keywordSelectionsToPreferenceState(
  keywordSelections: UserKeywordSelectionGroup[] | undefined,
) {
  const preferences: Record<string, string | string[]> = {};

  for (const selection of keywordSelections ?? []) {
    const profileCategoryId = TAXONOMY_TO_PROFILE_CODE[selection.categoryCode];
    const profileCategory = PROFILE_CATEGORIES.find((category) => category.id === profileCategoryId);

    if (!profileCategory) {
      continue;
    }

    const optionCodes = selection.keywords
      .map((keyword) => toOptionCode(selection.categoryCode, keyword.code))
      .filter((optionCode) => (
        profileCategory.options.some((option) => option.id === optionCode)
      ));

    if (optionCodes.length === 0) {
      continue;
    }

    preferences[profileCategory.id] = profileCategory.type === 'multi'
      ? [...new Set(optionCodes)]
      : optionCodes[0];
  }

  return preferences;
}

export function mergeKeywordCodeSelections(
  existingSelections: UserKeywordSelectionGroup[] | undefined,
  replacementSelections: KeywordCodeSelection[],
): KeywordCodeSelection[] {
  const replacementCodes = new Set(replacementSelections.map((selection) => selection.categoryCode));
  const preservedSelections = (existingSelections ?? [])
    .filter((selection) => !replacementCodes.has(selection.categoryCode))
    .map((selection) => ({
      categoryCode: selection.categoryCode,
      keywordCodes: selection.keywords.map((keyword) => keyword.code),
    }));

  return [
    ...preservedSelections,
    ...replacementSelections,
  ];
}
