-- Update the user_id column to allow any string value (not just UUID)
-- This allows us to store browser session IDs instead of auth user IDs

ALTER TABLE notes ALTER COLUMN user_id TYPE TEXT;

-- Update RLS policies to work with session IDs
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- Since we're not using auth anymore, we'll handle permissions in the application layer
-- Keep RLS enabled but allow all operations for now
CREATE POLICY "Allow all operations on notes" ON notes FOR ALL USING (true);
