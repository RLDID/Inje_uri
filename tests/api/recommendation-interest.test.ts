import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonRequest, readJson, routeContext } from '../helpers/api';

const authMocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
}));

const recommendationMocks = vi.hoisted(() => ({
  dismissCandidate: vi.fn(),
  generateRecommendationsForUser: vi.fn(),
  getTodayRecommendations: vi.fn(),
  selectCandidate: vi.fn(),
}));

const interestMocks = vi.hoisted(() => ({
  acceptInterest: vi.fn(),
  declineInterest: vi.fn(),
  getReceivedInterests: vi.fn(),
  sendInterest: vi.fn(),
}));

const settingMocks = vi.hoisted(() => ({
  getRecommendationSetting: vi.fn(),
  updateRecommendationSetting: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  dailyRecommendation: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

vi.mock('@/server/lib/auth', () => authMocks);
vi.mock('@/server/services/matching/recommendation.service', () => recommendationMocks);
vi.mock('@/server/services/matching/interest.service', () => interestMocks);
vi.mock('@/server/services/matching/recommendation-setting.service', () => settingMocks);
vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }));

import { POST as runRecommendationBatch } from '@/app/api/batch/recommendations/route';
import { POST as acceptInterest } from '@/app/api/interests/[interestId]/accept/route';
import { POST as declineInterest } from '@/app/api/interests/[interestId]/decline/route';
import { GET as getReceivedInterests } from '@/app/api/interests/received/route';
import { POST as sendInterest } from '@/app/api/interests/send/route';
import { GET as getRecommendationSetting, PATCH as patchRecommendationSetting } from '@/app/api/recommendation-settings/route';
import { POST as dismissRecommendation } from '@/app/api/recommendations/[itemId]/dismiss/route';
import { POST as selectRecommendation } from '@/app/api/recommendations/select/route';
import { GET as getTodayRecommendations } from '@/app/api/recommendations/today/route';

describe('recommendation and interest APIs', () => {
  const authUser = { id: 7, status: 'active', deleted_at: null };

  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getAuthUser.mockResolvedValue(authUser);
    process.env.BATCH_SECRET = 'batch-secret';
  });

  it('requires auth before reading today recommendations', async () => {
    authMocks.getAuthUser.mockResolvedValue(null);

    const response = await getTodayRecommendations(jsonRequest('/api/recommendations/today'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('UNAUTHORIZED');
    expect(recommendationMocks.getTodayRecommendations).not.toHaveBeenCalled();
  });

  it('returns today recommendations for the authenticated user', async () => {
    const recommendations = { items: [{ itemId: 1, userId: 11 }] };
    recommendationMocks.getTodayRecommendations.mockResolvedValue(recommendations);

    const response = await getTodayRecommendations(jsonRequest('/api/recommendations/today'));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: recommendations });
    expect(recommendationMocks.getTodayRecommendations).toHaveBeenCalledWith(authUser.id);
  });

  it('validates selected recommendation ids', async () => {
    const response = await selectRecommendation(jsonRequest('/api/recommendations/select', {
      method: 'POST',
      body: { recommendation_item_id: '1' },
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('INVALID_INPUT');
    expect(recommendationMocks.selectCandidate).not.toHaveBeenCalled();
  });

  it('selects a recommendation candidate', async () => {
    const result = { matched: false, selectedItemId: 12 };
    recommendationMocks.selectCandidate.mockResolvedValue(result);

    const response = await selectRecommendation(jsonRequest('/api/recommendations/select', {
      method: 'POST',
      body: { recommendation_item_id: 12 },
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: result });
    expect(recommendationMocks.selectCandidate).toHaveBeenCalledWith(authUser.id, 12);
  });

  it('validates dismissed recommendation path ids', async () => {
    const response = await dismissRecommendation(
      jsonRequest('/api/recommendations/0/dismiss', { method: 'POST' }),
      routeContext({ itemId: '0' }),
    );
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('INVALID_INPUT');
    expect(recommendationMocks.dismissCandidate).not.toHaveBeenCalled();
  });

  it('dismisses a recommendation candidate', async () => {
    recommendationMocks.dismissCandidate.mockResolvedValue({ dismissed: true });

    const response = await dismissRecommendation(
      jsonRequest('/api/recommendations/12/dismiss', { method: 'POST' }),
      routeContext({ itemId: '12' }),
    );
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: { dismissed: true } });
    expect(recommendationMocks.dismissCandidate).toHaveBeenCalledWith(authUser.id, 12);
  });

  it('returns received interests', async () => {
    const result = { items: [{ interestId: 1, fromUserId: 20 }] };
    interestMocks.getReceivedInterests.mockResolvedValue(result);

    const response = await getReceivedInterests(jsonRequest('/api/interests/received'));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: result });
    expect(interestMocks.getReceivedInterests).toHaveBeenCalledWith(authUser.id);
  });

  it('validates direct interest targets', async () => {
    const response = await sendInterest(jsonRequest('/api/interests/send', {
      method: 'POST',
      body: { to_user_id: '20' },
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('INVALID_INPUT');
    expect(interestMocks.sendInterest).not.toHaveBeenCalled();
  });

  it('sends a direct interest', async () => {
    interestMocks.sendInterest.mockResolvedValue({ interestId: 9 });

    const response = await sendInterest(jsonRequest('/api/interests/send', {
      method: 'POST',
      body: { to_user_id: 20 },
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: { interestId: 9 } });
    expect(interestMocks.sendInterest).toHaveBeenCalledWith(authUser.id, 20);
  });

  it('validates accepted interest path ids', async () => {
    const response = await acceptInterest(
      jsonRequest('/api/interests/nope/accept', { method: 'POST' }),
      routeContext({ interestId: 'nope' }),
    );
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('INVALID_INPUT');
    expect(interestMocks.acceptInterest).not.toHaveBeenCalled();
  });

  it('accepts and declines received interests', async () => {
    interestMocks.acceptInterest.mockResolvedValue({ chatRoomId: 3 });
    interestMocks.declineInterest.mockResolvedValue({ declined: true });

    const acceptedResponse = await acceptInterest(
      jsonRequest('/api/interests/22/accept', { method: 'POST' }),
      routeContext({ interestId: '22' }),
    );
    const declinedResponse = await declineInterest(
      jsonRequest('/api/interests/23/decline', { method: 'POST' }),
      routeContext({ interestId: '23' }),
    );

    expect(await readJson(acceptedResponse)).toEqual({ success: true, data: { chatRoomId: 3 } });
    expect(await readJson(declinedResponse)).toEqual({ success: true, data: { declined: true } });
    expect(interestMocks.acceptInterest).toHaveBeenCalledWith(authUser.id, 22);
    expect(interestMocks.declineInterest).toHaveBeenCalledWith(authUser.id, 23);
  });

  it('gets and updates recommendation settings', async () => {
    const current = { exclude_same_department: true };
    const updated = { preferred_age_min: 21, preferred_age_max: 26 };
    settingMocks.getRecommendationSetting.mockResolvedValue(current);
    settingMocks.updateRecommendationSetting.mockResolvedValue(updated);

    const getResponse = await getRecommendationSetting(jsonRequest('/api/recommendation-settings'));
    const patchResponse = await patchRecommendationSetting(jsonRequest('/api/recommendation-settings', {
      method: 'PATCH',
      body: {
        exclude_same_department: false,
        reduce_same_year: true,
        preferred_age_min: 21,
        preferred_age_max: 26,
        ignored: true,
      },
    }));

    expect(await readJson(getResponse)).toEqual({ success: true, data: current });
    expect(await readJson(patchResponse)).toEqual({ success: true, data: updated });
    expect(settingMocks.getRecommendationSetting).toHaveBeenCalledWith(authUser.id);
    expect(settingMocks.updateRecommendationSetting).toHaveBeenCalledWith(authUser.id, {
      exclude_same_department: false,
      reduce_same_year: true,
      preferred_age_min: 21,
      preferred_age_max: 26,
    });
  });

  it('rejects recommendation batch requests with the wrong secret', async () => {
    const response = await runRecommendationBatch(jsonRequest('/api/batch/recommendations', {
      method: 'POST',
      headers: { 'x-batch-secret': 'wrong' },
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('UNAUTHORIZED');
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it('runs recommendation batch only for active users missing today recommendations', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    prismaMock.dailyRecommendation.findMany.mockResolvedValue([{ user_id: 2 }]);
    recommendationMocks.generateRecommendationsForUser.mockResolvedValue(undefined);

    const response = await runRecommendationBatch(jsonRequest('/api/batch/recommendations', {
      method: 'POST',
      headers: { 'x-batch-secret': 'batch-secret' },
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({ total: 2, success: 2, failed: 0 });
    expect(recommendationMocks.generateRecommendationsForUser).toHaveBeenCalledTimes(2);
    expect(recommendationMocks.generateRecommendationsForUser).toHaveBeenNthCalledWith(
      1,
      1,
      expect.any(String),
    );
    expect(recommendationMocks.generateRecommendationsForUser).toHaveBeenNthCalledWith(
      2,
      3,
      expect.any(String),
    );
  });
});
