import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { ok, fail } from "@/server/lib/response";
import { getAuthUser } from "@/server/lib/auth";

/**
 * D-15: 내 피드 조회 API
 *
 * 로그인 사용자 본인의 활성(active) + 미만료 피드를 조회한다.
 * 1인 1활성피드 정책이므로 최대 1건 반환.
 *
 * @route GET /api/feeds/mine
 *
 * @requires 인증 - 로그인 사용자만
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     feed: { feedId, text, status, createdAt, updatedAt, expiresAt, boostScore, keywords, images, commentCount } | null
 *   }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds 테이블 (prisma/schema.prisma)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const currentUserId = user.id;

    const now = new Date();

    const feed = await prisma.selfDateFeed.findFirst({
      where: {
        author_user_id: currentUserId,
        status: "active",
        expires_at: { gt: now }, // 미만료 피드만
      },
      select: {
        id: true,
        text: true,
        status: true,
        created_at: true,
        updated_at: true,
        expires_at: true,
        boost_score: true,
        keywords: {
          select: {
            feed_keyword: {
              select: { feed_keyword_id: true, name: true },
            },
          },
        },
        images: {
          orderBy: { sort_order: "asc" },
          select: { id: true, image_url: true, sort_order: true },
        },
        _count: { select: { comments: true } }, // 댓글 수
      },
    });

    if (!feed) { // 활성 피드가 없는 경우
      return ok({ feed: null });
    }

    return ok({
      feed: {
        feedId: feed.id,
        text: feed.text,
        status: feed.status,
        createdAt: feed.created_at.toISOString(),
        updatedAt: feed.updated_at.toISOString(),
        expiresAt: feed.expires_at.toISOString(),
        boostScore: feed.boost_score,
        keywords: feed.keywords.map((k) => ({
          feedKeywordId: k.feed_keyword.feed_keyword_id,
          name: k.feed_keyword.name,
        })),
        images: feed.images.map((img) => ({
          imageId: img.id,
          imageUrl: img.image_url,
          sortOrder: img.sort_order,
        })),
        commentCount: feed._count.comments,
      },
    });
  } catch (error) {
    console.error("[GET /api/feeds/mine]", error);

    return fail("INTERNAL_SERVER_ERROR", "내 피드를 불러오는 중 오류가 발생했습니다.");
  }
}
