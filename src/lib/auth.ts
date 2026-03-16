/**
 * src/lib/auth.ts
 * Cookie-based session helpers for the admin dashboard.
 * The access_token and refresh_token from Supabase Auth are stored in
 * a single httpOnly cookie so they are never accessible to client-side JS.
 */
import type { AstroCookies } from 'astro';
import type { Session }      from '@supabase/supabase-js';

const COOKIE_NAME = 'admin-session';

const cookieOpts = (prod: boolean) => ({
  httpOnly: true,
  secure:   prod,           // HTTPS only in production
  sameSite: 'lax' as const, // 'lax' allows redirect-back after login
  maxAge:   60 * 60 * 24 * 7, // 7 days
  path:     '/',
});

/** Store both tokens in one httpOnly cookie after a successful login. */
export function setSessionCookie(cookies: AstroCookies, session: Session, isProd = false) {
  cookies.set(
    COOKIE_NAME,
    JSON.stringify({
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
    }),
    cookieOpts(isProd),
  );
}

/** Read and parse session tokens from the cookie. Returns null if missing/corrupt. */
export function getSessionTokens(cookies: AstroCookies): { access_token: string; refresh_token: string } | null {
  const raw = cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.access_token && parsed?.refresh_token) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Delete the session cookie (logout). */
export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(COOKIE_NAME, { path: '/' });
}
