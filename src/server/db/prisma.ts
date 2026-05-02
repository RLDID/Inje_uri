import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 싱글톤 인스턴스
 *
 * 개발 환경에서 hot reload 시 PrismaClient가 중복 생성되는 것을 방지하기 위해
 * globalThis에 인스턴스를 캐싱한다.
 *
 * Prisma 7부터 PrismaClient 생성 시 드라이버 어댑터(adapter)가 필수이며,
 * PostgreSQL 연결을 위해 @prisma/adapter-pg(PrismaPg)를 사용한다.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
export { prisma };
