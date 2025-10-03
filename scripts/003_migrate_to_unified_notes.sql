-- Drop old tables if they exist
DROP TABLE IF EXISTS public.advice;
DROP TABLE IF EXISTS public.lists;
DROP TABLE IF EXISTS public.ramblings;

-- Create the unified notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('good-advice', 'bad-advice', 'list', 'rambling')),
  content TEXT NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  rotation REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_type ON public.notes(type);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can customize this later)
CREATE POLICY "Allow all operations on notes" ON public.notes
  FOR ALL
  USING (true)
  WITH CHECK (true);
