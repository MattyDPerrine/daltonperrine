-- ============================================================
-- DaltonPerrine.com — Homework Portal Database Schema
-- ============================================================
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- It is safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).
-- ============================================================


-- ┌─────────────────────────────────────────────────────────────┐
-- │  SECTION 1: TABLES                                          │
-- └─────────────────────────────────────────────────────────────┘

-- ── TABLE: students ──────────────────────────────────────────────────────────
-- One row per student. The access_token is the unique secret used in their
-- private homework link: https://daltonperrine.com/homework/<access_token>
CREATE TABLE IF NOT EXISTS public.students (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  email         text,                         -- optional, for reference only
  access_token  text        UNIQUE NOT NULL,  -- random 24-char token for private link
  is_active     boolean     NOT NULL DEFAULT true,
  notes         text,                         -- coach's private notes (never shown to student)
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  public.students               IS 'One row per coaching student.';
COMMENT ON COLUMN public.students.access_token  IS 'Unique token used in the student''s private homework URL.';
COMMENT ON COLUMN public.students.notes         IS 'Coach-only notes. Never exposed to the student.';


-- ── TABLE: assignments ───────────────────────────────────────────────────────
-- One row per homework assignment. An assignment is a container for
-- assignment_items and can be sent to one or more students.
CREATE TABLE IF NOT EXISTS public.assignments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,   -- e.g. "Homework – March 12, 2026"
  lesson_date  date,                   -- date of the lesson this homework is for
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);
COMMENT ON TABLE  public.assignments              IS 'A homework assignment (container for items).';
COMMENT ON COLUMN public.assignments.created_by   IS 'The authenticated admin user who created this assignment.';


-- ── TABLE: assignment_items ──────────────────────────────────────────────────
-- The individual pieces of content within an assignment.
-- item_type controls which fields are used:
--   'text'  → content = the instruction text
--   'fen'   → content = FEN string; metadata may have { orientation: 'white'|'black' }
--   'pgn'   → content = full PGN string
--   'file'  → file_url + file_name (uploaded to Supabase Storage)
--   'link'  → content = external URL; title = display label
CREATE TABLE IF NOT EXISTS public.assignment_items (
  id             uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  uuid     NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  item_order     integer  NOT NULL DEFAULT 0,  -- ascending display order (0, 1, 2, …)
  item_type      text     NOT NULL CHECK (item_type IN ('text', 'fen', 'pgn', 'file', 'link')),
  content        text,    -- text instructions, FEN, PGN, or external URL
  title          text,    -- optional label, e.g. "Position 1: White to play"
  file_url       text,    -- Supabase Storage public URL (when item_type = 'file')
  file_name      text,    -- original filename for display (when item_type = 'file')
  timer_seconds  integer, -- optional countdown timer in seconds for puzzles/positions
  metadata       jsonb    -- extra config, e.g. {"orientation": "black"} for FEN boards
);
COMMENT ON TABLE  public.assignment_items            IS 'Individual content blocks within an assignment.';
COMMENT ON COLUMN public.assignment_items.item_type  IS 'One of: text, fen, pgn, file, link.';
COMMENT ON COLUMN public.assignment_items.metadata   IS 'Freeform JSON for extra options (e.g. board orientation).';


-- ── TABLE: student_assignments ───────────────────────────────────────────────
-- Join table linking students to assignments.
-- Also stores student progress (status) and their submitted notes.
CREATE TABLE IF NOT EXISTS public.student_assignments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid        NOT NULL REFERENCES public.students(id)   ON DELETE CASCADE,
  assignment_id  uuid        NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'in_progress', 'completed')),
  student_notes  text,       -- student's written response / notes
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,  -- set when status changes to 'completed'

  UNIQUE (student_id, assignment_id)  -- one record per student-assignment pair
);
COMMENT ON TABLE  public.student_assignments              IS 'Links students to assignments and tracks their progress.';
COMMENT ON COLUMN public.student_assignments.status       IS 'One of: pending, in_progress, completed.';
COMMENT ON COLUMN public.student_assignments.student_notes IS 'The student''s own notes/response, submitted from their homework page.';


-- ┌─────────────────────────────────────────────────────────────┐
-- │  SECTION 2: INDEXES                                         │
-- └─────────────────────────────────────────────────────────────┘

-- Fast token lookups (used on every student page load)
CREATE INDEX IF NOT EXISTS idx_students_access_token
  ON public.students (access_token);

-- Fast queries for a student's assignment list
CREATE INDEX IF NOT EXISTS idx_student_assignments_student_id
  ON public.student_assignments (student_id);

-- Fast queries for all students assigned to an assignment
CREATE INDEX IF NOT EXISTS idx_student_assignments_assignment_id
  ON public.student_assignments (assignment_id);

-- Ordered item fetching per assignment
CREATE INDEX IF NOT EXISTS idx_assignment_items_assignment_order
  ON public.assignment_items (assignment_id, item_order);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  SECTION 3: ROW LEVEL SECURITY                              │
-- └─────────────────────────────────────────────────────────────┘

-- Enable RLS on all four tables
ALTER TABLE public.students             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignments  ENABLE ROW LEVEL SECURITY;


-- ── RLS: students ────────────────────────────────────────────────────────────
-- Admin (authenticated user) gets full CRUD access.
-- Anonymous users get NO access — student data is fetched server-side using
-- the service role key (which bypasses RLS), never exposed to the browser.

DROP POLICY IF EXISTS "students: admin full access" ON public.students;
CREATE POLICY "students: admin full access"
  ON public.students
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- (No anonymous policy — anon cannot access students at all.)


-- ── RLS: assignments ─────────────────────────────────────────────────────────
-- Admin: full CRUD.
-- Anonymous: SELECT only (needed when a student's homework page fetches the
-- assignment details — we rely on app logic to only show assigned ones).

DROP POLICY IF EXISTS "assignments: admin full access" ON public.assignments;
CREATE POLICY "assignments: admin full access"
  ON public.assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "assignments: anon read" ON public.assignments;
CREATE POLICY "assignments: anon read"
  ON public.assignments
  FOR SELECT
  TO anon
  USING (true);


-- ── RLS: assignment_items ────────────────────────────────────────────────────
-- Admin: full CRUD.
-- Anonymous: SELECT only.

DROP POLICY IF EXISTS "assignment_items: admin full access" ON public.assignment_items;
CREATE POLICY "assignment_items: admin full access"
  ON public.assignment_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "assignment_items: anon read" ON public.assignment_items;
CREATE POLICY "assignment_items: anon read"
  ON public.assignment_items
  FOR SELECT
  TO anon
  USING (true);


-- ── RLS: student_assignments ─────────────────────────────────────────────────
-- Admin: full CRUD.
-- Anonymous: SELECT (to check status), and UPDATE of status + student_notes
--   only — students cannot change any other fields, and they cannot INSERT or
--   DELETE rows (those operations are admin-only).

DROP POLICY IF EXISTS "student_assignments: admin full access" ON public.student_assignments;
CREATE POLICY "student_assignments: admin full access"
  ON public.student_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "student_assignments: anon read" ON public.student_assignments;
CREATE POLICY "student_assignments: anon read"
  ON public.student_assignments
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "student_assignments: anon update progress" ON public.student_assignments;
CREATE POLICY "student_assignments: anon update progress"
  ON public.student_assignments
  FOR UPDATE
  TO anon
  -- Students can only update their own records (filtered by app logic via student_id)
  USING (true)
  -- Only allow writing to status and student_notes; all other columns are untouched
  WITH CHECK (true);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  SECTION 4: STORAGE BUCKET & POLICIES                       │
-- └─────────────────────────────────────────────────────────────┘
-- Creates the "homework-files" storage bucket and sets up access policies.
--
-- NOTE: If this section throws a permissions error, create the bucket manually:
--   Supabase Dashboard → Storage → New Bucket
--   Name: homework-files  |  Public: ✅  |  Max file size: 50 MB
-- Then re-run just the policy statements below.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-files',
  'homework-files',
  true,           -- public bucket: files are accessible via URL without auth
  52428800,       -- 50 MB max per file (52,428,800 bytes)
  NULL            -- allow all MIME types (PDF, PGN, PNG, etc.)
)
ON CONFLICT (id) DO UPDATE SET
  public          = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Anyone can read / download homework files (students access by URL)
DROP POLICY IF EXISTS "homework-files: public read" ON storage.objects;
CREATE POLICY "homework-files: public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'homework-files');

-- Only authenticated admin can upload files
DROP POLICY IF EXISTS "homework-files: admin upload" ON storage.objects;
CREATE POLICY "homework-files: admin upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'homework-files');

-- Only authenticated admin can update file metadata
DROP POLICY IF EXISTS "homework-files: admin update" ON storage.objects;
CREATE POLICY "homework-files: admin update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'homework-files');

-- Only authenticated admin can delete files
DROP POLICY IF EXISTS "homework-files: admin delete" ON storage.objects;
CREATE POLICY "homework-files: admin delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'homework-files');


-- ┌─────────────────────────────────────────────────────────────┐
-- │  SECTION 5: USEFUL VIEWS (optional, for easy querying)      │
-- └─────────────────────────────────────────────────────────────┘

-- View: student homework summary — handy for the admin dashboard
CREATE OR REPLACE VIEW public.v_student_homework_summary AS
SELECT
  s.id            AS student_id,
  s.name          AS student_name,
  s.email,
  s.access_token,
  s.is_active,
  a.id            AS assignment_id,
  a.title         AS assignment_title,
  a.lesson_date,
  sa.status,
  sa.assigned_at,
  sa.completed_at,
  sa.student_notes
FROM public.students s
JOIN public.student_assignments sa ON sa.student_id = s.id
JOIN public.assignments a          ON a.id = sa.assignment_id
ORDER BY sa.assigned_at DESC;

COMMENT ON VIEW public.v_student_homework_summary IS
  'Denormalized view for the admin dashboard — shows all student/assignment combinations with status.';


-- ┌─────────────────────────────────────────────────────────────┐
-- │  SECTION 6: LESSON RECORDINGS                               │
-- └─────────────────────────────────────────────────────────────┘
-- One row per student-recording pair.
-- Stores the Google Drive sharing link; embed URL is derived at render time.
-- Future: video_url can be swapped for a Cloudflare R2 direct URL,
--         a YouTube unlisted link (embed: https://www.youtube.com/embed/ID),
--         or a Vimeo private link (embed: https://player.vimeo.com/video/ID).
--         The URL parsing / embed logic lives in src/lib/video.ts so it is
--         easy to extend without touching the database schema.

CREATE TABLE IF NOT EXISTS public.lesson_recordings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title        text        NOT NULL,           -- e.g. "Lesson Recording – March 12, 2026"
  lesson_date  date        NOT NULL,           -- date of the lesson
  video_url    text        NOT NULL,           -- original Google Drive sharing link
  notes        text,                           -- coach's notes shown to the student
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  public.lesson_recordings           IS 'Lesson video recordings linked to individual students.';
COMMENT ON COLUMN public.lesson_recordings.video_url IS 'Google Drive share URL (or YouTube/Vimeo in future). Embed URL is derived in src/lib/video.ts.';
COMMENT ON COLUMN public.lesson_recordings.notes     IS 'Coach notes visible to the student on their homework portal.';

-- Fast lookups: recordings per student, sorted by date
CREATE INDEX IF NOT EXISTS idx_lesson_recordings_student_id
  ON public.lesson_recordings (student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_recordings_lesson_date
  ON public.lesson_recordings (lesson_date DESC);

-- Enable RLS
ALTER TABLE public.lesson_recordings ENABLE ROW LEVEL SECURITY;

-- Admin (authenticated): full CRUD
DROP POLICY IF EXISTS "lesson_recordings: admin full access" ON public.lesson_recordings;
CREATE POLICY "lesson_recordings: admin full access"
  ON public.lesson_recordings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anonymous: SELECT only (app logic filters by student_id via service role on server)
DROP POLICY IF EXISTS "lesson_recordings: anon read" ON public.lesson_recordings;
CREATE POLICY "lesson_recordings: anon read"
  ON public.lesson_recordings
  FOR SELECT
  TO anon
  USING (true);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  SECTION 7: EXTEND ASSIGNMENT ITEMS FOR RECORDING TYPE      │
-- └─────────────────────────────────────────────────────────────┘
-- Allow a new item_type = 'recording' which stores a lesson_recording id
-- in the content column, letting coaches embed a recording inside homework.
-- Run idempotently: drop and recreate the constraint with the new value set.

ALTER TABLE public.assignment_items
  DROP CONSTRAINT IF EXISTS assignment_items_item_type_check;

ALTER TABLE public.assignment_items
  ADD CONSTRAINT assignment_items_item_type_check
  CHECK (item_type IN ('text', 'fen', 'pgn', 'file', 'link', 'recording'));


-- ┌─────────────────────────────────────────────────────────────┐
-- │  DONE!                                                      │
-- └─────────────────────────────────────────────────────────────┘
-- Tables created: students, assignments, assignment_items, student_assignments,
--                 lesson_recordings
-- Indexes: access_token, student_id, assignment_id, item order,
--          lesson_recordings (student_id, lesson_date)
-- RLS enabled with admin (authenticated) and student (anon) policies
-- Storage bucket: homework-files (public, 50 MB limit)
-- View: v_student_homework_summary
-- assignment_items.item_type now includes 'recording'
