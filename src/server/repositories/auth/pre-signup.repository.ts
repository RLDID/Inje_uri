import { prisma } from '@/server/db/prisma';

export async function prunePreSignupVerifications(studentNumber: string) {
  return prisma.preSignupVerification.deleteMany({
    where: {
      OR: [
        { student_number: studentNumber },
        { expires_at: { lte: new Date() } },
      ],
    },
  });
}

export async function createPreSignupVerification(input: {
  tokenHash: string;
  studentNumber: string;
  birthHash: string;
  expiresAt: Date;
}) {
  return prisma.preSignupVerification.create({
    data: {
      token_hash: input.tokenHash,
      student_number: input.studentNumber,
      birth_hash: input.birthHash,
      expires_at: input.expiresAt,
    },
  });
}

export async function findPreSignupVerificationByTokenHash(tokenHash: string) {
  return prisma.preSignupVerification.findUnique({
    where: { token_hash: tokenHash },
    select: {
      token_hash: true,
      student_number: true,
      birth_hash: true,
      expires_at: true,
    },
  });
}

export async function deletePreSignupVerificationByTokenHash(tokenHash: string) {
  return prisma.preSignupVerification.delete({
    where: { token_hash: tokenHash },
  }).catch(() => undefined);
}
