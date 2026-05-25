export const ADMIN_OPERATOR_NICKNAME = "인제우리 우곰이";
export const ADMIN_OPERATOR_REAL_NAME = "인제우리 우곰이";
export const ADMIN_OPERATOR_EMAIL = process.env.ADMIN_OPERATOR_EMAIL?.trim() || "operator.woogom@injeuri.local";
export const ADMIN_OPERATOR_PROFILE_IMAGE_URL = process.env.ADMIN_OPERATOR_PROFILE_IMAGE_URL?.trim() || "/brand/bear-hero-feed.png";
export const ADMIN_OPERATOR_CHAT_EXTENSION_DAYS = 30;

export function isAdminOperatorEmail(email: string | null | undefined): boolean {
  return email === ADMIN_OPERATOR_EMAIL;
}
