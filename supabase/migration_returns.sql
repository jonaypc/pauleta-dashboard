-- 1. Añadir control de STOCK a Productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS control_stock BOOLEAN DEFAULT false; 

-- 2. Tabla de Mermas (Productos desechados/devueltos)
CREATE TABLE IF NOT EXISTS mermas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  motivo VARCHAR(255),
  fecha DATE DEFAULT CURRENT_DATE,
  linea_factura_id UUID, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Mermas
ALTER TABLE mermas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mermas all" ON mermas;
CREATE POLICY "Mermas all" ON mermas FOR ALL USING (auth.role() = 'authenticated');

-- 3. Modificar Líneas de Factura para soportar intercambios
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS es_intercambio BOOLEAN DEFAULT false;
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS producto_devuelto_id UUID REFERENCES productos(id);
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS motivo_devolucion VARCHAR(255);
