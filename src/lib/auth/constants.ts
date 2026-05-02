export const BUS_LOGIN_ENDPOINT = 'https://bus.inje.ac.kr/app/api.php?ctrl=Member&action=Login&lang=1';
export const BUS_INJE_CHECK_ENDPOINT = 'https://bus.inje.ac.kr/app/api.php?ctrl=Member&action=InjeCheck';

export const SESSION_COOKIE_NAME = 'injeuri_session';
export const APP_AUTH_COOKIE_NAME = 'injeuri_bus_auth';
export const PRE_SIGNUP_COOKIE_NAME = 'injeuri_pre_signup';
export const PRE_SIGNUP_COOKIE_MAX_AGE_SECONDS = 60 * 10;
export const PRE_AUTH_CREDENTIALS_STORAGE_KEY = 'injeuri_pre_auth_credentials';
export const INJE_CHECK_FAIL_MESSAGE = '입력한 정보를 찾을수 없습니다.';

const PROTECTED_APP_PATH_PREFIXES = [
  '/match',
  '/interest',
  '/chat',
  '/self-date',
  '/my',
] as const;

export function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_APP_PATH_PREFIXES.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));
}
