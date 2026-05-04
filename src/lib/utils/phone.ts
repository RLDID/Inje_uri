/**
 * 한국 휴대전화번호를 E.164 형식으로 정규화한다.
 *
 * 백엔드(`POST /api/blocks/phone`)와 User.phone 컬럼은 모두 E.164(`+82...`)를
 * 정식 포맷으로 사용한다. 한국 사용자는 보통 `010-1234-5678` 형태로 입력하므로
 * 클라이언트에서 입력값을 본 함수로 정규화한 뒤 서버로 전송해야 한다.
 *
 * 처리 규칙:
 * - 이미 `+82`로 시작하면 숫자 외 문자만 제거 후 그대로 사용 (`+82 10-1234-5678` → `+821012345678`)
 * - `0`으로 시작하는 한국 국내 번호는 선두 `0`을 `+82`로 치환
 * - 그 외 형식은 정규화 불가능으로 판단하여 null 반환 (호출 측에서 에러 메시지 처리)
 *
 * 반환값은 백엔드 검증 정규식 `^\+[1-9]\d{6,14}$`을 통과해야 의미가 있으므로
 * 정규화 후 길이/패턴까지 한 번 더 확인한다.
 */
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function normalizeKoreanPhoneToE164(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  let candidate: string;

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    candidate = `+${digits}`;
  } else {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 0) return null;

    if (digits.startsWith("82")) {
      candidate = `+${digits}`;
    } else if (digits.startsWith("0")) {
      candidate = `+82${digits.slice(1)}`;
    } else {
      return null;
    }
  }

  return E164_PATTERN.test(candidate) ? candidate : null;
}

/**
 * 입력값이 한국 휴대전화번호로 정규화 가능한지 빠르게 판정한다.
 * 폼 입력의 실시간 유효성 표시 등에 사용한다.
 */
export function isNormalizableKoreanPhone(input: string): boolean {
  return normalizeKoreanPhoneToE164(input) !== null;
}
