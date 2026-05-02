import { prisma } from '@/server/db/prisma';

export async function expirePendingEmailVerifications(userId: number, schoolEmail: string) {
  return prisma.emailVerification.updateMany({
    where: {
      user_id: userId,
      school_email: schoolEmail,
      status: 'pending',
    },
    data: {
      status: 'expired',
    },
  });
}

export async function createEmailVerification(input: {
  userId: number;
  schoolEmail: string;
  codeHash: string;
  expiresAt: Date;
}) {
  return prisma.emailVerification.create({
    data: {
      user_id: input.userId,
      school_email: input.schoolEmail,
      code_hash: input.codeHash,
      expires_at: input.expiresAt,
      status: 'pending',
    },
  });
}

export async function findLatestPendingEmailVerification(userId: number, schoolEmail: string) {
  return prisma.emailVerification.findFirst({
    where: {
      user_id: userId,
      school_email: schoolEmail,
      status: 'pending',
    },
    orderBy: { id: 'desc' },
  });
}

export async function markEmailVerificationExpired(id: number) {
  return prisma.emailVerification.update({
    where: { id },
    data: { status: 'expired' },
  });
}

export async function markEmailVerificationVerified(id: number, verifiedAt: Date) {
  return prisma.emailVerification.update({
    where: { id },
    data: {
      status: 'verified',
      verified_at: verifiedAt,
    },
  });
}

export async function expireOtherPendingEmailVerifications(userId: number, schoolEmail: string, exceptId: number) {
  return prisma.emailVerification.updateMany({
    where: {
      user_id: userId,
      school_email: schoolEmail,
      status: 'pending',
      id: { not: exceptId },
    },
    data: { status: 'expired' },
  });
}
