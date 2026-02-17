-- Add service date per line item (delivery date for each product/service)
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS fecha_servicio DATE;
