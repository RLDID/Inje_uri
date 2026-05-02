import { prisma } from '@/server/db/prisma';

export async function findProfileImagesByUserId(userId: number) {
  return prisma.userProfileImage.findMany({
    where: { user_id: userId },
    orderBy: { sort_order: 'asc' },
  });
}

export async function unsetPrimaryProfileImages(userId: number) {
  return prisma.userProfileImage.updateMany({
    where: { user_id: userId },
    data: { is_primary: false },
  });
}

export async function createProfileImage(input: {
  userId: number;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
}) {
  return prisma.userProfileImage.create({
    data: {
      user_id: input.userId,
      image_url: input.imageUrl,
      sort_order: input.sortOrder,
      is_primary: input.isPrimary,
    },
  });
}

export async function findProfileImageByIdForUser(imageId: number, userId: number) {
  return prisma.userProfileImage.findFirst({
    where: {
      id: imageId,
      user_id: userId,
    },
  });
}

export async function deleteProfileImageById(imageId: number) {
  return prisma.userProfileImage.delete({
    where: { id: imageId },
  });
}

export async function updateProfileImageOrder(imageId: number, sortOrder: number) {
  return prisma.userProfileImage.update({
    where: { id: imageId },
    data: { sort_order: sortOrder },
  });
}

export async function setPrimaryProfileImage(imageId: number) {
  return prisma.userProfileImage.update({
    where: { id: imageId },
    data: { is_primary: true },
  });
}
