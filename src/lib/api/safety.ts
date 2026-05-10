import { apiDelete, apiGet, apiPost } from '@/lib/api/client';

export async function reportTarget(input: {
  targetType: string;
  targetId: string | number;
  reasonType: string;
  description?: string | null;
  alsoBlock?: boolean;
}) {
  return apiPost('/api/reports', {
    targetType: input.targetType,
    targetId: Number(input.targetId),
    reasonType: input.reasonType,
    description: input.description ?? null,
    alsoBlock: Boolean(input.alsoBlock),
  });
}

export async function blockUser(userId: string | number, reason?: string | null) {
  return apiPost('/api/blocks', {
    blockedUserId: Number(userId),
    reason: reason ?? null,
  });
}

export async function unblockUser(blockId: string | number) {
  return apiDelete('/api/blocks', { body: { blockId: Number(blockId) } });
}

export async function getBlocks() {
  return apiGet('/api/blocks');
}

export async function blockPhone(phoneNumberE164: string) {
  return apiPost('/api/blocks/phone', { phoneNumberE164 });
}
