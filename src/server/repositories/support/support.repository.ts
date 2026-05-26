import type { support_inquiry_status, user_status } from "@/generated/prisma/client";
import type { PrismaDbClient } from "@/server/db/prisma";

type SupportRepositoryDb = Pick<PrismaDbClient, "supportInquiry">;

export type SupportInquiryRow = {
  id: number;
  user_id: number | null;
  category: string;
  screen: string;
  title: string;
  content: string;
  email: string | null;
  status: support_inquiry_status;
  created_at: Date;
  updated_at: Date;
};

export type SupportInquiryWithUserRow = SupportInquiryRow & {
  user: {
    id: number;
    nickname: string;
    status: user_status;
    deleted_at: Date | null;
  } | null;
};

const inquirySelect = {
  id: true,
  user_id: true,
  category: true,
  screen: true,
  title: true,
  content: true,
  email: true,
  status: true,
  created_at: true,
  updated_at: true,
} as const;

const inquiryWithUserSelect = {
  ...inquirySelect,
  user: {
    select: {
      id: true,
      nickname: true,
      status: true,
      deleted_at: true,
    },
  },
} as const;

export class SupportRepository {
  constructor(private readonly db: SupportRepositoryDb) {}

  async create(data: {
    userId: number;
    category: string;
    screen: string;
    title: string;
    content: string;
    email: string | null;
  }): Promise<SupportInquiryRow> {
    return this.db.supportInquiry.create({
      data: {
        user_id: data.userId,
        category: data.category,
        screen: data.screen,
        title: data.title,
        content: data.content,
        email: data.email,
        status: "received",
      },
      select: inquirySelect,
    });
  }

  async findManyByUserId(userId: number): Promise<SupportInquiryRow[]> {
    return this.db.supportInquiry.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      select: inquirySelect,
    });
  }

  async findByIdAndUserId(id: number, userId: number): Promise<SupportInquiryRow | null> {
    return this.db.supportInquiry.findFirst({
      where: { id, user_id: userId },
      select: inquirySelect,
    });
  }

  async updateByIdAndUserId(
    id: number,
    userId: number,
    data: {
      category?: string;
      screen?: string;
      title?: string;
      content?: string;
      email?: string | null;
    },
  ): Promise<SupportInquiryRow> {
    return this.db.supportInquiry.update({
      where: { id, user_id: userId },
      data,
      select: inquirySelect,
    });
  }

  async findManyForAdmin(params: {
    status?: support_inquiry_status;
    page: number;
    limit: number;
  }): Promise<{ rows: SupportInquiryWithUserRow[]; total: number }> {
    const where = params.status ? { status: params.status } : {};
    const skip = (params.page - 1) * params.limit;

    const [rows, total] = await Promise.all([
      this.db.supportInquiry.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: params.limit,
        select: inquiryWithUserSelect,
      }),
      this.db.supportInquiry.count({ where }),
    ]);

    return { rows, total };
  }

  async findByIdForAdmin(id: number): Promise<SupportInquiryWithUserRow | null> {
    return this.db.supportInquiry.findUnique({
      where: { id },
      select: inquiryWithUserSelect,
    });
  }

  async updateStatus(id: number, status: support_inquiry_status): Promise<SupportInquiryRow> {
    return this.db.supportInquiry.update({
      where: { id },
      data: { status },
      select: inquirySelect,
    });
  }
}
