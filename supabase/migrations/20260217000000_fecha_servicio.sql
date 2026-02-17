-- Add service date to facturas (delivery date, separate from invoice date)
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS fecha_servicio DATE;
