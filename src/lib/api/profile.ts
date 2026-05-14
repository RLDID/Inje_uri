import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { mapUserProfileToUser, type ApiUserProfile } from '@/lib/api/mappers';
import type { User } from '@/lib/types';

export type CurrentUserProfile = ApiUserProfile;

export async function getMeProfileRaw(): Promise<CurrentUserProfile> {
  return apiGet<CurrentUserProfile>('/api/users/me');
}

export async function getMe(): Promise<User> {
  return mapUserProfileToUser(await getMeProfileRaw());
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
