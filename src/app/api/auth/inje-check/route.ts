import {
  attachPreSignupCookie,
} from '@/server/lib/auth';
import { ApiError, ERROR } from '@/server/lib/errors';
import { fail, ok } from '@/server/lib/response';
import { verifyInjeStudent } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

interface InjeCheckBody {
  studentNumber?: unknown;
  birth?: unknown;
}

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    let body: InjeCheckBody;

    try {
      body = await request.json() as InjeCheckBody;
    } catch {
      throw new ApiError(ERROR.VALIDATION_ERROR, '요청 형식을 확인해주세요.');
    }

    const studentNumber = normalizeValue(body.studentNumber);
    const birth = normalizeValue(body.birth);

    if (!studentNumber) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '학번을 입력해주세요.');
    }

    if (!/^\d{6}$/.test(birth)) {
      throw new ApiError(ERROR.VALIDATION_ERROR, '생년월일 6자리를 입력해주세요.');
    }

    const result = await verifyInjeStudent(studentNumber, birth);
    const response = ok(result.data);
    attachPreSignupCookie(response, result.token);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('인증 서버')) {
      return fail('INTERNAL_ERROR', error.message);
    }
    if (error instanceof Error && error.message.startsWith('인증 응답')) {
      return fail('INTERNAL_ERROR', error.message);
    }
    if (error instanceof ApiError) {
      return fail(error.code, error.message);
    }
    console.error('[POST /api/auth/inje-check]', error);
    return fail('INTERNAL_SERVER_ERROR', '인제 학생 인증 처리 중 오류가 발생했습니다.');
  }
}
