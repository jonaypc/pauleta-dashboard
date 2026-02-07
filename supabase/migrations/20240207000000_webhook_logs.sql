CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    source VARCHAR(50), -- 'email-inbound'
    status VARCHAR(20), -- 'received', 'processing', 'success', 'error'
    metadata JSONB,     -- Headers, parsed fields (safe)
    error TEXT
);

-- Enable RLS (Read only for admins)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs" ON webhook_logs
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin' OR rol = 'empleado')); 
    -- Assuming 'usuarios' table exists and links to auth.users. 
    -- If not, we can make it public for now or use service_role for writing.
    
-- Allow service role to insert (webhooks use service role)
CREATE POLICY "Service role can insert logs" ON webhook_logs
    FOR INSERT
    WITH CHECK (true);
