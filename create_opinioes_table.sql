-- Create opinioes table
CREATE TABLE IF NOT EXISTS opinioes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    opiniao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE opinioes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert opinions
CREATE POLICY "Anyone can insert opinions"
ON opinioes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Anyone can view opinions
CREATE POLICY "Anyone can view opinions"
ON opinioes
FOR SELECT
TO anon, authenticated
USING (true);

-- Create index for faster queries
CREATE INDEX idx_opinioes_created_at ON opinioes(created_at DESC);
