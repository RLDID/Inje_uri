import { ERROR } from "@/server/lib/errors";
import * as placeRepo from "@/server/repositories/place/place.repo";
import * as placeSuggestionRepo from "@/server/repositories/place/placeSuggestion.repo";
import * as chatRoomRepo from "@/server/repositories/chat/chatRoom.repo";

export async function getPlaces(filter?: { categoryCode?: string; tag?: string }) { //'도서관'
    return placeRepo.findPlaces(filter);
}

export async function createPlaceSuggestion( //'인제우리'
    roomId: number,
    userId: number,
    placeId: number,
    triggeredKeyword?: string
) {
    const room = await chatRoomRepo.findRoomById(roomId);
    if (!room) return { error: ERROR.NOT_FOUND } as const;

    const isParticipant = room.participants.some((p) => p.user_id === userId);
    if (!isParticipant) return { error: ERROR.FORBIDDEN } as const;
    if (room.status !== "active") return { error: ERROR.ROOM_NOT_ACTIVE } as const;

    const place = await placeRepo.findPlaceById(placeId);
    if (!place) return { error: ERROR.NOT_FOUND } as const;

    const suggestion = await placeSuggestionRepo.createSuggestion({
        chatRoomId: roomId,
        placeId,
        triggeredKeyword,
    });

    return { suggestion };
}

export async function updateSuggestionStatus(
    roomId: number,
    suggestionId: number,
    userId: number,
    status: "accepted" | "dismissed"
) {
    const room = await chatRoomRepo.findRoomById(roomId);
    if (!room) return { error: ERROR.NOT_FOUND } as const;

    const isParticipant = room.participants.some((p) => p.user_id === userId);
    if (!isParticipant) return { error: ERROR.FORBIDDEN } as const;

    const suggestion = await placeSuggestionRepo.findSuggestionById(suggestionId);
    if (!suggestion || suggestion.chat_room_id !== roomId)
        return { error: ERROR.NOT_FOUND } as const;

    if (suggestion.status !== "pending")
        return { error: ERROR.ALREADY_PROCESSED } as const;

    const updated = await placeSuggestionRepo.updateSuggestionStatus(suggestionId, status);
    return { suggestion: updated };
}

export async function getSuggestionsStatus(roomId: number, userId: number) {                                         
    const room = await chatRoomRepo.findRoomById(roomId);                                                        
    if (!room) return { error: ERROR.NOT_FOUND } as const;                                                     

    const isParticipant = room.participants.some((p) => p.user_id === userId);
    if (!isParticipant) return { error: ERROR.FORBIDDEN } as const;

    const suggestions = await placeSuggestionRepo.findSuggestionsByRoomId(roomId);
    return { suggestions };
}