import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { mapUserProfileToUser, type ApiUserProfile } from '@/lib/api/mappers';
import type { User } from '@/lib/types';

export async function getMe(): Promise<User> {
  const data = await apiGet<ApiUserProfile>('/api/users/me');
  return mapUserProfileToUser(data);
}

export async function updateMe(body: Record<string, unknown>): Promise<User> {
  const data = await apiPatch<ApiUserProfile>('/api/users/me', body);
  return mapUserProfileToUser(data);
}

export async function uploadMyProfileImage(file: File, isPrimary = false) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('isPrimary', String(isPrimary));
  return apiPost('/api/users/me/images', formData);
}

export async function deleteMyProfileImage(imageId: number | string) {
  return apiDelete(`/api/users/me/images/${imageId}`);
}
