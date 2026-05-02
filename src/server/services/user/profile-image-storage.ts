import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ApiError, ERROR } from '@/server/lib/errors';

export const MAX_PROFILE_IMAGES = 6;
const MAX_PROFILE_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

const PROFILE_UPLOAD_URL_PREFIX = '/uploads/profile';
const PROFILE_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profile');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

function getFileExtension(file: File): string {
  const nameSegments = file.name.split('.');
  const extension = nameSegments.length > 1 ? nameSegments[nameSegments.length - 1] : '';
  const sanitized = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sanitized || 'jpg';
}

export async function saveProfileImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '이미지 파일만 업로드할 수 있습니다.');
  }

  if (file.size <= 0 || file.size > MAX_PROFILE_IMAGE_FILE_SIZE) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '이미지 파일 크기를 확인해주세요. (최대 5MB)');
  }

  await mkdir(PROFILE_UPLOAD_DIR, { recursive: true });

  const extension = getFileExtension(file);
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const filePath = path.join(PROFILE_UPLOAD_DIR, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);
  return `${PROFILE_UPLOAD_URL_PREFIX}/${fileName}`;
}

export async function removeStoredProfileImage(imageUrl: string): Promise<void> {
  if (!imageUrl.startsWith(PROFILE_UPLOAD_URL_PREFIX)) {
    return;
  }

  const relative = imageUrl.replace(/^\//, '');
  const filePath = path.join(PUBLIC_DIR, relative);
  const normalizedPublicDir = path.resolve(PUBLIC_DIR);
  const normalizedFilePath = path.resolve(filePath);

  if (!normalizedFilePath.startsWith(normalizedPublicDir)) {
    return;
  }

  await unlink(normalizedFilePath).catch(() => undefined);
}
