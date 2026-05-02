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

export async function createUser(data: Prisma.UserUncheckedCreateInput) {
  return prisma.user.create({ data });
}

export async function updateUser(userId: number, data: UserUpdateData) {
  return prisma.user.update({
    where: { id: userId },
    data: data as Prisma.UserUncheckedUpdateInput,
  });
}
