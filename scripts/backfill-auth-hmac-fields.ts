import { createHmac } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { decryptString, encryptString } from "../src/server/lib/encryption";
import "dotenv/config";

function getPersonalDataHashSecret(): string {
  const secret = process.env.AUTH_HASH_SECRET ?? process.env.AUTH_SECRET ?? process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("AUTH_HASH_SECRET or AUTH_SECRET is required to backfill personal-data HMAC hashes.");
  }

  return secret;
}

function hashPersonalData(value: string): string {
  return createHmac("sha256", getPersonalDataHashSecret()).update(value).digest("hex");
}

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { birth: { not: null } },
          { student_number: { not: null } },
        ],
      },
      select: {
        id: true,
        birth: true,
        student_number: true,
      },
    });

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const data: {
        birth?: string;
        birth_hash?: string;
        student_number?: string;
        student_number_hash?: string;
      } = {};

      if (user.birth) {
        const birth = decryptString(user.birth);
        data.birth = encryptString(birth);
        data.birth_hash = hashPersonalData(birth);
      }

      if (user.student_number) {
        const studentNumber = decryptString(user.student_number);
        data.student_number = encryptString(studentNumber);
        data.student_number_hash = hashPersonalData(studentNumber);
      }

      if (Object.keys(data).length === 0) {
        skippedCount += 1;
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data,
      });
      updatedCount += 1;
    }

    const preSignupRows = await prisma.preSignupVerification.findMany({
      select: {
        token_hash: true,
        student_number: true,
      },
    });

    let preSignupUpdatedCount = 0;
    for (const row of preSignupRows) {
      const studentNumber = decryptString(row.student_number);
      await prisma.preSignupVerification.update({
        where: { token_hash: row.token_hash },
        data: {
          student_number: encryptString(studentNumber),
          student_number_hash: hashPersonalData(studentNumber),
        },
      });
      preSignupUpdatedCount += 1;
    }

    console.log(
      `[auth:backfill-hmac] users updated=${updatedCount}, users skipped=${skippedCount}, preSignup updated=${preSignupUpdatedCount}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[auth:backfill-hmac] failed", error);
  process.exitCode = 1;
});
