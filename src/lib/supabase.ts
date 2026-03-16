/**
 * src/lib/supabase.ts
 *
 * Public Supabase client — uses the anon key, subject to Row Level Security.
 * Safe to import in SSR page frontmatter (server-side only).
 * Do NOT import this in client-side <script> tags.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.SUPABASE_URL;
const supabaseAnon = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    '[supabase.ts] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
    'Check your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon);

// ─── Typed helpers ────────────────────────────────────────────────────────────

export type Student = {
  id:           string;
  name:         string;
  email:        string | null;
  access_token: string;
  is_active:    boolean;
  notes:        string | null;
  created_at:   string;
};

export type Assignment = {
  id:           string;
  title:        string;
  lesson_date:  string | null;
  created_at:   string;
  created_by:   string | null;
};

export type AssignmentItem = {
  id:            string;
  assignment_id: string;
  item_order:    number;
  item_type:     'text' | 'fen' | 'pgn' | 'file' | 'link';
  content:       string | null;
  title:         string | null;
  file_url:      string | null;
  file_name:     string | null;
  timer_seconds: number | null;
  metadata:      Record<string, unknown> | null;
};

export type StudentAssignment = {
  id:             string;
  student_id:     string;
  assignment_id:  string;
  status:         'pending' | 'in_progress' | 'completed';
  student_notes:  string | null;
  assigned_at:    string;
  completed_at:   string | null;
};
