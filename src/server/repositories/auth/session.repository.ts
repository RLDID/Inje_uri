import type { AuthSession, User } from '@/generated/prisma/client';
import { prisma } from '@/server/db/prisma';

type SessionWithUser = AuthSession & { user: User };

export async function createAuthSession(input: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
}) {
  return prisma.authSession.create({
    data: {
      user_id: input.userId,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt,
      last_seen_at: input.lastSeenAt,
    },
  });
}

export async function findSessionByTokenHashWithUser(tokenHash: string): Promise<SessionWithUser | null> {
  return prisma.authSession.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  });
}

export async function touchAuthSession(sessionId: number, lastSeenAt: Date) {
  return prisma.authSession.update({
    where: { id: sessionId },
    data: { last_seen_at: lastSeenAt },
  });
}

export async function deleteAuthSessionById(sessionId: number) {
  return prisma.authSession.delete({
    where: { id: sessionId },
  });
}
