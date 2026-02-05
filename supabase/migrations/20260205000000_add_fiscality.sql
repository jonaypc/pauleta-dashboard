-- Add fiscality columns to expenses (gastos)
ALTER TABLE gastos
ADD COLUMN IF NOT EXISTS base_imponible DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS impuestos DECIMAL(10,2), -- Importe del impuesto (IGIC/IVA)
ADD COLUMN IF NOT EXISTS tipo_impuesto DECIMAL(5,2) DEFAULT 7.00, -- Porcentaje (ej: 7.00)
ADD COLUMN IF NOT EXISTS pago_fijo_id UUID REFERENCES pagos_fijos(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gastos_pago_fijo_id ON gastos(pago_fijo_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
