
-- Enums for reconciliation
CREATE TYPE tipo_conciliacion AS ENUM ('gasto', 'factura', 'manual');
CREATE TYPE estado_conciliacion AS ENUM ('pendiente', 'conciliado', 'ignorado');

-- Bank Movements Table
CREATE TABLE banco_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  importe DECIMAL(10,2) NOT NULL,
  descripcion TEXT,
  referencia TEXT,
  estado estado_conciliacion DEFAULT 'pendiente',
  match_type tipo_conciliacion,
  match_id UUID, -- Polymorphic reference to gastos(id) or facturas(id)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_banco_movimientos_fecha ON banco_movimientos(fecha);
CREATE INDEX idx_banco_movimientos_estado ON banco_movimientos(estado);

-- RLS
ALTER TABLE banco_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON banco_movimientos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
