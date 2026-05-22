import type { PrismaDbClient } from '@/server/db/prisma';
import type { report_status } from '@/generated/prisma/enums';

export type AdminReportRow = Awaited<ReturnType<AdminReportRepository['findReports']>>[number];

export class AdminReportRepository {
  constructor(private readonly db: Pick<PrismaDbClient, 'report' | 'user'>) {}

  async findReports(status?: report_status) {
    return this.db.report.findMany({
      where: status ? { status } : undefined,
      orderBy: [
        { status: 'asc' },
        { created_at: 'desc' },
      ],
      take: 100,
      include: {
        reporter_user: {
          select: {
            id: true,
            login_id: true,
            nickname: true,
            university: true,
            department: true,
            status: true,
          },
        },
      },
    });
  }

  async countReportsByStatus() {
    const grouped = await this.db.report.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return grouped.reduce<Record<report_status, number>>(
      (acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      },
      {
        pending: 0,
        reviewed: 0,
        actioned: 0,
        dismissed: 0,
      },
    );
  }

  async updateReportStatus(reportId: number, status: report_status) {
    return this.db.report.update({
      where: { id: reportId },
      data: {
        status,
        reviewed_at: status === 'pending' ? null : new Date(),
      },
      include: {
        reporter_user: {
          select: {
            id: true,
            login_id: true,
            nickname: true,
            university: true,
            department: true,
            status: true,
          },
        },
      },
    });
  }
}
