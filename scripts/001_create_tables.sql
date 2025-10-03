-- Create tables for the digital garden

-- Random Ramblings table
CREATE TABLE IF NOT EXISTS ramblings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bad/Good Advice table
CREATE TABLE IF NOT EXISTS advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  is_good BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lists table
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  items TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ramblings_created_at ON ramblings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advice_created_at ON advice(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lists_created_at ON lists(created_at DESC);
