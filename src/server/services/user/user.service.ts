/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiError, ERROR } from '@/server/lib/errors';
import {
  findAllCategoriesWithKeywords,
  findCategoriesWithKeywordsByIds,
  replaceUserKeywordSelections,
} from '@/server/repositories/user/keyword-selection.repository';
import {
  findUserById,
  findUserByNickname,
  findUserProfileById,
  type UserUpdateData,
  updateUser,
} from '@/server/repositories/user/user.repository';

interface KeywordSelectionInput {
  categoryId?: unknown;
  keywordIds?: unknown;
}

export interface UserPatchBody {
  profile?: {
    nickname?: unknown;
    bio?: unknown;
    age?: unknown;
    gender?: unknown;
    nationality?: unknown;
    university?: unknown;
    department?: unknown;
    studentYear?: unknown;
    onboardingCompleted?: unknown;
  };
  keywordSelections?: unknown;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function groupSelectionsByCategory(
  selections: Array<{
    category_id: number;
    category_code: string;
    category_name: string;
    selection_type: string;
    max_select_count: number;
    keyword_id: number;
    keyword_code: string;
    keyword_label: string;
    keyword_sort_order: number;
  }>,
) {
  const grouped = new Map<number, {
    categoryId: number;
    categoryCode: string;
    categoryName: string;
    selectionType: string;
    maxSelectCount: number;
    keywords: Array<{
      id: number;
      code: string;
      label: string;
      sortOrder: number;
    }>;
  }>();

  for (const selection of selections) {
    if (!grouped.has(selection.category_id)) {
      grouped.set(selection.category_id, {
        categoryId: selection.category_id,
        categoryCode: selection.category_code,
        categoryName: selection.category_name,
        selectionType: selection.selection_type,
        maxSelectCount: selection.max_select_count,
        keywords: [],
      });
    }

    grouped.get(selection.category_id)?.keywords.push({
      id: selection.keyword_id,
      code: selection.keyword_code,
      label: selection.keyword_label,
      sortOrder: selection.keyword_sort_order,
    });
  }

  return Array.from(grouped.values()).sort((left, right) => left.categoryId - right.categoryId);
}

function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

async function generateTodayRecommendationsAfterOnboarding(userId: number) {
  const { generateRecommendationsForUser } = await import('@/server/services/matching/recommendation.service');
  await generateRecommendationsForUser(userId, getKSTDateString());
}

async function normalizeKeywordSelections(rawValue: unknown) {
  if (rawValue === undefined) {
    return null;
  }

  if (!Array.isArray(rawValue)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, 'keywordSelections는 배열이어야 합니다.');
  }

  const normalized = rawValue.map((item) => {
    const selection = item as KeywordSelectionInput;
    const categoryId = toOptionalNumber(selection.categoryId);
    const rawKeywordIds = selection.keywordIds;

    if (!categoryId || !Array.isArray(rawKeywordIds)) {
      throw new ApiError(ERROR.VALIDATION_ERROR, 'categoryId와 keywordIds 형식을 확인해주세요.');
    }

    const keywordIds = [...new Set(
      rawKeywordIds
        .map((keywordId) => (typeof keywordId === 'number' ? keywordId : Number.NaN))
        .filter((keywordId) => !Number.isNaN(keywordId)),
    )];

    return { categoryId, keywordIds };
  });

  const categoryIds = normalized.map((item) => item.categoryId);
  const uniqueCategoryCount = new Set(categoryIds).size;
  if (uniqueCategoryCount !== categoryIds.length) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '중복된 카테고리는 허용되지 않습니다.');
  }

  const categories = await findCategoriesWithKeywordsByIds(categoryIds);
  const categoryMap = new Map(categories.map((category: any) => [category.category_id, category]));
  if (categoryMap.size !== categoryIds.length) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '존재하지 않는 카테고리가 포함되어 있습니다.');
  }

  for (const item of normalized) {
    const category = categoryMap.get(item.categoryId);
    if (!category) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '존재하지 않는 카테고리가 포함되어 있습니다.');
    }

    const validKeywordIds = new Set((category as any).keywords.map((keyword: any) => keyword.keyword_id));
    const hasInvalidKeyword = item.keywordIds.some((keywordId) => !validKeywordIds.has(keywordId));

    if (hasInvalidKeyword) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '카테고리와 맞지 않는 키워드가 포함되어 있습니다.');
    }

    if (item.keywordIds.length > (category as any).max_select_count) {
      throw new ApiError(ERROR.VALIDATION_ERROR, `${(category as any).name} 선택 개수를 초과했습니다.`);
    }

    if ((category as any).selection_type === 'single' && item.keywordIds.length > 1) {
      throw new ApiError(ERROR.VALIDATION_ERROR, `${(category as any).name}는 하나만 선택할 수 있습니다.`);
    }
  }

  return normalized;
}

export async function getCurrentUserProfile(userId: number) {
  const user = await findUserProfileById(userId);

  if (!user) {
    throw new ApiError(ERROR.NOT_FOUND, '사용자 정보를 찾을 수 없습니다.');
  }

  return {
    user: {
      id: user.id,
      realName: user.real_name,
      email: user.email,
      nickname: user.nickname,
      gender: user.gender,
      age: user.age,
      phoneNumber: user.phone_number,
      nationality: user.nationality,
      university: user.university,
      department: user.department,
      studentYear: user.student_year,
      studentNumber: user.student_number,
      bio: user.bio,
      onboardingCompleted: user.onboarding_completed,
      status: user.status,
      createdAt: user.created_at.toISOString(),
      lastActiveAt: user.last_active_at?.toISOString() ?? null,
    },
    profileImages: user.userProfileImages.map((image: any) => ({
      id: image.id,
      imageUrl: image.image_url,
      sortOrder: image.sort_order,
      isPrimary: image.is_primary,
    })),
    keywordSelections: groupSelectionsByCategory(
      user.userKeywordSelections.map((selection: any) => ({
        category_id: selection.category.category_id,
        category_code: selection.category.category_code,
        category_name: selection.category.name,
        selection_type: selection.category.selection_type,
        max_select_count: selection.category.max_select_count,
        keyword_id: selection.keyword.keyword_id,
        keyword_code: selection.keyword.keyword_code,
        keyword_label: selection.keyword.label,
        keyword_sort_order: selection.keyword.sort_order,
      })),
    ),
  };
}

export async function updateCurrentUserProfile(userId: number, body: UserPatchBody) {
  const updateData: UserUpdateData = {};
  const profile = body.profile ?? {};
  let shouldGenerateTodayRecommendations = false;

  if (profile.nickname !== undefined) {
    const nickname = toOptionalString(profile.nickname);
    if (!nickname) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '닉네임을 입력해주세요.');
    }

    if (nickname.length < 2 || nickname.length > 50) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '닉네임은 2자 이상 50자 이하여야 합니다.');
    }

    const duplicatedUser = await findUserByNickname(nickname, userId);

    if (duplicatedUser) {
      throw new ApiError(ERROR.NICKNAME_ALREADY_EXISTS, '이미 사용 중인 닉네임입니다.');
    }

    updateData.nickname = nickname;
  }

  if (profile.bio !== undefined) {
    if (profile.bio === null) {
      updateData.bio = null;
    } else {
      const bio = toOptionalString(profile.bio);
      if (bio === undefined) {
        throw new ApiError(ERROR.VALIDATION_ERROR, 'bio 형식을 확인해주세요.');
      }

      if (bio.length > 500) {
        throw new ApiError(ERROR.VALIDATION_ERROR, '자기소개는 500자를 초과할 수 없습니다.');
      }

      updateData.bio = bio;
    }
  }

  if (profile.age !== undefined) {
    if (profile.age === null) {
      updateData.age = null;
    } else {
      const age = toOptionalNumber(profile.age);
      if (!age || age < 18 || age > 100) {
        throw new ApiError(ERROR.VALIDATION_ERROR, '나이 범위를 확인해주세요.');
      }

      updateData.age = age;
    }
  }

  if (profile.gender !== undefined) {
    const gender = toOptionalString(profile.gender);
    if (!gender) {
      throw new ApiError(ERROR.VALIDATION_ERROR, 'gender 형식을 확인해주세요.');
    }
    updateData.gender = gender;
  }

  if (profile.nationality !== undefined) {
    const nationality = toOptionalString(profile.nationality);
    if (!nationality) {
      throw new ApiError(ERROR.VALIDATION_ERROR, 'nationality 형식을 확인해주세요.');
    }
    updateData.nationality = nationality;
  }

  if (profile.university !== undefined) {
    const university = toOptionalString(profile.university);
    if (!university) {
      throw new ApiError(ERROR.VALIDATION_ERROR, 'university 형식을 확인해주세요.');
    }
    updateData.university = university;
  }

  if (profile.department !== undefined) {
    const department = toOptionalString(profile.department);
    if (!department) {
      throw new ApiError(ERROR.VALIDATION_ERROR, 'department 형식을 확인해주세요.');
    }
    updateData.department = department;
  }

  if (profile.studentYear !== undefined) {
    const studentYear = toOptionalNumber(profile.studentYear);
    if (!studentYear || studentYear < 1 || studentYear > 8) {
      throw new ApiError(ERROR.VALIDATION_ERROR, 'studentYear 범위를 확인해주세요.');
    }
    updateData.student_year = studentYear;
  }

  if (profile.onboardingCompleted !== undefined) {
    if (typeof profile.onboardingCompleted !== 'boolean') {
      throw new ApiError(ERROR.VALIDATION_ERROR, 'onboardingCompleted 형식을 확인해주세요.');
    }

    if (profile.onboardingCompleted) {
      const currentUser = await findUserById(userId);
      if (!currentUser) {
        throw new ApiError(ERROR.NOT_FOUND, '사용자 정보를 찾을 수 없습니다.');
      }
      shouldGenerateTodayRecommendations = !currentUser.onboarding_completed;
    }

    updateData.onboarding_completed = profile.onboardingCompleted;
  }

  const keywordSelections = await normalizeKeywordSelections(body.keywordSelections);

  if (Object.keys(updateData).length > 0) {
    await updateUser(userId, updateData);
  }

  if (keywordSelections !== null) {
    const rows = keywordSelections.flatMap((selection) => (
      selection.keywordIds.map((keywordId) => ({
        category_id: selection.categoryId,
        keyword_id: keywordId,
      }))
    ));

    await replaceUserKeywordSelections(userId, rows);
  }

  if (shouldGenerateTodayRecommendations) {
    await generateTodayRecommendationsAfterOnboarding(userId).catch((error) => {
      console.error('[PATCH /api/users/me onboarding recommendations]', error);
    });
  }

  return getCurrentUserProfile(userId);
}

export async function getProfileTaxonomy() {
  const categories = await findAllCategoriesWithKeywords();

  return {
    categories: categories.map((category: any) => ({
      id: category.category_id,
      code: category.category_code,
      name: category.name,
      selectionType: category.selection_type,
      maxSelectCount: category.max_select_count,
      keywords: category.keywords.map((keyword: any) => ({
        id: keyword.keyword_id,
        code: keyword.keyword_code,
        label: keyword.label,
        sortOrder: keyword.sort_order,
      })),
    })),
  };
}
