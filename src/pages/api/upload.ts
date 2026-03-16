/**
 * src/pages/api/upload.ts
 *
 * Server-side file upload endpoint for the admin assignment builder.
 * Accepts multipart/form-data, uploads to Supabase Storage "homework-files"
 * bucket using the service role key (bypasses RLS), and returns the public URL.
 *
 * Only accessible to authenticated admins (verified via session cookie).
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { getSessionTokens } from '../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  // ── Auth check ─────────────────────────────────────────────────────────
  const tokens = getSessionTokens(cookies);
  if (!tokens) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: { user } } = await supabaseAdmin.auth.getUser(tokens.access_token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Parse form data ─────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Validate file size (50 MB max) ─────────────────────────────────────
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large (max 50 MB)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Build a unique storage path ────────────────────────────────────────
  const timestamp  = Date.now();
  const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `assignments/${timestamp}_${safeName}`;

  // ── Upload to Supabase Storage ─────────────────────────────────────────
  const { data, error } = await supabaseAdmin.storage
    .from('homework-files')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error || !data) {
    console.error('[api/upload] Supabase upload error:', error);
    return new Response(JSON.stringify({ error: error?.message ?? 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Get the public URL ─────────────────────────────────────────────────
  const { data: urlData } = supabaseAdmin.storage
    .from('homework-files')
    .getPublicUrl(storagePath);

  return new Response(
    JSON.stringify({
      url:      urlData.publicUrl,
      path:     storagePath,
      name:     file.name,
      size:     file.size,
      mimeType: file.type,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
