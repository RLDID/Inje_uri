import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonRequest, readJson, routeContext } from '../helpers/api';

const authMocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
}));

const feedMocks = vi.hoisted(() => ({
  createFeed: vi.fn(),
  deleteFeed: vi.fn(),
  getFeedDetail: vi.fn(),
  listFeeds: vi.fn(),
  listKeywords: vi.fn(),
  recordFeedView: vi.fn(),
  updateFeed: vi.fn(),
}));

const commentMocks = vi.hoisted(() => ({
  createComment: vi.fn(),
  listComments: vi.fn(),
  listMyCommentedFeeds: vi.fn(),
  selectChat: vi.fn(),
}));

const safetyMocks = vi.hoisted(() => ({
  blockPhone: vi.fn(),
  blockUser: vi.fn(),
  createReport: vi.fn(),
  listBlocks: vi.fn(),
  unblockUser: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  selfDateFeed: {
    findFirst: vi.fn(),
  },
}));

vi.mock('@/server/lib/auth', () => authMocks);
vi.mock('@/server/services/content/feed.service', () => feedMocks);
vi.mock('@/server/services/content/comment.service', () => commentMocks);
vi.mock('@/server/services/content/safety.service', () => safetyMocks);
vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }));

import { GET as getBlocks, POST as postBlock, DELETE as deleteBlock } from '@/app/api/blocks/route';
import { POST as postPhoneBlock } from '@/app/api/blocks/phone/route';
import { GET as getCommentedFeeds } from '@/app/api/feeds/commented-by-me/route';
import { POST as selectCommentChat } from '@/app/api/feeds/comments/[id]/select-chat/route';
import { GET as getFeedKeywords } from '@/app/api/feeds/keywords/route';
import { GET as getMyFeed } from '@/app/api/feeds/mine/route';
import { GET as getFeedDetail, PATCH as patchFeed, DELETE as deleteFeed } from '@/app/api/feeds/[id]/route';
import { GET as getFeedComments, POST as postFeedComment } from '@/app/api/feeds/[id]/comments/route';
import { POST as postFeedView } from '@/app/api/feeds/[id]/view/route';
import { GET as getFeeds, POST as postFeed } from '@/app/api/feeds/route';
import { POST as postReport } from '@/app/api/reports/route';

describe('feed, comment, block, and report APIs', () => {
  const authUser = { id: 7, status: 'active', deleted_at: null };

  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getAuthUser.mockResolvedValue(authUser);
  });

  it('validates feed list cursors before calling the feed service', async () => {
    const response = await getFeeds(jsonRequest('/api/feeds?cursor=bad'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('INVALID_CURSOR');
    expect(feedMocks.listFeeds).not.toHaveBeenCalled();
  });

  it('lists feeds with keyword and cursor filters', async () => {
    const result = { items: [{ feedId: 10 }], nextCursor: null };
    feedMocks.listFeeds.mockResolvedValue(result);

    const response = await getFeeds(jsonRequest('/api/feeds?keyword=coffee&cursor=20'));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: result });
    expect(feedMocks.listFeeds).toHaveBeenCalledWith(authUser.id, 'coffee', 20);
  });

  it('validates feed creation body fields', async () => {
    const response = await postFeed(jsonRequest('/api/feeds', {
      method: 'POST',
      body: { text: '', feedKeywordIds: [1] },
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('INVALID_TEXT');
    expect(feedMocks.createFeed).not.toHaveBeenCalled();
  });

  it('creates a feed with keyword ids', async () => {
    feedMocks.createFeed.mockResolvedValue({ feedId: 99, expiresAt: '2026-01-02T00:00:00.000Z' });

    const response = await postFeed(jsonRequest('/api/feeds', {
      method: 'POST',
      body: { text: ' lunch ', feedKeywordIds: [1, 2] },
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({
      success: true,
      data: { feedId: 99, expiresAt: '2026-01-02T00:00:00.000Z' },
    });
    expect(feedMocks.createFeed).toHaveBeenCalledWith(authUser.id, ' lunch ', [1, 2]);
  });

  it('validates feed path ids', async () => {
    const response = await getFeedDetail(jsonRequest('/api/feeds/nope'), routeContext({ id: 'nope' }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('INVALID_FEED_ID');
    expect(feedMocks.getFeedDetail).not.toHaveBeenCalled();
  });

  it('reads, updates, deletes, and records views for a feed', async () => {
    feedMocks.getFeedDetail.mockResolvedValue({ feed: { feedId: 12 } });
    feedMocks.updateFeed.mockResolvedValue({ updated: true });
    feedMocks.deleteFeed.mockResolvedValue({ deleted: true });
    feedMocks.recordFeedView.mockResolvedValue({ recorded: true });

    const detailResponse = await getFeedDetail(jsonRequest('/api/feeds/12'), routeContext({ id: '12' }));
    const patchResponse = await patchFeed(
      jsonRequest('/api/feeds/12', { method: 'PATCH', body: { text: 'changed', feedKeywordIds: [2] } }),
      routeContext({ id: '12' }),
    );
    const deleteResponse = await deleteFeed(
      jsonRequest('/api/feeds/12', { method: 'DELETE' }),
      routeContext({ id: '12' }),
    );
    const viewResponse = await postFeedView(
      jsonRequest('/api/feeds/12/view', { method: 'POST' }),
      routeContext({ id: '12' }),
    );

    expect(await readJson(detailResponse)).toEqual({ success: true, data: { feed: { feedId: 12 } } });
    expect(await readJson(patchResponse)).toEqual({ success: true, data: { updated: true } });
    expect(await readJson(deleteResponse)).toEqual({ success: true, data: { deleted: true } });
    expect(await readJson(viewResponse)).toEqual({ success: true, data: { recorded: true } });
    expect(feedMocks.getFeedDetail).toHaveBeenCalledWith(authUser.id, 12);
    expect(feedMocks.updateFeed).toHaveBeenCalledWith(authUser.id, 12, 'changed', [2]);
    expect(feedMocks.deleteFeed).toHaveBeenCalledWith(authUser.id, 12);
    expect(feedMocks.recordFeedView).toHaveBeenCalledWith(12, authUser.id);
  });

  it('rejects feed updates with no fields', async () => {
    const response = await patchFeed(
      jsonRequest('/api/feeds/12', { method: 'PATCH', body: {} }),
      routeContext({ id: '12' }),
    );
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('NO_UPDATE_FIELDS');
    expect(feedMocks.updateFeed).not.toHaveBeenCalled();
  });

  it('creates and lists feed comments', async () => {
    commentMocks.createComment.mockResolvedValue({ commentId: 8 });
    commentMocks.listComments.mockResolvedValue({ items: [{ commentId: 8 }] });

    const postResponse = await postFeedComment(
      jsonRequest('/api/feeds/12/comments', { method: 'POST', body: { content: 'hello' } }),
      routeContext({ id: '12' }),
    );
    const getResponse = await getFeedComments(
      jsonRequest('/api/feeds/12/comments'),
      routeContext({ id: '12' }),
    );

    expect(await readJson(postResponse)).toEqual({ success: true, data: { commentId: 8 } });
    expect(await readJson(getResponse)).toEqual({ success: true, data: { items: [{ commentId: 8 }] } });
    expect(commentMocks.createComment).toHaveBeenCalledWith(authUser.id, 12, 'hello');
    expect(commentMocks.listComments).toHaveBeenCalledWith(authUser.id, 12);
  });

  it('validates comment body and selected comment ids', async () => {
    const commentResponse = await postFeedComment(
      jsonRequest('/api/feeds/12/comments', { method: 'POST', body: { content: ' ' } }),
      routeContext({ id: '12' }),
    );
    const selectResponse = await selectCommentChat(
      jsonRequest('/api/feeds/comments/nope/select-chat', { method: 'POST' }),
      routeContext({ id: 'nope' }),
    );

    expect((await readJson(commentResponse)).error?.code).toBe('INVALID_CONTENT');
    expect((await readJson(selectResponse)).error?.code).toBe('INVALID_COMMENT_ID');
    expect(commentMocks.createComment).not.toHaveBeenCalled();
    expect(commentMocks.selectChat).not.toHaveBeenCalled();
  });

  it('lists feed keywords, my active feed, commented feeds, and selected comment chat', async () => {
    feedMocks.listKeywords.mockResolvedValue({ items: [{ feedKeywordId: 1, name: 'coffee' }] });
    prismaMock.selfDateFeed.findFirst.mockResolvedValue(null);
    commentMocks.listMyCommentedFeeds.mockResolvedValue({ items: [{ feedId: 12 }] });
    commentMocks.selectChat.mockResolvedValue({ chatRoomId: 6 });

    const keywordsResponse = await getFeedKeywords();
    const myFeedResponse = await getMyFeed(jsonRequest('/api/feeds/mine'));
    const commentedResponse = await getCommentedFeeds(jsonRequest('/api/feeds/commented-by-me'));
    const selectResponse = await selectCommentChat(
      jsonRequest('/api/feeds/comments/8/select-chat', { method: 'POST' }),
      routeContext({ id: '8' }),
    );

    expect(await readJson(keywordsResponse)).toEqual({
      success: true,
      data: { items: [{ feedKeywordId: 1, name: 'coffee' }] },
    });
    expect(await readJson(myFeedResponse)).toEqual({ success: true, data: { feed: null } });
    expect(await readJson(commentedResponse)).toEqual({ success: true, data: { items: [{ feedId: 12 }] } });
    expect(await readJson(selectResponse)).toEqual({ success: true, data: { chatRoomId: 6 } });
    expect(commentMocks.listMyCommentedFeeds).toHaveBeenCalledWith(authUser.id);
    expect(commentMocks.selectChat).toHaveBeenCalledWith(authUser.id, 8);
  });

  it('lists, creates, and deletes user blocks', async () => {
    safetyMocks.listBlocks.mockResolvedValue({ items: [{ blockId: 1 }] });
    safetyMocks.blockUser.mockResolvedValue({ blockId: 2 });
    safetyMocks.unblockUser.mockResolvedValue({ unblocked: true });

    const getResponse = await getBlocks(jsonRequest('/api/blocks'));
    const postResponse = await postBlock(jsonRequest('/api/blocks', {
      method: 'POST',
      body: { blockedUserId: 20, reason: 'spam' },
    }));
    const deleteResponse = await deleteBlock(jsonRequest('/api/blocks', {
      method: 'DELETE',
      body: { blockId: 2 },
    }));

    expect(await readJson(getResponse)).toEqual({ success: true, data: { items: [{ blockId: 1 }] } });
    expect(await readJson(postResponse)).toEqual({ success: true, data: { blockId: 2 } });
    expect(await readJson(deleteResponse)).toEqual({ success: true, data: { unblocked: true } });
    expect(safetyMocks.listBlocks).toHaveBeenCalledWith(authUser.id);
    expect(safetyMocks.blockUser).toHaveBeenCalledWith(authUser.id, 20, 'spam');
    expect(safetyMocks.unblockUser).toHaveBeenCalledWith(authUser.id, 2);
  });

  it('validates block, phone block, and report request bodies', async () => {
    const blockResponse = await postBlock(jsonRequest('/api/blocks', {
      method: 'POST',
      body: { blockedUserId: '20' },
    }));
    const phoneResponse = await postPhoneBlock(jsonRequest('/api/blocks/phone', {
      method: 'POST',
      body: { phoneNumberE164: '01012345678' },
    }));
    const reportResponse = await postReport(jsonRequest('/api/reports', {
      method: 'POST',
      body: { targetType: 'bad', targetId: 1, reasonType: 'abuse' },
    }));

    expect((await readJson(blockResponse)).error?.code).toBe('INVALID_BLOCKED_USER_ID');
    expect((await readJson(phoneResponse)).error?.code).toBe('INVALID_PHONE_FORMAT');
    expect((await readJson(reportResponse)).error?.code).toBe('INVALID_TARGET_TYPE');
    expect(safetyMocks.blockUser).not.toHaveBeenCalled();
    expect(safetyMocks.blockPhone).not.toHaveBeenCalled();
    expect(safetyMocks.createReport).not.toHaveBeenCalled();
  });

  it('creates phone blocks and reports', async () => {
    safetyMocks.blockPhone.mockResolvedValue({ phoneBlockId: 4 });
    safetyMocks.createReport.mockResolvedValue({ reportId: 5 });

    const phoneResponse = await postPhoneBlock(jsonRequest('/api/blocks/phone', {
      method: 'POST',
      body: { phoneNumberE164: '+821012345678' },
    }));
    const reportResponse = await postReport(jsonRequest('/api/reports', {
      method: 'POST',
      body: {
        targetType: 'feed',
        targetId: 12,
        reasonType: 'abuse',
        description: 'bad content',
        alsoBlock: true,
      },
    }));

    expect(await readJson(phoneResponse)).toEqual({ success: true, data: { phoneBlockId: 4 } });
    expect(await readJson(reportResponse)).toEqual({ success: true, data: { reportId: 5 } });
    expect(safetyMocks.blockPhone).toHaveBeenCalledWith(authUser.id, '+821012345678');
    expect(safetyMocks.createReport).toHaveBeenCalledWith(authUser.id, {
      targetType: 'feed',
      targetId: 12,
      reasonType: 'abuse',
      description: 'bad content',
      alsoBlock: true,
    });
  });
});
