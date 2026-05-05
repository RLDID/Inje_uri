import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidJsonRequest, jsonRequest, readJson } from '../helpers/api';

const authMocks = vi.hoisted(() => ({
  attachPreSignupCookie: vi.fn(),
  attachSessionCookie: vi.fn(),
  clearAppAccessCookie: vi.fn(),
  clearPreSignupCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  ensureActiveUser: vi.fn(),
  readPreSignupTokenFromRequest: vi.fn(),
  resolveCurrentUser: vi.fn(),
  toAuthUserSummary: vi.fn(),
}));

const authServiceMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  verifyInjeStudent: vi.fn(),
}));

vi.mock('@/server/lib/auth', () => authMocks);
vi.mock('@/server/services/auth/auth.service', () => authServiceMocks);

import { POST as checkInjeStudent } from '@/app/api/auth/inje-check/route';
import { POST as loginUser } from '@/app/api/auth/login/route';
import { GET as getAuthMe } from '@/app/api/auth/me/route';
import { POST as logoutUser } from '@/app/api/auth/logout/route';
import { POST as registerUser } from '@/app/api/auth/register/route';

describe('auth API routes', () => {
  const authUser = {
    id: 7,
    nickname: 'tester',
    status: 'active',
    onboarding_completed: true,
    deleted_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.readPreSignupTokenFromRequest.mockReturnValue('pre-token');
    authMocks.toAuthUserSummary.mockReturnValue({
      id: authUser.id,
      nickname: authUser.nickname,
      status: authUser.status,
      onboardingCompleted: authUser.onboarding_completed,
    });
  });

  it('rejects malformed Inje student verification payloads', async () => {
    const response = await checkInjeStudent(invalidJsonRequest('/api/auth/inje-check'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('VALIDATION_ERROR');
    expect(authServiceMocks.verifyInjeStudent).not.toHaveBeenCalled();
  });

  it('verifies an Inje student and attaches a pre-signup cookie', async () => {
    const verificationData = { studentNumber: '202401', birth: '990101' };
    authServiceMocks.verifyInjeStudent.mockResolvedValue({
      data: verificationData,
      token: 'verification-token',
    });

    const response = await checkInjeStudent(jsonRequest('/api/auth/inje-check', {
      method: 'POST',
      body: { studentNumber: ' 202401 ', birth: '990101' },
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: verificationData });
    expect(authServiceMocks.verifyInjeStudent).toHaveBeenCalledWith('202401', '990101');
    expect(authMocks.attachPreSignupCookie).toHaveBeenCalledWith(response, 'verification-token');
  });

  it('rejects login when credentials are missing', async () => {
    const response = await loginUser(jsonRequest('/api/auth/login', {
      method: 'POST',
      body: { loginId: 'tester' },
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('VALIDATION_ERROR');
    expect(authServiceMocks.login).not.toHaveBeenCalled();
  });

  it('logs in and writes the session cookie', async () => {
    const expiresAt = new Date('2026-01-01T00:00:00.000Z');
    authServiceMocks.login.mockResolvedValue({
      token: 'session-token',
      expiresAt,
      user: { id: authUser.id, nickname: authUser.nickname },
    });

    const response = await loginUser(jsonRequest('/api/auth/login', {
      method: 'POST',
      body: { studentId: ' tester ', password: ' secret123 ' },
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({
      success: true,
      data: {
        user: { id: authUser.id, nickname: authUser.nickname },
        sessionExpiresAt: expiresAt.toISOString(),
      },
    });
    expect(authServiceMocks.login).toHaveBeenCalledWith({ loginId: 'tester', password: 'secret123' });
    expect(authMocks.attachSessionCookie).toHaveBeenCalledWith(response, 'session-token', expiresAt);
    expect(authMocks.clearAppAccessCookie).toHaveBeenCalledWith(response);
  });

  it('rejects invalid register email before calling the service', async () => {
    const response = await registerUser(jsonRequest('/api/auth/register', {
      method: 'POST',
      body: {
        loginId: 'tester',
        password: 'password123',
        nickname: 'tester',
        birth: '990101',
        age: 24,
        studentYear: 3,
        department: 'CS',
        gender: 'male',
        realName: 'Tester',
        email: 'bad-email',
        university: 'Inje',
      },
    }));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('VALIDATION_ERROR');
    expect(authServiceMocks.register).not.toHaveBeenCalled();
  });

  it('registers with normalized input and clears auth setup cookies', async () => {
    authServiceMocks.register.mockResolvedValue({ userId: 11, onboardingCompleted: false });

    const response = await registerUser(jsonRequest('/api/auth/register', {
      method: 'POST',
      body: {
        loginId: ' tester ',
        password: 'password123',
        nickname: ' tester ',
        birth: '990101',
        age: '24',
        studentYear: '3',
        department: ' CS ',
        gender: 'M',
        realName: ' Tester ',
        email: 'USER@EXAMPLE.COM',
        university: ' Inje ',
      },
    }));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: { userId: 11, onboardingCompleted: false } });
    expect(authServiceMocks.register).toHaveBeenCalledWith({
      loginId: 'tester',
      password: 'password123',
      nickname: 'tester',
      birth: '990101',
      department: 'CS',
      realName: 'Tester',
      email: 'user@example.com',
      university: 'Inje',
      gender: 'male',
      age: 24,
      studentYear: 3,
    }, 'pre-token');
    expect(authMocks.clearSessionCookie).toHaveBeenCalledWith(response);
    expect(authMocks.clearAppAccessCookie).toHaveBeenCalledWith(response);
    expect(authMocks.clearPreSignupCookie).toHaveBeenCalledWith(response);
  });

  it('requires auth for /api/auth/me', async () => {
    authMocks.resolveCurrentUser.mockResolvedValue(null);

    const response = await getAuthMe(jsonRequest('/api/auth/me'));
    const payload = await readJson(response);

    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns the current auth session summary', async () => {
    const expiresAt = new Date('2026-01-01T00:00:00.000Z');
    const authContext = {
      user: authUser,
      session: { id: 55, expires_at: expiresAt },
      token: 'session-token',
    };
    authMocks.resolveCurrentUser.mockResolvedValue(authContext);

    const response = await getAuthMe(jsonRequest('/api/auth/me'));
    const payload = await readJson(response);

    expect(payload).toEqual({
      success: true,
      data: {
        user: {
          id: authUser.id,
          nickname: authUser.nickname,
          status: authUser.status,
          onboardingCompleted: authUser.onboarding_completed,
        },
        sessionExpiresAt: expiresAt.toISOString(),
      },
    });
    expect(authMocks.ensureActiveUser).toHaveBeenCalledWith(authUser);
  });

  it('logs out the current session and clears cookies', async () => {
    authServiceMocks.logout.mockResolvedValue({ loggedOut: true });
    authMocks.resolveCurrentUser.mockResolvedValue({
      user: authUser,
      session: { id: 55, expires_at: new Date('2026-01-01T00:00:00.000Z') },
      token: 'session-token',
    });

    const response = await logoutUser(jsonRequest('/api/auth/logout', { method: 'POST' }));
    const payload = await readJson(response);

    expect(payload).toEqual({ success: true, data: { loggedOut: true } });
    expect(authServiceMocks.logout).toHaveBeenCalledWith(55);
    expect(authMocks.clearSessionCookie).toHaveBeenCalledWith(response);
    expect(authMocks.clearAppAccessCookie).toHaveBeenCalledWith(response);
    expect(authMocks.clearPreSignupCookie).toHaveBeenCalledWith(response);
  });
});
