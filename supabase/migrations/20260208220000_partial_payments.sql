
-- Create Pagos Gastos table
CREATE TABLE IF NOT EXISTS pagos_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id UUID REFERENCES gastos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  importe DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(50), -- transferencia, tarjeta, efectivo, domiciliacion
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for pagos_gastos
ALTER TABLE pagos_gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pagos gastos visibles para auth" ON pagos_gastos;
CREATE POLICY "Pagos gastos visibles para auth" ON pagos_gastos
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Pagos gastos editables para auth" ON pagos_gastos;
CREATE POLICY "Pagos gastos editables para auth" ON pagos_gastos
  FOR ALL USING (auth.role() = 'authenticated');

-- Update Gastos table with denormalized fields
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(10,2) DEFAULT 0;

-- Function to update gasto status and total paid
CREATE OR REPLACE FUNCTION update_gasto_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_pagado DECIMAL(10,2);
    total_gasto DECIMAL(10,2);
BEGIN
    -- Obtenemos el total de pagos para este gasto
    SELECT COALESCE(SUM(importe), 0) INTO total_pagado
    FROM pagos_gastos
    WHERE gasto_id = NEW.gasto_id;

    -- Obtenemos el importe total del gasto
    SELECT importe INTO total_gasto
    FROM gastos
    WHERE id = NEW.gasto_id;

    -- Actualizamos el gasto
    UPDATE gastos
    SET 
        monto_pagado = total_pagado,
        estado = CASE 
            WHEN total_pagado >= total_gasto THEN 'pagado'
            WHEN total_pagado > 0 THEN 'parcial'
            ELSE 'pendiente'
        END
    WHERE id = NEW.gasto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger only on Insert/Update/Delete on pagos_gastos
DROP TRIGGER IF EXISTS trigger_update_gasto_payment ON pagos_gastos;

CREATE TRIGGER trigger_update_gasto_payment
AFTER INSERT OR UPDATE OR DELETE ON pagos_gastos
FOR EACH ROW
EXECUTE FUNCTION update_gasto_payment_status();

-- TRIGGER FOR DELETE (Needs separate handling for OLD reference)
CREATE OR REPLACE FUNCTION update_gasto_payment_status_delete()
RETURNS TRIGGER AS $$
DECLARE
    total_pagado DECIMAL(10,2);
    total_gasto DECIMAL(10,2);
BEGIN
    -- Obtenemos el total de pagos para este gasto (usando OLD.gasto_id)
    SELECT COALESCE(SUM(importe), 0) INTO total_pagado
    FROM pagos_gastos
    WHERE gasto_id = OLD.gasto_id;

    -- Obtenemos el importe total del gasto
    SELECT importe INTO total_gasto
    FROM gastos
    WHERE id = OLD.gasto_id;

    -- Actualizamos el gasto
    UPDATE gastos
    SET 
        monto_pagado = total_pagado,
        estado = CASE 
            WHEN total_pagado >= total_gasto THEN 'pagado'
            WHEN total_pagado > 0 THEN 'parcial'
            ELSE 'pendiente'
        END
    WHERE id = OLD.gasto_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_gasto_payment_delete ON pagos_gastos;

CREATE TRIGGER trigger_update_gasto_payment_delete
AFTER DELETE ON pagos_gastos
FOR EACH ROW
EXECUTE FUNCTION update_gasto_payment_status_delete();
