-- Create MCQ questions table
CREATE TABLE IF NOT EXISTS public.mcq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options
  correct_answer INTEGER NOT NULL, -- Index of correct option
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mcq_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own MCQ questions" ON public.mcq_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own MCQ questions" ON public.mcq_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MCQ questions" ON public.mcq_questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MCQ questions" ON public.mcq_questions
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can view all MCQ questions
CREATE POLICY "Admins can view all MCQ questions" ON public.mcq_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
