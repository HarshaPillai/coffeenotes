-- Add session_id column to notes table to track note ownership
ALTER TABLE notes ADD COLUMN session_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_notes_session_id ON notes(session_id);
