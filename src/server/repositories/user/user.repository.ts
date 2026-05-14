import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db/prisma';

export type UserUpdateData = Partial<{
  nickname: string;
  bio: string | null;
  age: number | null;
  gender: string;
  nationality: string;
  university: string;
  department: string;
  student_year: number;
  onboarding_completed: boolean;
}>;

export type AccountRecoveryUser = {
  id: number;
  login_id: string | null;
  birth_hash: string | null;
  status: string;
  deleted_at: Date | null;
};

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function findUserByLoginId(loginId: string) {
  return prisma.user.findUnique({
    where: { login_id: loginId },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
}

export async function findUserByNickname(nickname: string, excludeUserId?: number) {
  return prisma.user.findFirst({
    where: {
      nickname,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
}

export async function findUserByStudentNumber(studentNumber: string) {
  return prisma.user.findFirst({
    where: { student_number: studentNumber },
    select: { id: true },
  });
}

export async function findUserForAccountRecovery(studentNumber: string): Promise<AccountRecoveryUser | null> {
  return prisma.user.findFirst({
    where: { student_number: studentNumber },
    select: {
      id: true,
      login_id: true,
      birth_hash: true,
      status: true,
      deleted_at: true,
    },
  });
}

export async function findUserProfileById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      userProfileImages: {
        orderBy: { sort_order: 'asc' },
      },
      userKeywordSelections: {
        include: {
          category: true,
          keyword: true,
        },
      },
    },
  });
}

export async function findActiveUserProfileById(userId: number) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      status: 'active',
      deleted_at: null,
    },
    include: {
      userProfileImages: {
        orderBy: { sort_order: 'asc' },
      },
      userKeywordSelections: {
        include: {
          category: true,
          keyword: true,
        },
      },
    },
  });
}

export async function createUser(data: Prisma.UserUncheckedCreateInput) {
  return prisma.user.create({ data });
}

export async function createUserWithKeywordSelections(
  data: Prisma.UserUncheckedCreateInput,
  keywordSelections: Array<{
    category_id: number;
    keyword_id: number;
  }>,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data });

    if (keywordSelections.length > 0) {
      await tx.userKeywordSelection.createMany({
        data: keywordSelections.map((selection) => ({
          user_id: user.id,
          category_id: selection.category_id,
          keyword_id: selection.keyword_id,
        })),
      });
    }

    return user;
  });
}

export async function updateUser(userId: number, data: UserUpdateData) {
  return prisma.user.update({
    where: { id: userId },
    data: data as Prisma.UserUncheckedUpdateInput,
  });
}

export async function updateUserPasswordHash(userId: number, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { password_hash: passwordHash },
  });
}
