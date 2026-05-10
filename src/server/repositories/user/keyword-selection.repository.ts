import { prisma } from '@/server/db/prisma';

export async function findAllCategoriesWithKeywords() {
  return prisma.category.findMany({
    orderBy: { category_id: 'asc' },
    include: {
      keywords: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });
}

export async function findCategoriesWithKeywordsByIds(categoryIds: number[]) {
  return prisma.category.findMany({
    where: { category_id: { in: categoryIds } },
    include: { keywords: true },
  });
}

/**
 * 특정 카테고리들의 키워드 선택을 교체합니다. (Atomic Update)
 * 지정된 targetCategoryIds에 속한 기존 데이터만 삭제하고 새로운 데이터를 삽입합니다.
 */
export async function replaceUserKeywordSelections(
  userId: number,
  rows: Array<{
    category_id: number;
    keyword_id: number;
  }>,
  targetCategoryIds: number[],
) {
  // 1. 지정된 카테고리에 한해서만 기존 선택 삭제
  await prisma.userKeywordSelection.deleteMany({
    where: {
      user_id: userId,
      category_id: { in: targetCategoryIds },
    },
  });

  if (rows.length === 0) {
    return;
  }

  // 2. 새로운 선택 삽입
  await prisma.userKeywordSelection.createMany({
    data: rows.map((row) => ({
      user_id: userId,
      category_id: row.category_id,
      keyword_id: row.keyword_id,
    })),
  });
}
