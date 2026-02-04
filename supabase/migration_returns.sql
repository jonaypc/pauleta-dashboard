-- 1. Añadir control de STOCK a Productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS control_stock BOOLEAN DEFAULT false; -- Si true, descuenta stock

-- 2. Tabla de Mermas (Productos desechados/devueltos)
CREATE TABLE IF NOT EXISTS mermas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  motivo VARCHAR(255), -- "Caducidad", "Defecto", etc.
  fecha DATE DEFAULT CURRENT_DATE,
  linea_factura_id UUID, -- Opcional: vincular a la línea de la factura donde se hizo el cambio
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Mermas
ALTER TABLE mermas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Mermas visibles autenticados" ON mermas FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Mermas insertables autenticados" ON mermas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. Modificar Líneas de Factura para soportar intercambios
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS es_intercambio BOOLEAN DEFAULT false;
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS producto_devuelto_id UUID REFERENCES productos(id); -- El producto que se devuelve (el malo)
