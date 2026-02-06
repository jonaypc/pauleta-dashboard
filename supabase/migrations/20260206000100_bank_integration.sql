-- Table to store GoCardless (Nordigen) connections
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL, -- e.g., 'SANDBOXFINANCE_SFIN0000' or Cajamar ID
  requisition_id TEXT NOT NULL, -- The ID of the session with the bank
  agreement_id TEXT,
  reference TEXT UNIQUE,
  status TEXT DEFAULT 'initiated', -- initiated, linked, expired
  access_token TEXT, -- Optional: cache for minor performance
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON bank_connections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_connections_updated_at
    BEFORE UPDATE ON bank_connections
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
