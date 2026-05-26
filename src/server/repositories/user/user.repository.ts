import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db/prisma';
import { hashStudentNumber } from '@/server/lib/auth';

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
  real_name: string;
  email: string;
  birth_hash: string | null;
  status: string;
  deleted_at: Date | null;
};

export type StudentVerificationUser = {
  id: number;
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
  const studentNumberHash = hashStudentNumber(studentNumber);

  return prisma.user.findFirst({
    where: {
      OR: [
        { student_number_hash: studentNumberHash },
        { student_number: studentNumber },
      ],
      login_id: { not: null },
      birth_hash: { not: null },
    },
    select: { id: true },
  });
}

export async function findUserForStudentVerification(studentNumber: string): Promise<StudentVerificationUser | null> {
  const studentNumberHash = hashStudentNumber(studentNumber);

  return prisma.user.findFirst({
    where: {
      OR: [
        { student_number_hash: studentNumberHash },
        { student_number: studentNumber },
      ],
      login_id: { not: null },
      birth_hash: { not: null },
    },
    select: {
      id: true,
      birth_hash: true,
      status: true,
      deleted_at: true,
    },
  });
}

export async function findUserForAccountRecovery(studentNumber: string): Promise<AccountRecoveryUser | null> {
  const studentNumberHash = hashStudentNumber(studentNumber);

  return prisma.user.findFirst({
    where: {
      OR: [
        { student_number_hash: studentNumberHash },
        { student_number: studentNumber },
      ],
      login_id: { not: null },
      birth_hash: { not: null },
    },
    select: {
      id: true,
      login_id: true,
      real_name: true,
      email: true,
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
    select: {
      id: true,
      email: true,
      nickname: true,
      gender: true,
      university: true,
      department: true,
      student_year: true,
      bio: true,
      last_active_at: true,
      userProfileImages: {
        orderBy: { sort_order: 'asc' },
        select: {
          id: true,
          image_url: true,
          sort_order: true,
          is_primary: true,
        },
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
