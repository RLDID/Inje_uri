import { createHash } from "crypto";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/lib/app-error";
import { SafetyRepository } from "@/server/repositories/safety/safety.repository";
import type { ActiveBlockListRow } from "@/server/repositories/safety/safety.repository";
import type {
  BlockListDto,
  BlockListItemDto,
  BlockUserResultDto,
  CreateReportResultDto,
  PhoneBlockResultDto,
  UnblockResultDto,
} from "@/lib/types/safety";

const repo = new SafetyRepository(prisma);

function toBlockListItemDto(row: ActiveBlockListRow): BlockListItemDto {
  return {
    blockId: row.id,
    blockedUser: {
      userId: row.blocked_user.id,
      nickname: row.blocked_user.nickname,
      profileImage: row.blocked_user.userProfileImages[0]?.image_url ?? null,
    },
    reason: row.reason,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createReport(
  reporterUserId: number,
  params: {
    targetType: string;
    targetId: number;
    reasonType: string;
    description: string | null;
    alsoBlock: boolean;
  },
): Promise<CreateReportResultDto> {
  const targetOwnerUserId = await repo.findTargetOwnerUserId(params.targetType, params.targetId, reporterUserId);

  if (targetOwnerUserId === null) {
    throw new AppError("TARGET_NOT_FOUND", "신고 대상이 존재하지 않습니다.");
  }

  if (targetOwnerUserId === reporterUserId) {
    throw new AppError("CANNOT_REPORT_SELF", "자기 자신을 신고할 수 없습니다.");
  }

  if (params.alsoBlock) {
    return repo.createReportWithBlock(
      {
        reporterUserId,
        targetType: params.targetType,
        targetId: params.targetId,
        reasonType: params.reasonType,
        description: params.description,
      },
      {
        blockerUserId: reporterUserId,
        blockedUserId: targetOwnerUserId,
        reason: `신고와 동시 차단 (${params.targetType} #${params.targetId})`,
      },
    );
  }

  const report = await repo.createReport({
    reporterUserId,
    targetType: params.targetType,
    targetId: params.targetId,
    reasonType: params.reasonType,
    description: params.description,
  });

  return { reportId: report.id };
}

export async function blockUser(
  blockerUserId: number,
  blockedUserId: number,
  reason: string | null,
): Promise<BlockUserResultDto> {
  if (blockerUserId === blockedUserId) {
    throw new AppError("CANNOT_BLOCK_SELF", "자기 자신을 차단할 수 없습니다.");
  }

  const targetUser = await repo.findUserById(blockedUserId);
  if (!targetUser) {
    throw new AppError("USER_NOT_FOUND", "존재하지 않는 사용자입니다.");
  }

  const existingBlock = await repo.findExistingBlock(blockerUserId, blockedUserId);
  if (existingBlock && !existingBlock.unblocked_at) {
    throw new AppError("ALREADY_BLOCKED", "이미 차단한 사용자입니다.");
  }

  if (existingBlock && existingBlock.unblocked_at) {
    const reblocked = await repo.reactivateBlock(existingBlock.id, reason);
    return { blockId: reblocked.id };
  }

  const block = await repo.createBlock(blockerUserId, blockedUserId, reason);
  return { blockId: block.id };
}

export async function listBlocks(currentUserId: number): Promise<BlockListDto> {
  const rows = await repo.findActiveBlocksByUser(currentUserId);

  return {
    items: rows.map(toBlockListItemDto),
  };
}

export async function unblockUser(currentUserId: number, blockId: number): Promise<UnblockResultDto> {
  const block = await repo.findBlockById(blockId);

  if (!block) {
    throw new AppError("BLOCK_NOT_FOUND", "존재하지 않는 차단입니다.");
  }

  if (block.blocker_user_id !== currentUserId) {
    throw new AppError("BLOCK_NOT_OWNER", "본인이 차단한 관계만 해제할 수 있습니다.");
  }

  if (block.unblocked_at) {
    throw new AppError("ALREADY_UNBLOCKED", "이미 해제된 차단입니다.");
  }

  await repo.unblockById(blockId);

  return { unblocked: true };
}

export async function blockPhone(userId: number, phoneNumberE164: string): Promise<PhoneBlockResultDto> {
  const phoneNumberHash = createHash("sha256").update(phoneNumberE164).digest("hex");
  const existingBlock = await repo.findExistingPhoneBlock(userId, phoneNumberHash);

  if (existingBlock && !existingBlock.unblocked_at) {
    throw new AppError("ALREADY_BLOCKED", "이미 차단한 전화번호입니다.");
  }

  if (existingBlock && existingBlock.unblocked_at) {
    const reblocked = await repo.reactivatePhoneBlock(existingBlock.id);
    return { phoneBlockId: reblocked.id };
  }

  const phoneBlock = await repo.createPhoneBlock(userId, phoneNumberHash);
  return { phoneBlockId: phoneBlock.id };
}
