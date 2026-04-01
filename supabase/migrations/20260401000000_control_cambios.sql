-- ===========================================
-- TABLA: control_cambios (cabecera)
-- ===========================================
CREATE TABLE IF NOT EXISTS control_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  total_retirado DECIMAL(10,2) DEFAULT 0,
  total_entregado DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- TABLA: lineas_control_cambios (líneas)
-- ===========================================
CREATE TABLE IF NOT EXISTS lineas_control_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_cambio_id UUID NOT NULL REFERENCES control_cambios(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  descripcion VARCHAR(255) NOT NULL,
  cantidad_retirada DECIMAL(10,2) NOT NULL DEFAULT 0,
  motivo VARCHAR(255),
  cantidad_entregada DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- RLS
-- ===========================================
ALTER TABLE control_cambios ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_control_cambios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver control_cambios" ON control_cambios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar control_cambios" ON control_cambios
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver lineas_control_cambios" ON lineas_control_cambios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar lineas_control_cambios" ON lineas_control_cambios
    FOR ALL TO authenticated USING (true);

-- ===========================================
-- TRIGGER: recalcular totales
-- ===========================================
CREATE OR REPLACE FUNCTION recalcular_control_cambio()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE control_cambios SET
    total_retirado = COALESCE((
      SELECT SUM(cantidad_retirada) FROM lineas_control_cambios
      WHERE control_cambio_id = COALESCE(NEW.control_cambio_id, OLD.control_cambio_id)
    ), 0),
    total_entregado = COALESCE((
      SELECT SUM(cantidad_entregada) FROM lineas_control_cambios
      WHERE control_cambio_id = COALESCE(NEW.control_cambio_id, OLD.control_cambio_id)
    ), 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.control_cambio_id, OLD.control_cambio_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lineas_control_cambios_totales
    AFTER INSERT OR UPDATE OR DELETE ON lineas_control_cambios
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_control_cambio();
