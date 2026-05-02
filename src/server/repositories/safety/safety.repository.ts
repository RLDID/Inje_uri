import type { Prisma, PrismaClient } from "@/generated/prisma/client";

const activeBlockListSelect = {
  id: true,
  reason: true,
  created_at: true,
  blocked_user: {
    select: {
      id: true,
      nickname: true,
      userProfileImages: {
        where: { is_primary: true },
        select: { image_url: true },
        take: 1,
      },
    },
  },
} satisfies Prisma.BlockSelect;

export type ActiveBlockListRow = Prisma.BlockGetPayload<{ select: typeof activeBlockListSelect }>;

export class SafetyRepository {
  constructor(private readonly db: PrismaClient) {}

  async findTargetOwnerUserId(targetType: string, targetId: number, reporterUserId: number): Promise<number | null> {
    switch (targetType) {
      case "user": {
        const user = await this.db.user.findUnique({
          where: { id: targetId },
          select: { id: true },
        });
        return user ? user.id : null;
      }
      case "feed": {
        const feed = await this.db.selfDateFeed.findUnique({
          where: { id: targetId },
          select: { author_user_id: true },
        });
        return feed ? feed.author_user_id : null;
      }
      case "feed_comment": {
        const comment = await this.db.feedComment.findUnique({
          where: { id: targetId },
          select: { commenter_user_id: true },
        });
        return comment ? comment.commenter_user_id : null;
      }
      case "chat_room": {
        const participant = await this.db.chatRoomParticipant.findFirst({
          where: {
            chat_room_id: targetId,
            user_id: { not: reporterUserId },
          },
          select: { user_id: true },
        });
        return participant ? participant.user_id : null;
      }
      case "message": {
        const message = await this.db.message.findUnique({
          where: { id: targetId },
          select: { sender_user_id: true },
        });
        return message ? message.sender_user_id : null;
      }
      default:
        return null;
    }
  }

  async createReport(data: {
    reporterUserId: number;
    targetType: string;
    targetId: number;
    reasonType: string;
    description: string | null;
  }): Promise<{ id: number }> {
    return this.db.report.create({
      data: {
        reporter_user_id: data.reporterUserId,
        target_type: data.targetType,
        target_id: data.targetId,
        reason_type: data.reasonType,
        description: data.description,
      },
      select: { id: true },
    });
  }

  async createReportWithBlock(
    reportData: {
      reporterUserId: number;
      targetType: string;
      targetId: number;
      reasonType: string;
      description: string | null;
    },
    blockData: { blockerUserId: number; blockedUserId: number; reason: string },
  ): Promise<{ reportId: number }> {
    const [report] = await this.db.$transaction([
      this.db.report.create({
        data: {
          reporter_user_id: reportData.reporterUserId,
          target_type: reportData.targetType,
          target_id: reportData.targetId,
          reason_type: reportData.reasonType,
          description: reportData.description,
        },
        select: { id: true },
      }),
      this.db.block.upsert({
        where: {
          blocker_user_id_blocked_user_id: {
            blocker_user_id: blockData.blockerUserId,
            blocked_user_id: blockData.blockedUserId,
          },
        },
        create: {
          blocker_user_id: blockData.blockerUserId,
          blocked_user_id: blockData.blockedUserId,
          reason: blockData.reason,
        },
        update: {
          unblocked_at: null,
        },
      }),
    ]);

    return { reportId: report.id };
  }

  async findUserById(userId: number): Promise<{ id: number } | null> {
    return this.db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  async findExistingBlock(blockerUserId: number, blockedUserId: number): Promise<{ id: number; unblocked_at: Date | null } | null> {
    return this.db.block.findUnique({
      where: {
        blocker_user_id_blocked_user_id: {
          blocker_user_id: blockerUserId,
          blocked_user_id: blockedUserId,
        },
      },
      select: { id: true, unblocked_at: true },
    });
  }

  async createBlock(blockerUserId: number, blockedUserId: number, reason: string | null): Promise<{ id: number }> {
    return this.db.block.create({
      data: {
        blocker_user_id: blockerUserId,
        blocked_user_id: blockedUserId,
        reason,
      },
      select: { id: true },
    });
  }

  async reactivateBlock(blockId: number, reason: string | null): Promise<{ id: number }> {
    return this.db.block.update({
      where: { id: blockId },
      data: {
        reason,
        unblocked_at: null,
      },
      select: { id: true },
    });
  }

  async findActiveBlocksByUser(userId: number): Promise<ActiveBlockListRow[]> {
    return this.db.block.findMany({
      where: {
        blocker_user_id: userId,
        unblocked_at: null,
      },
      orderBy: { created_at: "desc" },
      select: activeBlockListSelect,
    });
  }

  async findBlockById(blockId: number): Promise<{ id: number; blocker_user_id: number; unblocked_at: Date | null } | null> {
    return this.db.block.findUnique({
      where: { id: blockId },
      select: { id: true, blocker_user_id: true, unblocked_at: true },
    });
  }

  async unblockById(blockId: number): Promise<void> {
    await this.db.block.update({
      where: { id: blockId },
      data: { unblocked_at: new Date() },
    });
  }

  async findExistingPhoneBlock(userId: number, phoneNumberHash: string): Promise<{ id: number; unblocked_at: Date | null } | null> {
    return this.db.phoneBlock.findUnique({
      where: {
        user_id_phone_number_hash: {
          user_id: userId,
          phone_number_hash: phoneNumberHash,
        },
      },
      select: { id: true, unblocked_at: true },
    });
  }

  async createPhoneBlock(userId: number, phoneNumberHash: string): Promise<{ id: number }> {
    return this.db.phoneBlock.create({
      data: {
        user_id: userId,
        phone_number_hash: phoneNumberHash,
      },
      select: { id: true },
    });
  }

  async reactivatePhoneBlock(blockId: number): Promise<{ id: number }> {
    return this.db.phoneBlock.update({
      where: { id: blockId },
      data: { unblocked_at: null },
      select: { id: true },
    });
  }
}
