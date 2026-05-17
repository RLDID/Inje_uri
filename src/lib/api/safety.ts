import { apiDelete, apiGet, apiPost } from '@/lib/api/client';
import type { BlockListDto, BlockUserResultDto, CreateReportResultDto, PhoneBlockResultDto, UnblockResultDto } from '@/lib/types/safety';

export async function reportTarget(input: {
  targetType: string;
  targetId: string | number;
  reasonType: string;
  description?: string | null;
  alsoBlock?: boolean;
}) {
  return apiPost<CreateReportResultDto>('/api/reports', {
    targetType: input.targetType,
    targetId: Number(input.targetId),
    reasonType: input.reasonType,
    description: input.description ?? null,
    alsoBlock: Boolean(input.alsoBlock),
  });
}

export async function blockUser(userId: string | number, reason?: string | null) {
  return apiPost<BlockUserResultDto>('/api/blocks', {
    blockedUserId: Number(userId),
    reason: reason ?? null,
  });
}

export async function unblockUser(blockId: string | number) {
  return apiDelete<UnblockResultDto>('/api/blocks', { body: { blockId: Number(blockId) } });
}

export async function getBlocks() {
  return apiGet<BlockListDto>('/api/blocks');
}

export async function blockPhone(phoneNumberE164: string) {
  return apiPost<PhoneBlockResultDto>('/api/blocks/phone', { phoneNumberE164 });
}
