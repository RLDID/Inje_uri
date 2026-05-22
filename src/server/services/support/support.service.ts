import type { support_inquiry_status } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/lib/app-error";
import { SupportRepository } from "@/server/repositories/support/support.repository";
import type { SupportInquiryRow, SupportInquiryWithUserRow } from "@/server/repositories/support/support.repository";

const repo = new SupportRepository(prisma);

export type SupportInquiryDto = {
  id: number;
  userId: number | null;
  category: string;
  screen: string;
  title: string;
  content: string;
  email: string | null;
  status: support_inquiry_status;
  createdAt: string;
  updatedAt: string;
};

export type SupportInquiryWithUserDto = SupportInquiryDto & {
  user: { id: number; nickname: string } | null;
};

export type PaginatedSupportInquiriesDto = {
  items: SupportInquiryWithUserDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function toDto(row: SupportInquiryRow): SupportInquiryDto {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    screen: row.screen,
    title: row.title,
    content: row.content,
    email: row.email,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toDtoWithUser(row: SupportInquiryWithUserRow): SupportInquiryWithUserDto {
  return {
    ...toDto(row),
    user: row.user ?? null,
  };
}

export async function createSupportInquiry(
  userId: number,
  params: {
    category: string;
    screen: string;
    title: string;
    content: string;
    email?: string;
  },
): Promise<SupportInquiryDto> {
  const title = params.title.trim();
  if (!title) throw new AppError("VALIDATION_ERROR", "제목을 입력해 주세요.");
  if (title.length > 60) throw new AppError("VALIDATION_ERROR", "제목은 60자 이내여야 합니다.");

  const content = params.content.trim();
  if (!content) throw new AppError("VALIDATION_ERROR", "내용을 입력해 주세요.");
  if (content.length > 700) throw new AppError("VALIDATION_ERROR", "내용은 700자 이내여야 합니다.");

  const email = params.email !== undefined ? params.email.trim() : null;
  if (email !== null && email.length > 80) throw new AppError("VALIDATION_ERROR", "이메일은 80자 이내여야 합니다.");

  const row = await repo.create({
    userId,
    category: params.category,
    screen: params.screen,
    title,
    content,
    email: email || null,
  });

  return toDto(row);
}

export async function listSupportInquiriesForUser(userId: number): Promise<SupportInquiryDto[]> {
  const rows = await repo.findManyByUserId(userId);
  return rows.map(toDto);
}

export async function getSupportInquiryForUser(id: number, userId: number): Promise<SupportInquiryDto> {
  const row = await repo.findByIdAndUserId(id, userId);
  if (!row) throw new AppError("NOT_FOUND", "문의를 찾을 수 없습니다.", 404);
  return toDto(row);
}

export async function updateSupportInquiryForUser(
  id: number,
  userId: number,
  params: {
    category?: string;
    screen?: string;
    title?: string;
    content?: string;
    email?: string | null;
  },
): Promise<SupportInquiryDto> {
  const existing = await repo.findByIdAndUserId(id, userId);
  if (!existing) throw new AppError("NOT_FOUND", "문의를 찾을 수 없습니다.", 404);
  if (existing.status !== "received") {
    throw new AppError("VALIDATION_ERROR", "접수 상태의 문의만 수정할 수 있습니다.");
  }

  const updateData: {
    category?: string;
    screen?: string;
    title?: string;
    content?: string;
    email?: string | null;
  } = {};

  if (params.title !== undefined) {
    const title = params.title.trim();
    if (!title) throw new AppError("VALIDATION_ERROR", "제목을 입력해 주세요.");
    if (title.length > 60) throw new AppError("VALIDATION_ERROR", "제목은 60자 이내여야 합니다.");
    updateData.title = title;
  }

  if (params.content !== undefined) {
    const content = params.content.trim();
    if (!content) throw new AppError("VALIDATION_ERROR", "내용을 입력해 주세요.");
    if (content.length > 700) throw new AppError("VALIDATION_ERROR", "내용은 700자 이내여야 합니다.");
    updateData.content = content;
  }

  if (params.email !== undefined) {
    const email = params.email !== null ? params.email.trim() : null;
    if (email !== null && email.length > 80) throw new AppError("VALIDATION_ERROR", "이메일은 80자 이내여야 합니다.");
    updateData.email = email || null;
  }

  if (params.category !== undefined) updateData.category = params.category;
  if (params.screen !== undefined) updateData.screen = params.screen;

  const row = await repo.updateByIdAndUserId(id, userId, updateData);
  return toDto(row);
}

const VALID_ADMIN_STATUSES: support_inquiry_status[] = ["received", "in_review", "answered"];

export function parseInquiryStatusFilter(raw: string | null): support_inquiry_status | undefined {
  if (!raw) return undefined;
  const found = VALID_ADMIN_STATUSES.find((s) => s === raw);
  if (found !== undefined) return found;
  throw new AppError("VALIDATION_ERROR", `status는 ${VALID_ADMIN_STATUSES.join(", ")} 중 하나여야 합니다.`);
}

export async function listAdminSupportInquiries(params: {
  status?: support_inquiry_status;
  page: number;
  limit: number;
}): Promise<PaginatedSupportInquiriesDto> {
  const { rows, total } = await repo.findManyForAdmin(params);
  const totalPages = Math.ceil(total / params.limit);

  return {
    items: rows.map(toDtoWithUser),
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
  };
}

export async function getAdminSupportInquiry(id: number): Promise<SupportInquiryWithUserDto> {
  const row = await repo.findByIdForAdmin(id);
  if (!row) throw new AppError("NOT_FOUND", "문의를 찾을 수 없습니다.", 404);
  return toDtoWithUser(row);
}

const VALID_ADMIN_UPDATE_STATUSES = ["in_review", "answered"] as const;
type AdminUpdateStatus = (typeof VALID_ADMIN_UPDATE_STATUSES)[number];

function isAdminUpdateStatus(s: string): s is AdminUpdateStatus {
  return (VALID_ADMIN_UPDATE_STATUSES as readonly string[]).includes(s);
}

export async function updateAdminSupportInquiryStatus(
  id: number,
  rawStatus: string,
): Promise<SupportInquiryDto> {
  if (!isAdminUpdateStatus(rawStatus)) {
    throw new AppError("VALIDATION_ERROR", "상태는 in_review 또는 answered만 설정할 수 있습니다.");
  }

  const existing = await repo.findByIdForAdmin(id);
  if (!existing) throw new AppError("NOT_FOUND", "문의를 찾을 수 없습니다.", 404);

  const row = await repo.updateStatus(id, rawStatus);
  return toDto(row);
}
