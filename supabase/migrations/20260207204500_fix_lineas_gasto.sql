-- Create lineas_gasto table to support multiple IGIC rates per expense
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

-- Enable RLS
ALTER TABLE lineas_gasto ENABLE ROW LEVEL SECURITY;

-- Policies (using DO block to avoid error if policy already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'lineas_gasto' AND policyname = 'Lineas de gasto visibles para autenticados'
    ) THEN
        CREATE POLICY "Lineas de gasto visibles para autenticados" ON lineas_gasto
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'lineas_gasto' AND policyname = 'Lineas de gasto insertables para autenticados'
    ) THEN
        CREATE POLICY "Lineas de gasto insertables para autenticados" ON lineas_gasto
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'lineas_gasto' AND policyname = 'Lineas de gasto actualizables para autenticados'
    ) THEN
        CREATE POLICY "Lineas de gasto actualizables para autenticados" ON lineas_gasto
            FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'lineas_gasto' AND policyname = 'Lineas de gasto eliminables para autenticados'
    ) THEN
        CREATE POLICY "Lineas de gasto eliminables para autenticados" ON lineas_gasto
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END
$$;
