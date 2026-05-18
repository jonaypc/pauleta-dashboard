-- Tabla para almacenar informes de producción generados
CREATE TABLE informes_produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) NOT NULL UNIQUE,
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id UUID REFERENCES auth.users(id),
  num_facturas INTEGER NOT NULL DEFAULT 0,
  num_productos INTEGER NOT NULL DEFAULT 0,
  cantidad_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  facturas_ids TEXT[] NOT NULL DEFAULT '{}',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para productos consolidados en cada informe
CREATE TABLE informes_produccion_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id UUID NOT NULL REFERENCES informes_produccion(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  cantidad_total DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(50) NOT NULL DEFAULT 'unidad',
  facturas_origen TEXT[] NOT NULL DEFAULT '{}',
  clientes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_informes_produccion_fecha ON informes_produccion(fecha_generacion DESC);
CREATE INDEX idx_informes_produccion_numero ON informes_produccion(numero);
CREATE INDEX idx_informes_produccion_productos_informe ON informes_produccion_productos(informe_id);

-- RLS Policies
ALTER TABLE informes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE informes_produccion_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON informes_produccion
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON informes_produccion_productos
  FOR ALL USING (auth.role() = 'authenticated');

-- Función para generar número de informe automático
CREATE OR REPLACE FUNCTION generar_numero_informe()
RETURNS VARCHAR(50) AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_numero VARCHAR(50);
BEGIN
  -- Obtener el último número de informe del año actual
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(numero FROM 'IP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-(\d+)$')
        AS INTEGER
      )
    ),
    0
  )
  INTO ultimo_numero
  FROM informes_produccion
  WHERE numero LIKE 'IP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';

  -- Generar el nuevo número
  nuevo_numero := 'IP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ultimo_numero + 1)::TEXT, 4, '0');

  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE informes_produccion IS 'Histórico de informes de producción generados desde facturas';
COMMENT ON TABLE informes_produccion_productos IS 'Productos consolidados en cada informe de producción';
