import { prisma } from "@/server/db/prisma";

// 메시지 ID 배열을 읽음 처리 — 이미 읽은 것은 skipDuplicates로 무시
export async function markMessagesAsRead(userId: number, messageIds: number[]) : Promise<void> {
    if (messageIds.length === 0) return;
    await prisma.messageRead.createMany({
        data: messageIds.map((message_id) => ({ message_id, user_id: userId })),
        skipDuplicates: true,
    });
}

// upToMessageId 이하, 내가 보내지 않은 메시지를 전부 읽음 처리
// POST /api/chat-room/:id/read 에서 호출
export async function markMessagesAsReadUpTo(userId: number, roomId: number, upToMessageId: number): Promise<void> {
    const messages = await prisma.message.findMany({
        where: {
            chat_room_id: roomId,
            id: { lte: upToMessageId },
            sender_user_id: { not: userId },
            deleted_at: null,
        },
        select: { id: true },
    });

    if (messages.length === 0) return;

    await prisma.messageRead.createMany({
        data: messages.map((m) => ({ message_id: m.id, user_id: userId })),
        skipDuplicates: true,
    });
}

// 채팅방에서 내가 읽지 않은 메시지 개수 (채팅방 목록 뱃지용)
export async function getUnreadCount(userId: number, roomId: number): Promise<number> {
    return prisma.message.count({
        where: {
            chat_room_id: roomId,
            sender_user_id: { not: userId },
            deleted_at: null,
            messageReads: {
                none: { user_id: userId },
            },
        },
    });
}