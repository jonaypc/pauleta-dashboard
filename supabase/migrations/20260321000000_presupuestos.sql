-- ===========================================
-- MÓDULO DE PRESUPUESTOS
-- ===========================================

-- Añadir campos de presupuesto a empresa
ALTER TABLE empresa
    ADD COLUMN IF NOT EXISTS serie_presupuesto VARCHAR(10) DEFAULT 'P',
    ADD COLUMN IF NOT EXISTS ultimo_num_presupuesto INTEGER DEFAULT 0;

-- ===========================================
-- TABLA: Presupuestos
-- ===========================================
CREATE TABLE IF NOT EXISTS presupuestos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero VARCHAR(20) NOT NULL UNIQUE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    base_imponible DECIMAL(10,2) DEFAULT 0,
    igic DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'borrador'
        CHECK (estado IN ('borrador', 'enviado', 'aceptado', 'rechazado', 'facturado')),
    fecha_validez DATE,
    notas TEXT,
    factura_id UUID REFERENCES facturas(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- TABLA: Líneas de presupuesto
-- ===========================================
CREATE TABLE IF NOT EXISTS lineas_presupuesto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    presupuesto_id UUID NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id),
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    igic DECIMAL(5,2) NOT NULL DEFAULT 7,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ÍNDICES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_fecha ON presupuestos(fecha);
CREATE INDEX IF NOT EXISTS idx_lineas_presupuesto_presupuesto ON lineas_presupuesto(presupuesto_id);

-- ===========================================
-- TRIGGER: updated_at automático
-- ===========================================
DROP TRIGGER IF EXISTS update_presupuestos_updated_at ON presupuestos;
CREATE TRIGGER update_presupuestos_updated_at
    BEFORE UPDATE ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- FUNCIÓN: Generar número de presupuesto
-- ===========================================
CREATE OR REPLACE FUNCTION generar_numero_presupuesto()
RETURNS TEXT AS $$
DECLARE
    v_empresa_id UUID;
    v_serie VARCHAR(10);
    v_numero INTEGER;
    v_year VARCHAR(2);
    v_presupuesto_numero TEXT;
BEGIN
    SELECT id, serie_presupuesto, ultimo_num_presupuesto + 1
    INTO v_empresa_id, v_serie, v_numero
    FROM empresa
    LIMIT 1;

    IF v_serie IS NULL THEN
        v_serie := 'P';
        v_numero := 1;
    END IF;

    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    v_presupuesto_numero := v_serie || v_year || LPAD(v_numero::TEXT, 4, '0');

    IF v_empresa_id IS NOT NULL THEN
        UPDATE empresa SET ultimo_num_presupuesto = v_numero WHERE id = v_empresa_id;
    END IF;

    RETURN v_presupuesto_numero;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCIÓN: Calcular totales de presupuesto
-- ===========================================
CREATE OR REPLACE FUNCTION calcular_totales_presupuesto(p_presupuesto_id UUID)
RETURNS VOID AS $$
DECLARE
    v_base DECIMAL(10,2);
    v_igic DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(subtotal), 0)
    INTO v_base
    FROM lineas_presupuesto
    WHERE presupuesto_id = p_presupuesto_id;

    SELECT COALESCE(SUM(subtotal * (igic / 100)), 0)
    INTO v_igic
    FROM lineas_presupuesto
    WHERE presupuesto_id = p_presupuesto_id;

    v_total := v_base + v_igic;

    UPDATE presupuestos
    SET base_imponible = v_base,
        igic = v_igic,
        total = v_total
    WHERE id = p_presupuesto_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular totales al modificar líneas
CREATE OR REPLACE FUNCTION trigger_recalcular_presupuesto()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calcular_totales_presupuesto(OLD.presupuesto_id);
        RETURN OLD;
    ELSE
        PERFORM calcular_totales_presupuesto(NEW.presupuesto_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lineas_presupuesto_totales ON lineas_presupuesto;
CREATE TRIGGER trigger_lineas_presupuesto_totales
    AFTER INSERT OR UPDATE OR DELETE ON lineas_presupuesto
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalcular_presupuesto();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_presupuesto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view presupuestos"
    ON presupuestos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert presupuestos"
    ON presupuestos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update presupuestos"
    ON presupuestos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete presupuestos"
    ON presupuestos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view lineas_presupuesto"
    ON lineas_presupuesto FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lineas_presupuesto"
    ON lineas_presupuesto FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lineas_presupuesto"
    ON lineas_presupuesto FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete lineas_presupuesto"
    ON lineas_presupuesto FOR DELETE TO authenticated USING (true);
