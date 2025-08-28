-- Create table for storing user MCQ quiz attempts and results
CREATE TABLE IF NOT EXISTS public.mcq_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    score_percentage DECIMAL(5,2) NOT NULL,
    questions_data JSONB NOT NULL, -- Store questions, user answers, and correct answers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.mcq_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own attempts
CREATE POLICY "Users can view own MCQ attempts" ON public.mcq_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own attempts
CREATE POLICY "Users can insert own MCQ attempts" ON public.mcq_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS mcq_attempts_user_id_idx ON public.mcq_attempts(user_id);
CREATE INDEX IF NOT EXISTS mcq_attempts_created_at_idx ON public.mcq_attempts(created_at DESC);
