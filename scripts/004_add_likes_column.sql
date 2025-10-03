-- Add likes column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
