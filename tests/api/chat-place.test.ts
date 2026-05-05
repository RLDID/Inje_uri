import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonRequest, readJson, routeContext } from '../helpers/api';

const authMocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
}));

const chatRoomMocks = vi.hoisted(() => ({
  blockChatRoom: vi.fn(),
  createChatRoom: vi.fn(),
  getChatRoom: vi.fn(),
  getChatRooms: vi.fn(),
  leaveChatRoom: vi.fn(),
}));

const messageMocks = vi.hoisted(() => ({
  getMessages: vi.fn(),
  markAsRead: vi.fn(),
  sendMessage: vi.fn(),
}));

const placeMocks = vi.hoisted(() => ({
  createPlaceSuggestion: vi.fn(),
  getPlaces: vi.fn(),
  getSuggestionsStatus: vi.fn(),
  updateSuggestionStatus: vi.fn(),
}));

vi.mock('@/server/lib/auth', () => authMocks);
vi.mock('@/generated/prisma/client', () => ({
  chat_room_source_type: {
    comment: 'comment',
    interest: 'interest',
  },
}));
vi.mock('@/server/services/conversation/chatRoom.service', () => chatRoomMocks);
vi.mock('@/server/services/conversation/message.service', () => messageMocks);
vi.mock('@/server/services/place/place.service', () => placeMocks);

import { GET as getChatRooms, POST as postChatRoom } from '@/app/api/chat-room/route';
import { PATCH as blockChatRoom } from '@/app/api/chat-room/[id]/block/route';
import { PATCH as leaveChatRoom } from '@/app/api/chat-room/[id]/leave/route';
import { GET as getMessages, POST as postMessage } from '@/app/api/chat-room/[id]/messages/route';
import { GET as getPlaceSuggestions, POST as postPlaceSuggestion } from '@/app/api/chat-room/[id]/place-suggestions/route';
import { PATCH as patchPlaceSuggestion } from '@/app/api/chat-room/[id]/place-suggestions/[suggestionId]/route';
import { POST as markMessagesRead } from '@/app/api/chat-room/[id]/read/route';
import { GET as getChatRoom } from '@/app/api/chat-room/[id]/route';
import { GET as getPlaces } from '@/app/api/places/route';

describe('chat room, message, and place APIs', () => {
  const authUser = { id: 7, status: 'active', deleted_at: null };

  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getAuthUser.mockResolvedValue(authUser);
  });

  it('validates chat room creation source fields', async () => {
    const response = await postChatRoom(jsonRequest('/api/chat-room', {
      method: 'POST',
      body: { targetUserId: 20 },
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('INVALID_SOURCE');
    expect(chatRoomMocks.createChatRoom).not.toHaveBeenCalled();
  });

  it('creates a chat room and lists rooms by tab', async () => {
    chatRoomMocks.createChatRoom.mockResolvedValue({ chatRoomId: 3 });
    chatRoomMocks.getChatRooms.mockResolvedValue([{ chatRoomId: 3 }]);

    const postResponse = await postChatRoom(jsonRequest('/api/chat-room', {
      method: 'POST',
      body: {
        targetUserId: '20',
        sourceType: 'interest',
        sourceInterestId: '5',
      },
    }));
    const getResponse = await getChatRooms(jsonRequest('/api/chat-room?tab=unread'));

    expect(postResponse.status).toBe(201);
    expect(await readJson(postResponse)).toEqual({ success: true, data: { chatRoomId: 3 } });
    expect(await readJson(getResponse)).toEqual({ success: true, data: { rooms: [{ chatRoomId: 3 }] } });
    expect(chatRoomMocks.createChatRoom).toHaveBeenCalledWith({
      requestUserId: authUser.id,
      targetUserId: 20,
      sourceType: 'interest',
      sourceInterestId: 5,
      sourceCommentId: undefined,
    });
    expect(chatRoomMocks.getChatRooms).toHaveBeenCalledWith(authUser.id, 'unread');
  });

  it('validates chat room ids before room detail lookup', async () => {
    const response = await getChatRoom(jsonRequest('/api/chat-room/nope'), routeContext({ id: 'nope' }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('NOT_FOUND');
    expect(chatRoomMocks.getChatRoom).not.toHaveBeenCalled();
  });

  it('reads room detail, leaves a room, and blocks a room', async () => {
    chatRoomMocks.getChatRoom.mockResolvedValue({ chatRoomId: 3 });
    chatRoomMocks.leaveChatRoom.mockResolvedValue({ left: true });
    chatRoomMocks.blockChatRoom.mockResolvedValue({ blocked: true });

    const detailResponse = await getChatRoom(jsonRequest('/api/chat-room/3'), routeContext({ id: '3' }));
    const leaveResponse = await leaveChatRoom(
      jsonRequest('/api/chat-room/3/leave', { method: 'PATCH' }),
      routeContext({ id: '3' }),
    );
    const blockResponse = await blockChatRoom(
      jsonRequest('/api/chat-room/3/block', { method: 'PATCH' }),
      routeContext({ id: '3' }),
    );

    expect(await readJson(detailResponse)).toEqual({ success: true, data: { chatRoomId: 3 } });
    expect(await readJson(leaveResponse)).toEqual({ success: true, data: { left: true } });
    expect(await readJson(blockResponse)).toEqual({ success: true, data: { blocked: true } });
    expect(chatRoomMocks.getChatRoom).toHaveBeenCalledWith(3, authUser.id);
    expect(chatRoomMocks.leaveChatRoom).toHaveBeenCalledWith(3, authUser.id);
    expect(chatRoomMocks.blockChatRoom).toHaveBeenCalledWith(3, authUser.id);
  });

  it('reads messages with pagination defaults and sends trimmed messages', async () => {
    messageMocks.getMessages.mockResolvedValue({ items: [], nextCursor: null });
    messageMocks.sendMessage.mockResolvedValue({ messageId: 10, content: 'hello' });

    const getResponse = await getMessages(
      jsonRequest('/api/chat-room/3/messages'),
      routeContext({ id: '3' }),
    );
    const postResponse = await postMessage(
      jsonRequest('/api/chat-room/3/messages', {
        method: 'POST',
        body: { content: ' hello ' },
      }),
      routeContext({ id: '3' }),
    );

    expect(await readJson(getResponse)).toEqual({ success: true, data: { items: [], nextCursor: null } });
    expect(postResponse.status).toBe(201);
    expect(await readJson(postResponse)).toEqual({
      success: true,
      data: { messageId: 10, content: 'hello' },
    });
    expect(messageMocks.getMessages).toHaveBeenCalledWith(3, authUser.id, undefined, 30);
    expect(messageMocks.sendMessage).toHaveBeenCalledWith(3, authUser.id, 'hello');
  });

  it('validates empty message content and read cursor ids', async () => {
    const messageResponse = await postMessage(
      jsonRequest('/api/chat-room/3/messages', { method: 'POST', body: { content: ' ' } }),
      routeContext({ id: '3' }),
    );
    const readResponse = await markMessagesRead(
      jsonRequest('/api/chat-room/3/read', { method: 'POST', body: { lastReadMessageId: 'bad' } }),
      routeContext({ id: '3' }),
    );

    expect((await readJson(messageResponse)).error?.code).toBe('INVALID_CONTENT');
    expect((await readJson(readResponse)).error?.code).toBe('INVALID_CURSOR');
    expect(messageMocks.sendMessage).not.toHaveBeenCalled();
    expect(messageMocks.markAsRead).not.toHaveBeenCalled();
  });

  it('marks chat messages as read', async () => {
    messageMocks.markAsRead.mockResolvedValue({ read: true });

    const response = await markMessagesRead(
      jsonRequest('/api/chat-room/3/read', { method: 'POST', body: { lastReadMessageId: 100 } }),
      routeContext({ id: '3' }),
    );
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: { read: true } });
    expect(messageMocks.markAsRead).toHaveBeenCalledWith(3, authUser.id, 100);
  });

  it('requires auth before listing places', async () => {
    authMocks.getAuthUser.mockResolvedValue(null);

    const response = await getPlaces(jsonRequest('/api/places?category=cafe'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('UNAUTHORIZED');
    expect(placeMocks.getPlaces).not.toHaveBeenCalled();
  });

  it('lists places using category and tag filters', async () => {
    placeMocks.getPlaces.mockResolvedValue([{ placeId: 1, name: 'Cafe' }]);

    const response = await getPlaces(jsonRequest('/api/places?category=cafe&tag=quiet'));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: { places: [{ placeId: 1, name: 'Cafe' }] } });
    expect(placeMocks.getPlaces).toHaveBeenCalledWith({ categoryCode: 'cafe', tag: 'quiet' });
  });

  it('validates place suggestion creation and status values', async () => {
    const postResponse = await postPlaceSuggestion(
      jsonRequest('/api/chat-room/3/place-suggestions', { method: 'POST', body: { placeId: 'bad' } }),
      routeContext({ id: '3' }),
    );
    const patchResponse = await patchPlaceSuggestion(
      jsonRequest('/api/chat-room/3/place-suggestions/4', { method: 'PATCH', body: { status: 'pending' } }),
      routeContext({ id: '3', suggestionId: '4' }),
    );

    expect((await readJson(postResponse)).error?.code).toBe('VALIDATION_ERROR');
    expect((await readJson(patchResponse)).error?.code).toBe('VALIDATION_ERROR');
    expect(placeMocks.createPlaceSuggestion).not.toHaveBeenCalled();
    expect(placeMocks.updateSuggestionStatus).not.toHaveBeenCalled();
  });

  it('creates, lists, and updates place suggestions', async () => {
    placeMocks.createPlaceSuggestion.mockResolvedValue({ suggestionId: 4 });
    placeMocks.getSuggestionsStatus.mockResolvedValue({ suggestions: [{ suggestionId: 4 }] });
    placeMocks.updateSuggestionStatus.mockResolvedValue({ accepted: true });

    const postResponse = await postPlaceSuggestion(
      jsonRequest('/api/chat-room/3/place-suggestions', {
        method: 'POST',
        body: { placeId: 9, triggeredKeyword: 'coffee' },
      }),
      routeContext({ id: '3' }),
    );
    const getResponse = await getPlaceSuggestions(
      jsonRequest('/api/chat-room/3/place-suggestions'),
      routeContext({ id: '3' }),
    );
    const patchResponse = await patchPlaceSuggestion(
      jsonRequest('/api/chat-room/3/place-suggestions/4', {
        method: 'PATCH',
        body: { status: 'accepted' },
      }),
      routeContext({ id: '3', suggestionId: '4' }),
    );

    expect(postResponse.status).toBe(201);
    expect(await readJson(postResponse)).toEqual({ success: true, data: { suggestionId: 4 } });
    expect(await readJson(getResponse)).toEqual({
      success: true,
      data: { suggestions: [{ suggestionId: 4 }] },
    });
    expect(await readJson(patchResponse)).toEqual({ success: true, data: { accepted: true } });
    expect(placeMocks.createPlaceSuggestion).toHaveBeenCalledWith(3, authUser.id, 9, 'coffee');
    expect(placeMocks.getSuggestionsStatus).toHaveBeenCalledWith(3, authUser.id);
    expect(placeMocks.updateSuggestionStatus).toHaveBeenCalledWith(3, 4, authUser.id, 'accepted');
  });
});
