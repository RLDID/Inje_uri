import { NextRequest } from 'next/server';
import {
  clearAppAccessCookie,
  clearPreSignupCookie,
  clearSessionCookie,
  readPreSignupTokenFromRequest,
} from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { ok, fail } from '@/server/lib/response';
import { register, type RegisterInput } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

interface RegisterBody {
  loginId?: unknown;
  password?: unknown;
  nickname?: unknown;
  birth?: unknown;
  age?: unknown;
  studentYear?: unknown;
  department?: unknown;
  gender?: unknown;
  realName?: unknown;
  email?: unknown;
  university?: unknown;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGender(value: string): 'male' | 'female' | '' {
  const lowered = value.toLowerCase();
  if (lowered === 'male' || lowered === 'm' || lowered === '남' || lowered === '남성') {
    return 'male';
  }
  if (lowered === 'female' || lowered === 'f' || lowered === '여' || lowered === '여성') {
    return 'female';
  }
  return '';
}

function toInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseRegisterInput(body: RegisterBody): RegisterInput {
  const loginId = normalizeString(body.loginId);
  const password = normalizeString(body.password);
  const nickname = normalizeString(body.nickname);
  const birth = normalizeString(body.birth);
  const department = normalizeString(body.department);
  const realName = normalizeString(body.realName);
  const email = normalizeString(body.email).toLowerCase();
  const university = normalizeString(body.university);
  const gender = normalizeGender(normalizeString(body.gender));
  const age = toInteger(body.age);
  const studentYear = toInteger(body.studentYear);

  if (!loginId || !password || !nickname || !birth || !age || !department || !realName || !email || !university || !gender || !studentYear) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '회원가입 필드를 모두 입력해주세요.');
  }

  if (loginId.length < 4 || loginId.length > 100) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '아이디는 4자 이상 100자 이하로 입력해주세요.');
  }

  if (password.length < 8) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '비밀번호는 8자 이상이어야 합니다.');
  }

  if (!/^\d{6}$/.test(birth)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '생년월일 6자리를 입력해주세요.');
  }

  if (age < 1 || age > 100) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '나이 범위를 확인해주세요.');
  }

  if (studentYear < 1 || studentYear > 8) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '학년 범위를 확인해주세요.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(ERROR.VALIDATION_ERROR, '이메일 형식을 확인해주세요.');
  }

  return {
    loginId,
    password,
    nickname,
    birth,
    department,
    realName,
    email,
    university,
    gender,
    age,
    studentYear,
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: RegisterBody;
    try {
      body = await request.json() as RegisterBody;
    } catch {
      throw new ApiError(ERROR.VALIDATION_ERROR, '요청 형식을 확인해주세요.');
    }

    const result = await register(parseRegisterInput(body), readPreSignupTokenFromRequest(request));
    const response = ok(result);

    clearSessionCookie(response);
    clearAppAccessCookie(response);
    clearPreSignupCookie(response);
    return response;
  } catch (error) {
    let response;
    if (error instanceof ApiError) {
      response = fail(error.code, error.message);
    } else {
      console.error('[POST /api/auth/register]', error);
      response = fail('INTERNAL_SERVER_ERROR', '회원가입 처리 중 오류가 발생했습니다.');
    }
    if (error instanceof Error && error.message.includes('인증이 만료')) {
      clearPreSignupCookie(response);
    }
    return response;
  }
}
