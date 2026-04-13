-- Add exchange/return columns to lineas_factura that the code references but were never created
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS es_intercambio BOOLEAN DEFAULT FALSE;
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS producto_devuelto_id UUID REFERENCES productos(id) ON DELETE SET NULL;
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS motivo_devolucion VARCHAR(255);
