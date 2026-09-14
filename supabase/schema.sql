-- 1. Create Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    image_url TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer_index INT NOT NULL DEFAULT 0,
    explanation TEXT,
    order_index INT NOT NULL DEFAULT 0
);

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

-- Allow public read access to quizzes and questions
CREATE POLICY "Allow public read access on quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on quizzes" ON public.quizzes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on questions" ON public.questions FOR INSERT WITH CHECK (true);

-- Allow public insert on submissions and read access for analytics
CREATE POLICY "Allow public insert on submissions" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read on submissions" ON public.submissions FOR SELECT USING (true);

-- 4. Storage Bucket Setup (Run in Supabase Dashboard SQL Editor if bucket not created)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('quiz-assets', 'quiz-assets', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Allow public read access on quiz-assets" ON storage.objects FOR SELECT USING (bucket_id = 'quiz-assets');
-- CREATE POLICY "Allow public upload on quiz-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'quiz-assets');
