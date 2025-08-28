-- Create PDF generations table
CREATE TABLE IF NOT EXISTS public.pdf_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pdf_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own PDF generations" ON public.pdf_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own PDF generations" ON public.pdf_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDF generations" ON public.pdf_generations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDF generations" ON public.pdf_generations
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can view all PDF generations
CREATE POLICY "Admins can view all PDF generations" ON public.pdf_generations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
