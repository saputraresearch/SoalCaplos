-- ==========================================================
-- SoalCaplos - Full Database Schema for Supabase PostgreSQL
-- Supports all 11 Interactive Question Types & Quiz Lifecycle
-- ==========================================================

-- 1. Create Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure status column exists if table was already created
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- 2. Create Questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    image_url TEXT,
    image_source_type TEXT DEFAULT 'NONE',
    alt_text TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    option_items JSONB DEFAULT '[]'::jsonb,
    correct_answer_index INT NOT NULL DEFAULT 0,
    correct_answers JSONB DEFAULT '[]'::jsonb,
    matching_pairs JSONB DEFAULT '[]'::jsonb,
    reorder_items JSONB DEFAULT '[]'::jsonb,
    correct_order JSONB DEFAULT '[]'::jsonb,
    blanks_keywords JSONB DEFAULT '[]'::jsonb,
    rubric JSONB DEFAULT '[]'::jsonb,
    math_solution TEXT,
    image_context TEXT,
    label_targets JSONB DEFAULT '[]'::jsonb,
    hotspot_zone JSONB DEFAULT '{}'::jsonb,
    categories JSONB DEFAULT '[]'::jsonb,
    categorize_items JSONB DEFAULT '[]'::jsonb,
    explanation TEXT,
    order_index INT NOT NULL DEFAULT 0
);

-- Ensure all enhanced columns exist if table was already created
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_source_type TEXT DEFAULT 'NONE';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS alt_text TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS option_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_answers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS matching_pairs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS reorder_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_order JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS blanks_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS rubric JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS math_solution TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_context TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS label_targets JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS hotspot_zone JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS categorize_items JSONB DEFAULT '[]'::jsonb;

-- 3. Create Submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    score INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_quiz_id ON public.submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_slug ON public.quizzes(slug);

-- Enable RLS (Row Level Security) and add open access policies for public quiz taking
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Allow public CRUD access on quizzes
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow public read access on quizzes" ON public.quizzes;
    DROP POLICY IF EXISTS "Allow public insert on quizzes" ON public.quizzes;
    DROP POLICY IF EXISTS "Allow public update on quizzes" ON public.quizzes;
    DROP POLICY IF EXISTS "Allow public delete on quizzes" ON public.quizzes;
END $$;
CREATE POLICY "Allow public read access on quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on quizzes" ON public.quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on quizzes" ON public.quizzes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on quizzes" ON public.quizzes FOR DELETE USING (true);

-- Allow public CRUD access on questions
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow public read access on questions" ON public.questions;
    DROP POLICY IF EXISTS "Allow public insert on questions" ON public.questions;
    DROP POLICY IF EXISTS "Allow public update on questions" ON public.questions;
    DROP POLICY IF EXISTS "Allow public delete on questions" ON public.questions;
END $$;
CREATE POLICY "Allow public read access on questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on questions" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on questions" ON public.questions FOR DELETE USING (true);

-- Allow public insert and read on submissions
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow public insert on submissions" ON public.submissions;
    DROP POLICY IF EXISTS "Allow public read on submissions" ON public.submissions;
    DROP POLICY IF EXISTS "Allow public delete on submissions" ON public.submissions;
END $$;
CREATE POLICY "Allow public insert on submissions" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read on submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Allow public delete on submissions" ON public.submissions FOR DELETE USING (true);
