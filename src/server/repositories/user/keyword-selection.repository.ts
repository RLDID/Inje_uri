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

export async function replaceUserKeywordSelections(
  userId: number,
  rows: Array<{
    category_id: number;
    keyword_id: number;
  }>,
) {
  await prisma.userKeywordSelection.deleteMany({
    where: { user_id: userId },
  });

  if (rows.length === 0) {
    return;
  }

  await prisma.userKeywordSelection.createMany({
    data: rows.map((row) => ({
      user_id: userId,
      category_id: row.category_id,
      keyword_id: row.keyword_id,
    })),
  });
}
