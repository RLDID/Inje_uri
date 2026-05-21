import { ok } from '@/server/lib/response';
import { clearAdminSessionCookie } from '@/server/lib/admin-auth';

export async function POST() {
  const response = ok({ loggedOut: true });
  clearAdminSessionCookie(response);
  return response;
}
