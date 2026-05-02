/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiError, ERROR } from '@/server/lib/errors';
import {
  createProfileImage,
  deleteProfileImageById,
  findProfileImageByIdForUser,
  findProfileImagesByUserId,
  setPrimaryProfileImage,
  unsetPrimaryProfileImages,
  updateProfileImageOrder,
} from '@/server/repositories/user/profile-image.repository';
import {
  MAX_PROFILE_IMAGES,
  removeStoredProfileImage,
  saveProfileImageFile,
} from '@/server/services/user/profile-image-storage';

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export async function uploadProfileImage(userId: number, formData: FormData) {
  const imageEntry = formData.get('image');
  const imageUrlEntry = formData.get('imageUrl');

  let imageUrl = '';
  if (imageEntry instanceof File && imageEntry.size > 0) {
    imageUrl = await saveProfileImageFile(imageEntry);
  } else if (typeof imageUrlEntry === 'string') {
    imageUrl = imageUrlEntry.trim();
  }

  if (!imageUrl) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '업로드할 이미지가 필요합니다.');
  }

  const requestedPrimary = parseBoolean(formData.get('isPrimary'));
  const images = await findProfileImagesByUserId(userId);

  if (images.length >= MAX_PROFILE_IMAGES) {
    throw new ApiError(ERROR.CONFLICT, `프로필 이미지는 최대 ${MAX_PROFILE_IMAGES}개까지 등록할 수 있습니다.`);
  }

  const shouldSetPrimary = requestedPrimary || images.length === 0;
  if (shouldSetPrimary) {
    await unsetPrimaryProfileImages(userId);
  }

  const maxSortOrder = images.reduce((maxValue: number, image: any) => Math.max(maxValue, image.sort_order), 0);
  const createdImage = await createProfileImage({
    userId,
    imageUrl,
    sortOrder: maxSortOrder + 1,
    isPrimary: shouldSetPrimary,
  });

  return {
    image: {
      id: createdImage.id,
      imageUrl: createdImage.image_url,
      sortOrder: createdImage.sort_order,
      isPrimary: createdImage.is_primary,
    },
  };
}

export async function deleteProfileImage(userId: number, imageId: number) {
  const targetImage = await findProfileImageByIdForUser(imageId, userId);

  if (!targetImage) {
    throw new ApiError(ERROR.NOT_FOUND, '프로필 이미지를 찾을 수 없습니다.');
  }

  await deleteProfileImageById(targetImage.id);

  const remainingImages = await findProfileImagesByUserId(userId);

  for (const [index, image] of remainingImages.entries()) {
    const nextOrder = index + 1;
    if (image.sort_order !== nextOrder) {
      await updateProfileImageOrder(image.id, nextOrder);
    }
  }

  if (targetImage.is_primary && remainingImages.length > 0) {
    const hasPrimary = remainingImages.some((image: any) => image.is_primary);
    if (!hasPrimary) {
      await setPrimaryProfileImage(remainingImages[0].id);
    }
  }

  await removeStoredProfileImage(targetImage.image_url);
  return { deletedImageId: targetImage.id };
}
