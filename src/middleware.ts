/**
 * src/middleware.ts
 *
 * Astro middleware — runs before every request.
 * Protects all /admin/* routes (except /admin/login) by verifying the
 * admin session cookie.  If the access_token is expired it is silently
 * refreshed; if it cannot be refreshed the user is sent to /admin/login.
 */
import { defineMiddleware } from 'astro:middleware';
import { createClient }     from '@supabase/supabase-js';
import { supabaseAdmin }    from './lib/supabase-admin';
import {
  getSessionTokens,
  setSessionCookie,
  clearSessionCookie,
} from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // ── Only guard /admin/* routes ────────────────────────────────────────────
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage  = pathname === '/admin/login';
  const isApiRoute   = pathname.startsWith('/api/');

  // Non-admin routes and the login page itself pass through freely
  if (!isAdminRoute || isLoginPage || isApiRoute) {
    return next();
  }

  // ── Read session cookie ───────────────────────────────────────────────────
  const tokens = getSessionTokens(context.cookies);

  if (!tokens) {
    return context.redirect('/admin/login');
  }

  // ── Verify access token ───────────────────────────────────────────────────
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(tokens.access_token);

  if (user && !error) {
    context.locals.user = user;
    return next();
  }

  // ── Access token expired → attempt refresh ────────────────────────────────
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: refreshed, error: refreshErr } =
    await supabase.auth.refreshSession({ refresh_token: tokens.refresh_token });

  if (refreshErr || !refreshed.session || !refreshed.user) {
    clearSessionCookie(context.cookies);
    return context.redirect('/admin/login');
  }

  // ── Save the new session and proceed ─────────────────────────────────────
  setSessionCookie(context.cookies, refreshed.session, import.meta.env.PROD);
  context.locals.user = refreshed.user;
  return next();
});
