import { NextRequest } from "next/server";
import { ok, fail } from "@/server/lib/response";
import { AppError } from "@/server/lib/app-error";
import { getAuthUser } from "@/server/lib/auth";
import { selectChat } from "@/server/services/content/comment.service";

/**
 * D-08: 댓글 선택 → 채팅방 생성 API
 *
 * 피드 작성자가 특정 댓글을 선택하면 2시간짜리 채팅방을 생성한다.
 * 댓글 존재 + 미삭제, 피드 작성자 권한, 차단/banned 검증, 중복 방지를 거친 뒤
 * chat_rooms + chat_room_participants 를 트랜잭션으로 묶어 생성한다.
 *
 * @route POST /api/feed-comments/:id/select-chat
 *
 * @requires 인증 - 로그인 사용자만 (피드 작성자만 선택 가능)
 *
 * @param id - URL 경로의 댓글 ID
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { chatRoomId: number }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see chat_rooms, chat_room_participants, feed_comments, self_date_feeds, blocks 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-08 상세 스펙
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");

    const { id } = await params;
    const commentId = Number(id);
    if (Number.isNaN(commentId) || !Number.isInteger(commentId)) {
      return fail("INVALID_COMMENT_ID", "유효하지 않은 댓글 ID입니다.");
    }

    const data = await selectChat(user.id, commentId);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[POST /api/feed-comments/:id/select-chat]", error); // 서버 에러 로그
    return fail("INTERNAL_SERVER_ERROR", "댓글 선택 처리 중 오류가 발생했습니다."); // 실패 응답
  }
}
