export interface CreateReportResultDto {
  reportId: number;
}

export interface BlockUserResultDto {
  blockId: number;
}

export interface BlockListItemDto {
  blockId: number;
  blockedUser: {
    userId: number;
    nickname: string;
    profileImage: string | null;
  };
  reason: string | null;
  createdAt: string;
}

export interface BlockListDto {
  items: BlockListItemDto[];
}

export interface UnblockResultDto {
  unblocked: true;
}

export interface PhoneBlockResultDto {
  phoneBlockId: number;
}
