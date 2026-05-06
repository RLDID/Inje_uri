export interface FeedCursor {
  boostScore: number;
  id: number;
}

export function encodeFeedCursor(cursor: FeedCursor): string {
  const raw = `${cursor.boostScore}:${cursor.id}`;
  return Buffer.from(raw, "utf-8").toString("base64url");
}

export function decodeFeedCursor(token: string): FeedCursor | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const [boostScoreStr, idStr] = raw.split(":");
    if (!boostScoreStr || !idStr) return null;

    const boostScore = Number(boostScoreStr);
    const id = Number(idStr);
    if (!Number.isFinite(boostScore) || !Number.isInteger(id)) return null;

    return { boostScore, id };
  } catch {
    return null;
  }
}
