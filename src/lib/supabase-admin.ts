/**
 * src/lib/supabase-admin.ts
 *
 * Admin Supabase client — uses the service role key, which BYPASSES Row Level
 * Security entirely.
 *
 * ⚠️  NEVER import this file in any client-side code or expose the service role
 *     key to the browser. Only use in Astro SSR page frontmatter (server-side).
 *
 * Use this client for:
 *  - Admin dashboard reads/writes (students, assignments, etc.)
 *  - Operations that need to bypass RLS (e.g., looking up a student by
 *    access_token without the student being authenticated)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl      = import.meta.env.SUPABASE_URL;
const serviceRoleKey   = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '[supabase-admin.ts] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
    'Check your .env file.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    // Disable automatic token refresh and session persistence — this is a
    // server-side client; there is no "session" to maintain.
    autoRefreshToken: false,
    persistSession:   false,
  },
});

// ─── Admin helpers ────────────────────────────────────────────────────────────

/**
 * Look up a student by their private access token.
 * Returns null if not found or inactive.
 */
export async function getStudentByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('access_token', token)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Get all assignments for a specific student (by student id), newest first.
 */
export async function getStudentAssignments(studentId: string) {
  const { data, error } = await supabaseAdmin
    .from('student_assignments')
    .select(`
      *,
      assignment:assignments (
        id,
        title,
        lesson_date,
        created_at,
        assignment_items (*)
      )
    `)
    .eq('student_id', studentId)
    .order('assigned_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Get all active students, ordered by name.
 */
export async function getAllStudents() {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .order('name');

  if (error) return [];
  return data ?? [];
}

/**
 * Get all assignments, newest first.
 */
export async function getAllAssignments() {
  const { data, error } = await supabaseAdmin
    .from('assignments')
    .select('*, assignment_items(*)')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Get all recordings for a specific student, newest lesson first.
 */
export async function getRecordingsForStudent(studentId: string) {
  const { data, error } = await supabaseAdmin
    .from('lesson_recordings')
    .select('*')
    .eq('student_id', studentId)
    .order('lesson_date', { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Get all recordings across all students, with student name, newest first.
 */
export async function getAllRecordings() {
  const { data, error } = await supabaseAdmin
    .from('lesson_recordings')
    .select('*, student:students(id, name)')
    .order('lesson_date', { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Get recordings grouped by student_id as a count map.
 * Returns { [student_id]: count }
 */
export async function getRecordingCountByStudent(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('lesson_recordings')
    .select('student_id');

  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.student_id] = (counts[row.student_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Get all lesson notes for a specific student, newest lesson first.
 */
export async function getLessonNotesForStudent(studentId: string) {
  const { data, error } = await supabaseAdmin
    .from('lesson_notes')
    .select('*')
    .eq('student_id', studentId)
    .order('lesson_date', { ascending: false });

  if (error) return [];
  return data ?? [];
}

/**
 * Get lesson note counts grouped by student_id.
 * Returns { [student_id]: count }
 */
export async function getLessonNoteCountByStudent(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('lesson_notes')
    .select('student_id');

  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.student_id] = (counts[row.student_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Generate a cryptographically random 24-character access token.
 * Used when creating a new student.
 */
export function generateAccessToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  // Use crypto.getRandomValues in a Node-compatible way
  const array = new Uint8Array(24);
  globalThis.crypto.getRandomValues(array);
  for (const byte of array) {
    token += chars[byte % chars.length];
  }
  return token;
}
