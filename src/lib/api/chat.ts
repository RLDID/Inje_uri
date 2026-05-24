import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { mapChatListItem, mapChatMessage, type ChatMessageDto } from '@/lib/api/mappers';
import type {
  Chat,
  ChatPlaceSuggestion,
  ChatRoomListItemDto,
  Message,
  PlaceSuggestionStatus,
  User,
} from '@/lib/types';

type PlaceSuggestionDto = {
  id: number;
  chat_room_id: number;
  place_id: number;
  triggered_keyword: string | null;
  status: string;
  suggested_at: string;
  place: {
    id: number;
    name: string;
    address: string;
    image_url: string | null;
    description: string | null;
    category: {
      id: number;
      code: string;
      name: string;
    };
    tags: Array<{
      id: number;
      tag: string;
    }>;
  };
};

function normalizePlaceImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;

  const cleaned = imageUrl.replace(/\\/g, '/');

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('/')) {
    return cleaned;
  }

  if (cleaned.startsWith('public/')) {
    return `/${cleaned.slice('public/'.length)}`;
  }

  if (cleaned.startsWith('place/')) {
    return `/${cleaned}`;
  }

  return `/place/${cleaned}`;
}

function normalizePlaceSuggestionStatus(status: string): PlaceSuggestionStatus {
  return status === 'accepted' || status === 'dismissed' ? status : 'pending';
}

function mapPlaceSuggestion(dto: PlaceSuggestionDto): ChatPlaceSuggestion {
  return {
    id: String(dto.id),
    roomId: String(dto.chat_room_id),
    placeId: String(dto.place_id),
    triggeredKeyword: dto.triggered_keyword,
    status: normalizePlaceSuggestionStatus(dto.status),
    suggestedAt: new Date(dto.suggested_at),
    place: {
      id: String(dto.place.id),
      name: dto.place.name,
      address: dto.place.address,
      imageUrl: normalizePlaceImageUrl(dto.place.image_url),
      description: dto.place.description,
      category: {
        id: String(dto.place.category.id),
        code: dto.place.category.code,
        name: dto.place.category.name,
      },
      tags: dto.place.tags.map((tag) => ({
        id: String(tag.id),
        tag: tag.tag,
      })),
    },
  };
}

export async function getChatRooms(currentUser: User | null, tab: 'all' | 'unread' = 'all'): Promise<Chat[]> {
  const query = tab === 'unread' ? '?tab=unread' : '';
  const data = await apiGet<{ rooms: ChatRoomListItemDto[] }>(`/api/chat-room${query}`);
  return data.rooms.map((room) => mapChatListItem(room, currentUser));
}

export async function getChatRoom(roomId: string | number, currentUser: User | null): Promise<Chat> {
  const data = await apiGet<{ room: ChatRoomListItemDto }>(`/api/chat-room/${roomId}`);
  return mapChatListItem(data.room, currentUser);
}

export async function getChatMessages(roomId: string | number, cursor?: string | number, limit = 30): Promise<Message[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', String(cursor));
  const data = await apiGet<{ messages: ChatMessageDto[] }>(`/api/chat-room/${roomId}/messages?${params.toString()}`);
  return [...data.messages].reverse().map((message) => mapChatMessage(message, String(roomId)));
}

export async function sendChatMessage(roomId: string | number, content: string): Promise<Message> {
  const data = await apiPost<{ message: ChatMessageDto }>(`/api/chat-room/${roomId}/messages`, { content });
  return mapChatMessage(data.message, String(roomId));
}

export async function getChatRoomPlaceSuggestions(roomId: string | number): Promise<ChatPlaceSuggestion[]> {
  const data = await apiGet<{ suggestions: PlaceSuggestionDto[] }>(`/api/chat-room/${roomId}/place-suggestions`);
  return data.suggestions.map(mapPlaceSuggestion);
}

export async function updateChatRoomPlaceSuggestionStatus(
  roomId: string | number,
  suggestionId: string | number,
  status: PlaceSuggestionStatus,
): Promise<ChatPlaceSuggestion> {
  const data = await apiPatch<{ suggestion: PlaceSuggestionDto }>(
    `/api/chat-room/${roomId}/place-suggestions/${suggestionId}`,
    { status },
  );
  return mapPlaceSuggestion(data.suggestion);
}

export async function markChatRoomRead(roomId: string | number, lastReadMessageId: string | number) {
  return apiPost(`/api/chat-room/${roomId}/read`, { lastReadMessageId: Number(lastReadMessageId) });
}

export async function leaveChatRoom(roomId: string | number) {
  return apiPatch(`/api/chat-room/${roomId}/leave`);
}

export async function blockChatRoom(roomId: string | number) {
  return apiPatch(`/api/chat-room/${roomId}/block`);
}
