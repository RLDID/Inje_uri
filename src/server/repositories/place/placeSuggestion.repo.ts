import { prisma } from "@/server/db/prisma";

export type CreateSuggestionInput = {
    chatRoomId: number;
    placeId: number;
    triggeredKeyword?: string;
};

export async function createSuggestion(input: CreateSuggestionInput) {
    return prisma.chatRoomPlaceSuggestion.create({
        data: {
            chat_room_id: input.chatRoomId,
            place_id: input.placeId,
            triggered_keyword: input.triggeredKeyword ?? null,
        },
        include: { place: { include: { category: true, tags: true } } },
    });
}

export async function findSuggestionsByRoomId(roomId: number) {
    return prisma.chatRoomPlaceSuggestion.findMany({
        where: { chat_room_id: roomId },
        include: { place: { include: { category: true, tags: true } } },
        orderBy: { suggested_at: "desc" },
    });
}

export async function findSuggestionById(id: number) {
    return prisma.chatRoomPlaceSuggestion.findUnique({
        where: { id },
        include: { place: { include: { category: true, tags: true } } },
    });
}

export async function updateSuggestionStatus(id: number, status: string) {
    return prisma.chatRoomPlaceSuggestion.update({
        where: { id },
        data: { status },
    });
}
