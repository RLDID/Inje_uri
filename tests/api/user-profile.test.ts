import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { invalidJsonRequest, jsonRequest, readJson } from '../helpers/api';

const authMocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
}));

const userServiceMocks = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  getProfileTaxonomy: vi.fn(),
  updateCurrentUserProfile: vi.fn(),
}));

const profileImageMocks = vi.hoisted(() => ({
  deleteProfileImage: vi.fn(),
  uploadProfileImage: vi.fn(),
}));

const emailVerificationMocks = vi.hoisted(() => ({
  confirmEmailVerification: vi.fn(),
  requestEmailVerification: vi.fn(),
}));

vi.mock('@/server/lib/auth', () => authMocks);
vi.mock('@/server/services/user/user.service', () => userServiceMocks);
vi.mock('@/server/services/user/profile-image.service', () => profileImageMocks);
vi.mock('@/server/services/auth/email-verification.service', () => emailVerificationMocks);

import { POST as confirmEmailVerification } from '@/app/api/email-verifications/confirm/route';
import { POST as requestEmailVerification } from '@/app/api/email-verifications/request/route';
import { GET as getProfileTaxonomy } from '@/app/api/profile-taxonomy/route';
import { DELETE as deleteProfileImage } from '@/app/api/users/me/images/[imageId]/route';
import { POST as uploadProfileImage } from '@/app/api/users/me/images/route';
import { GET as getCurrentUser, PATCH as patchCurrentUser } from '@/app/api/users/me/route';

describe('user, profile, image, and email APIs', () => {
  const authUser = {
    id: 7,
    email: 'student@oasis.inje.ac.kr',
    status: 'active',
    deleted_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getAuthUser.mockResolvedValue(authUser);
  });

  it('requires auth before returning the current user profile', async () => {
    authMocks.getAuthUser.mockResolvedValue(null);

    const response = await getCurrentUser(jsonRequest('/api/users/me'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('UNAUTHORIZED');
    expect(userServiceMocks.getCurrentUserProfile).not.toHaveBeenCalled();
  });

  it('returns the current user profile from the user service', async () => {
    const profile = { id: authUser.id, nickname: 'tester', keywords: [] };
    userServiceMocks.getCurrentUserProfile.mockResolvedValue(profile);

    const response = await getCurrentUser(jsonRequest('/api/users/me'));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: profile });
    expect(userServiceMocks.getCurrentUserProfile).toHaveBeenCalledWith(authUser.id);
  });

  it('rejects malformed profile PATCH JSON', async () => {
    const response = await patchCurrentUser(invalidJsonRequest('/api/users/me', 'PATCH'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('VALIDATION_ERROR');
    expect(userServiceMocks.updateCurrentUserProfile).not.toHaveBeenCalled();
  });

  it('updates the current user profile through the user service', async () => {
    const patch = { nickname: 'new-name', keywordIds: [1, 2, 3] };
    const updated = { id: authUser.id, nickname: 'new-name' };
    userServiceMocks.updateCurrentUserProfile.mockResolvedValue(updated);

    const response = await patchCurrentUser(jsonRequest('/api/users/me', {
      method: 'PATCH',
      body: patch,
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: updated });
    expect(userServiceMocks.updateCurrentUserProfile).toHaveBeenCalledWith(authUser.id, patch);
  });

  it('requires auth for the profile taxonomy API', async () => {
    authMocks.getAuthUser.mockResolvedValue(null);

    const response = await getProfileTaxonomy(jsonRequest('/api/profile-taxonomy'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('UNAUTHORIZED');
    expect(userServiceMocks.getProfileTaxonomy).not.toHaveBeenCalled();
  });

  it('returns profile taxonomy categories', async () => {
    const taxonomy = { keywords: [{ id: 1, name: 'music' }] };
    userServiceMocks.getProfileTaxonomy.mockResolvedValue(taxonomy);

    const response = await getProfileTaxonomy(jsonRequest('/api/profile-taxonomy'));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: taxonomy });
    expect(userServiceMocks.getProfileTaxonomy).toHaveBeenCalled();
  });

  it('uploads a profile image from multipart form data', async () => {
    const formData = new FormData();
    formData.set('imageUrl', 'https://cdn.example.com/profile.png');
    formData.set('isPrimary', 'true');
    const result = { image: { id: 3, imageUrl: 'https://cdn.example.com/profile.png' } };
    profileImageMocks.uploadProfileImage.mockResolvedValue(result);

    const request = new NextRequest(new URL('http://localhost/api/users/me/images'), {
      method: 'POST',
      body: formData,
    });
    const response = await uploadProfileImage(request);
    const payload = await readJson(response);

    expect(response.status).toBe(201);
    expect(payload).toEqual({ success: true, data: result });
    expect(profileImageMocks.uploadProfileImage).toHaveBeenCalledWith(authUser.id, expect.any(FormData));
  });

  it('rejects invalid profile image ids before delete service call', async () => {
    const response = await deleteProfileImage(jsonRequest('/api/users/me/images/not-a-number', {
      method: 'DELETE',
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('VALIDATION_ERROR');
    expect(profileImageMocks.deleteProfileImage).not.toHaveBeenCalled();
  });

  it('deletes a profile image by id', async () => {
    profileImageMocks.deleteProfileImage.mockResolvedValue({ deletedImageId: 5 });

    const response = await deleteProfileImage(jsonRequest('/api/users/me/images/5', {
      method: 'DELETE',
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: { deletedImageId: 5 } });
    expect(profileImageMocks.deleteProfileImage).toHaveBeenCalledWith(authUser.id, 5);
  });

  it('requests email verification for the authenticated user', async () => {
    const expiresAt = new Date('2026-01-02T00:00:00.000Z');
    emailVerificationMocks.requestEmailVerification.mockResolvedValue({
      schoolEmail: 'student@oasis.inje.ac.kr',
      expiresAt,
      debugCode: '123456',
    });

    const response = await requestEmailVerification(jsonRequest('/api/email-verifications/request', {
      method: 'POST',
      body: { schoolEmail: 'student@oasis.inje.ac.kr' },
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({
      success: true,
      data: {
        schoolEmail: 'student@oasis.inje.ac.kr',
        expiresAt: expiresAt.toISOString(),
        debugCode: '123456',
      },
    });
    expect(emailVerificationMocks.requestEmailVerification).toHaveBeenCalledWith({
      userId: authUser.id,
      requestedEmail: 'student@oasis.inje.ac.kr',
    });
  });

  it('rejects malformed email verification confirmation JSON', async () => {
    const response = await confirmEmailVerification(invalidJsonRequest('/api/email-verifications/confirm'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('VALIDATION_ERROR');
    expect(emailVerificationMocks.confirmEmailVerification).not.toHaveBeenCalled();
  });

  it('confirms an email verification code', async () => {
    const verifiedAt = new Date('2026-01-02T00:00:00.000Z');
    emailVerificationMocks.confirmEmailVerification.mockResolvedValue({
      verified: true,
      schoolEmail: 'student@oasis.inje.ac.kr',
      verifiedAt,
    });

    const response = await confirmEmailVerification(jsonRequest('/api/email-verifications/confirm', {
      method: 'POST',
      body: { schoolEmail: 'student@oasis.inje.ac.kr', code: '123456' },
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({
      success: true,
      data: {
        verified: true,
        schoolEmail: 'student@oasis.inje.ac.kr',
        verifiedAt: verifiedAt.toISOString(),
      },
    });
    expect(emailVerificationMocks.confirmEmailVerification).toHaveBeenCalledWith({
      userId: authUser.id,
      schoolEmail: 'student@oasis.inje.ac.kr',
      code: '123456',
    });
  });
});
