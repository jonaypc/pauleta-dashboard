-- =====================================================
-- MIGRACIÓN: FACTURAS RECTIFICATIVAS (ABONOS/DEVOLUCIONES)
-- Fecha: 2026-08-06
-- Normativa: Real Decreto 1619/2012 (Reglamento Facturación)
-- =====================================================

-- 1. Añadir campos para facturas rectificativas
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS tipo_factura VARCHAR(20) DEFAULT 'ordinaria' CHECK (tipo_factura IN ('ordinaria', 'rectificativa')),
  ADD COLUMN IF NOT EXISTS factura_rectificada_id UUID REFERENCES facturas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_rectificacion TEXT,
  ADD COLUMN IF NOT EXISTS fecha_factura_rectificada DATE;

-- Índice para búsquedas rápidas de rectificativas
CREATE INDEX IF NOT EXISTS idx_facturas_rectificativas ON facturas(factura_rectificada_id) WHERE factura_rectificada_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON facturas(tipo_factura);

-- 2. Comentarios explicativos
COMMENT ON COLUMN facturas.tipo_factura IS 'Tipo de factura: ordinaria (normal) o rectificativa (abono/devolución)';
COMMENT ON COLUMN facturas.factura_rectificada_id IS 'Referencia a la factura original que se está rectificando (NULL si es ordinaria)';
COMMENT ON COLUMN facturas.motivo_rectificacion IS 'Motivo legal de la rectificación: devolución mercancía, error facturación, descuento posterior, etc.';
COMMENT ON COLUMN facturas.fecha_factura_rectificada IS 'Fecha de la factura original rectificada (para referencia en PDF)';

-- 3. Función para validar facturas rectificativas
CREATE OR REPLACE FUNCTION validar_factura_rectificativa()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es rectificativa, DEBE tener referencia a factura original
  IF NEW.tipo_factura = 'rectificativa' THEN
    IF NEW.factura_rectificada_id IS NULL THEN
      RAISE EXCEPTION 'Una factura rectificativa debe referenciar la factura original';
    END IF;

    IF NEW.motivo_rectificacion IS NULL OR TRIM(NEW.motivo_rectificacion) = '' THEN
      RAISE EXCEPTION 'Una factura rectificativa debe incluir el motivo de rectificación';
    END IF;

    -- Los importes de una rectificativa normalmente son negativos (devolución) o positivos (corrección al alza)
    -- No forzamos signo, pero sí validamos que haya factura original
  END IF;

  -- Si es ordinaria, NO debe tener referencia
  IF NEW.tipo_factura = 'ordinaria' AND NEW.factura_rectificada_id IS NOT NULL THEN
    RAISE EXCEPTION 'Una factura ordinaria no puede referenciar otra factura';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger de validación
DROP TRIGGER IF EXISTS tr_validar_factura_rectificativa ON facturas;
CREATE TRIGGER tr_validar_factura_rectificativa
  BEFORE INSERT OR UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION validar_factura_rectificativa();

-- 5. Actualizar facturas existentes (todas son ordinarias)
UPDATE facturas SET tipo_factura = 'ordinaria' WHERE tipo_factura IS NULL;

-- 6. Vista helper para análisis de rectificativas
CREATE OR REPLACE VIEW v_facturas_con_rectificativas AS
SELECT
  f.id,
  f.numero,
  f.fecha,
  f.cliente_id,
  f.tipo_factura,
  f.total,
  f.estado,
  f.factura_rectificada_id,
  f.motivo_rectificacion,
  fr.numero AS numero_factura_rectificada,
  fr.fecha AS fecha_factura_original,
  fr.total AS total_factura_original,
  -- Cálculo de total neto (factura original - rectificativas)
  CASE
    WHEN f.tipo_factura = 'ordinaria' THEN
      f.total + COALESCE((
        SELECT SUM(rect.total)
        FROM facturas rect
        WHERE rect.factura_rectificada_id = f.id
          AND rect.tipo_factura = 'rectificativa'
      ), 0)
    ELSE f.total
  END AS total_neto
FROM facturas f
LEFT JOIN facturas fr ON f.factura_rectificada_id = fr.id;

COMMENT ON VIEW v_facturas_con_rectificativas IS 'Vista que muestra facturas con sus rectificativas asociadas y totales netos';

-- 7. Función para obtener el total neto de una factura (original - rectificativas)
CREATE OR REPLACE FUNCTION get_total_neto_factura(factura_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total DECIMAL(10,2);
  v_total_rectificativas DECIMAL(10,2);
BEGIN
  -- Obtener total de la factura original
  SELECT total INTO v_total FROM facturas WHERE id = factura_id;

  -- Sumar todas las rectificativas (pueden ser negativas)
  SELECT COALESCE(SUM(total), 0) INTO v_total_rectificativas
  FROM facturas
  WHERE factura_rectificada_id = factura_id
    AND tipo_factura = 'rectificativa';

  RETURN v_total + v_total_rectificativas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_total_neto_factura IS 'Calcula el total neto de una factura (total original + suma de rectificativas)';
