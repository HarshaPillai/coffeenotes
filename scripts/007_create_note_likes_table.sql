-- Create a table to track which users liked which notes
CREATE TABLE IF NOT EXISTS note_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, session_id)
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_note_likes_note_id ON note_likes(note_id);
CREATE INDEX IF NOT EXISTS idx_note_likes_session_id ON note_likes(session_id);
