-- Consolidated migration for missing tables (lineas_gasto and webhook_logs)

-- 1. LINEAS_GASTO
CREATE TABLE IF NOT EXISTS lineas_gasto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gasto_id UUID NOT NULL REFERENCES gastos(id) ON DELETE CASCADE,
    descripcion TEXT,
    base_imponible DECIMAL(10,2) NOT NULL DEFAULT 0,
    importe_impuesto DECIMAL(10,2) NOT NULL DEFAULT 0,
    tipo_impuesto DECIMAL(4,2) NOT NULL DEFAULT 7.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lineas_gasto ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lineas_gasto' AND policyname = 'Lineas de gasto visibles para autenticados') THEN
        CREATE POLICY "Lineas de gasto visibles para autenticados" ON lineas_gasto FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lineas_gasto' AND policyname = 'Lineas de gasto insertables para autenticados') THEN
        CREATE POLICY "Lineas de gasto insertables para autenticados" ON lineas_gasto FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lineas_gasto' AND policyname = 'Lineas de gasto actualizables para autenticados') THEN
        CREATE POLICY "Lineas de gasto actualizables para autenticados" ON lineas_gasto FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lineas_gasto' AND policyname = 'Lineas de gasto eliminables para autenticados') THEN
        CREATE POLICY "Lineas de gasto eliminables para autenticados" ON lineas_gasto FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END
$$;

-- 2. WEBHOOK_LOGS
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    source VARCHAR(50), 
    status VARCHAR(20), 
    metadata JSONB,     
    error TEXT
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Policy for admins viewing logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'Admins can view webhook logs') THEN
        CREATE POLICY "Admins can view webhook logs" ON webhook_logs
            FOR SELECT
            USING (auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin' OR rol = 'empleado'));
    END IF;
    
    -- Policy for service role insertion
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'Service role can insert logs') THEN
        CREATE POLICY "Service role can insert logs" ON webhook_logs
            FOR INSERT
            WITH CHECK (true);
    END IF;
END
$$;
