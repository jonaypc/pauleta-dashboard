-- ===========================================
-- PAULETA CANARIA - MÓDULO DE PRODUCCIÓN
-- FASE 1: Materias Primas y Órdenes de Producción
-- ===========================================

-- ===========================================
-- TABLA: materias_primas
-- ===========================================
CREATE TABLE IF NOT EXISTS materias_primas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL CHECK (categoria IN ('fruta', 'insumo', 'embalaje', 'otro')),
  unidad_medida VARCHAR(20) NOT NULL CHECK (unidad_medida IN ('kg', 'litros', 'unidades', 'gramos', 'ml')),
  stock_actual DECIMAL(10,2) DEFAULT 0,
  stock_minimo DECIMAL(10,2) DEFAULT 0,
  stock_maximo DECIMAL(10,2),
  costo_promedio DECIMAL(10,2) DEFAULT 0,
  ultimo_costo DECIMAL(10,2),
  proveedor_principal_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  requiere_refrigeracion BOOLEAN DEFAULT false,
  dias_caducidad INTEGER,
  temperatura_almacenamiento DECIMAL(5,2),
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_materias_primas_codigo ON materias_primas(codigo);
CREATE INDEX idx_materias_primas_categoria ON materias_primas(categoria);
CREATE INDEX idx_materias_primas_activo ON materias_primas(activo);
CREATE INDEX idx_materias_primas_stock ON materias_primas(stock_actual);

-- ===========================================
-- TABLA: recetas (BOM - Bill of Materials)
-- ===========================================
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  version INTEGER DEFAULT 1,
  descripcion TEXT,
  rendimiento DECIMAL(10,2) NOT NULL DEFAULT 1, -- Unidades producidas con esta receta
  tiempo_preparacion INTEGER, -- Minutos
  tiempo_congelacion INTEGER, -- Minutos
  activa BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(producto_id, version)
);

CREATE INDEX idx_recetas_producto ON recetas(producto_id);
CREATE INDEX idx_recetas_activa ON recetas(activa);

-- ===========================================
-- TABLA: receta_ingredientes
-- ===========================================
CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  materia_prima_id UUID NOT NULL REFERENCES materias_primas(id) ON DELETE RESTRICT,
  cantidad DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  costo_unitario DECIMAL(10,2),
  es_opcional BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receta_ingredientes_receta ON receta_ingredientes(receta_id);
CREATE INDEX idx_receta_ingredientes_materia ON receta_ingredientes(materia_prima_id);

-- ===========================================
-- TABLA: ordenes_produccion
-- ===========================================
CREATE TABLE IF NOT EXISTS ordenes_produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) UNIQUE NOT NULL,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  receta_id UUID REFERENCES recetas(id) ON DELETE SET NULL,
  cantidad_planificada DECIMAL(10,2) NOT NULL,
  cantidad_producida DECIMAL(10,2) DEFAULT 0,
  cantidad_rechazada DECIMAL(10,2) DEFAULT 0,
  cantidad_aprobada DECIMAL(10,2) DEFAULT 0,
  fecha_planificada DATE NOT NULL,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  estado VARCHAR(20) DEFAULT 'planificada' CHECK (estado IN ('planificada', 'en_proceso', 'completada', 'cancelada', 'pausada')),
  prioridad INTEGER DEFAULT 5 CHECK (prioridad >= 1 AND prioridad <= 10),
  operario_responsable VARCHAR(255),
  turno VARCHAR(20) CHECK (turno IN ('mañana', 'tarde', 'noche')),
  costo_materias_primas DECIMAL(10,2) DEFAULT 0,
  costo_mano_obra DECIMAL(10,2) DEFAULT 0,
  costo_total DECIMAL(10,2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ordenes_produccion_numero ON ordenes_produccion(numero);
CREATE INDEX idx_ordenes_produccion_producto ON ordenes_produccion(producto_id);
CREATE INDEX idx_ordenes_produccion_estado ON ordenes_produccion(estado);
CREATE INDEX idx_ordenes_produccion_fecha ON ordenes_produccion(fecha_planificada DESC);

-- ===========================================
-- TABLA: lotes_produccion
-- ===========================================
CREATE TABLE IF NOT EXISTS lotes_produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lote VARCHAR(50) UNIQUE NOT NULL,
  orden_produccion_id UUID NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad DECIMAL(10,2) NOT NULL,
  fecha_fabricacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_caducidad DATE NOT NULL,
  estado VARCHAR(20) DEFAULT 'disponible' CHECK (estado IN ('disponible', 'reservado', 'vendido', 'caducado', 'retirado', 'en_cuarentena')),
  ubicacion_almacen VARCHAR(100),
  temperatura_almacenamiento DECIMAL(5,2),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lotes_numero ON lotes_produccion(numero_lote);
CREATE INDEX idx_lotes_orden ON lotes_produccion(orden_produccion_id);
CREATE INDEX idx_lotes_producto ON lotes_produccion(producto_id);
CREATE INDEX idx_lotes_estado ON lotes_produccion(estado);
CREATE INDEX idx_lotes_caducidad ON lotes_produccion(fecha_caducidad);

-- ===========================================
-- TABLA: movimientos_inventario (materias primas)
-- ===========================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_prima_id UUID NOT NULL REFERENCES materias_primas(id) ON DELETE RESTRICT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'merma', 'devolucion')),
  cantidad DECIMAL(10,2) NOT NULL,
  costo_unitario DECIMAL(10,2),
  costo_total DECIMAL(10,2),
  stock_anterior DECIMAL(10,2),
  stock_nuevo DECIMAL(10,2),
  referencia_id UUID, -- orden_produccion_id, compra_id, etc.
  referencia_tipo VARCHAR(50), -- 'orden_produccion', 'compra', 'ajuste_manual'
  lote_proveedor VARCHAR(100),
  fecha_caducidad DATE,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  usuario_id UUID,
  motivo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movimientos_materia ON movimientos_inventario(materia_prima_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_inventario(tipo);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha DESC);
CREATE INDEX idx_movimientos_referencia ON movimientos_inventario(referencia_id, referencia_tipo);

-- ===========================================
-- TABLA: ordenes_compra (materias primas)
-- ===========================================
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) UNIQUE NOT NULL,
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_esperada DATE,
  fecha_entrega_real DATE,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviada', 'confirmada', 'recibida_parcial', 'recibida', 'cancelada')),
  subtotal DECIMAL(10,2) DEFAULT 0,
  impuestos DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  metodo_pago VARCHAR(50),
  referencia_proveedor VARCHAR(100),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ordenes_compra_numero ON ordenes_compra(numero);
CREATE INDEX idx_ordenes_compra_proveedor ON ordenes_compra(proveedor_id);
CREATE INDEX idx_ordenes_compra_estado ON ordenes_compra(estado);
CREATE INDEX idx_ordenes_compra_fecha ON ordenes_compra(fecha DESC);

-- ===========================================
-- TABLA: lineas_orden_compra
-- ===========================================
CREATE TABLE IF NOT EXISTS lineas_orden_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_compra_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  materia_prima_id UUID NOT NULL REFERENCES materias_primas(id) ON DELETE RESTRICT,
  cantidad_pedida DECIMAL(10,2) NOT NULL,
  cantidad_recibida DECIMAL(10,2) DEFAULT 0,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  impuesto DECIMAL(4,2) DEFAULT 7.00,
  total DECIMAL(10,2) NOT NULL,
  lote_proveedor VARCHAR(100),
  fecha_caducidad DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lineas_orden_compra_orden ON lineas_orden_compra(orden_compra_id);
CREATE INDEX idx_lineas_orden_compra_materia ON lineas_orden_compra(materia_prima_id);

-- ===========================================
-- TABLA: inspecciones_calidad
-- ===========================================
CREATE TABLE IF NOT EXISTS inspecciones_calidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_produccion_id UUID REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  lote_produccion_id UUID REFERENCES lotes_produccion(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('materia_prima', 'proceso', 'producto_terminado')),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  inspector VARCHAR(255),
  resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('aprobado', 'rechazado', 'condicional', 'en_revision')),
  cantidad_inspeccionada DECIMAL(10,2),
  cantidad_aprobada DECIMAL(10,2),
  cantidad_rechazada DECIMAL(10,2),
  motivo_rechazo TEXT,
  criterios_evaluados JSONB,
  observaciones TEXT,
  acciones_correctivas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspecciones_orden ON inspecciones_calidad(orden_produccion_id);
CREATE INDEX idx_inspecciones_lote ON inspecciones_calidad(lote_produccion_id);
CREATE INDEX idx_inspecciones_tipo ON inspecciones_calidad(tipo);
CREATE INDEX idx_inspecciones_resultado ON inspecciones_calidad(resultado);

-- ===========================================
-- TABLA: lote_materias_primas (trazabilidad)
-- ===========================================
CREATE TABLE IF NOT EXISTS lote_materias_primas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_produccion_id UUID NOT NULL REFERENCES lotes_produccion(id) ON DELETE CASCADE,
  materia_prima_id UUID NOT NULL REFERENCES materias_primas(id) ON DELETE RESTRICT,
  lote_materia_prima VARCHAR(50),
  cantidad_usada DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(20),
  costo_unitario DECIMAL(10,2),
  fecha_uso TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lote_materias_lote ON lote_materias_primas(lote_produccion_id);
CREATE INDEX idx_lote_materias_materia ON lote_materias_primas(materia_prima_id);

-- ===========================================
-- FUNCIONES Y TRIGGERS
-- ===========================================

-- Trigger para updated_at
CREATE TRIGGER update_materias_primas_updated_at
    BEFORE UPDATE ON materias_primas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recetas_updated_at
    BEFORE UPDATE ON recetas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordenes_produccion_updated_at
    BEFORE UPDATE ON ordenes_produccion
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lotes_produccion_updated_at
    BEFORE UPDATE ON lotes_produccion
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordenes_compra_updated_at
    BEFORE UPDATE ON ordenes_compra
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- FUNCIÓN: Generar número de orden de producción
-- ===========================================
CREATE OR REPLACE FUNCTION generar_numero_orden_produccion()
RETURNS TEXT AS $$
DECLARE
    v_year VARCHAR(2);
    v_numero INTEGER;
    v_orden_numero TEXT;
BEGIN
    -- Obtener año actual (2 dígitos)
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Obtener el siguiente número secuencial del año
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 4) AS INTEGER)), 0) + 1
    INTO v_numero
    FROM ordenes_produccion
    WHERE numero LIKE 'OP' || v_year || '%';
    
    -- Generar número de orden
    v_orden_numero := 'OP' || v_year || LPAD(v_numero::TEXT, 4, '0');
    
    RETURN v_orden_numero;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCIÓN: Generar número de lote
-- ===========================================
CREATE OR REPLACE FUNCTION generar_numero_lote(p_producto_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_fecha VARCHAR(8);
    v_producto_codigo VARCHAR(10);
    v_secuencia INTEGER;
    v_lote_numero TEXT;
BEGIN
    -- Formato: YYYYMMDD-PROD-XXXX
    v_fecha := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Obtener código de producto (primeras 4 letras)
    SELECT UPPER(LEFT(REGEXP_REPLACE(nombre, '[^a-zA-Z]', '', 'g'), 4))
    INTO v_producto_codigo
    FROM productos
    WHERE id = p_producto_id;
    
    IF v_producto_codigo IS NULL OR v_producto_codigo = '' THEN
        v_producto_codigo := 'PROD';
    END IF;
    
    -- Obtener secuencia del día
    SELECT COALESCE(COUNT(*), 0) + 1
    INTO v_secuencia
    FROM lotes_produccion
    WHERE fecha_fabricacion = CURRENT_DATE
    AND producto_id = p_producto_id;
    
    -- Generar número de lote
    v_lote_numero := v_fecha || '-' || v_producto_codigo || '-' || LPAD(v_secuencia::TEXT, 4, '0');
    
    RETURN v_lote_numero;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCIÓN: Generar número de orden de compra
-- ===========================================
CREATE OR REPLACE FUNCTION generar_numero_orden_compra()
RETURNS TEXT AS $$
DECLARE
    v_year VARCHAR(2);
    v_numero INTEGER;
    v_orden_numero TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 4) AS INTEGER)), 0) + 1
    INTO v_numero
    FROM ordenes_compra
    WHERE numero LIKE 'OC' || v_year || '%';
    
    v_orden_numero := 'OC' || v_year || LPAD(v_numero::TEXT, 4, '0');
    
    RETURN v_orden_numero;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCIÓN: Actualizar stock de materia prima
-- ===========================================
CREATE OR REPLACE FUNCTION actualizar_stock_materia_prima()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar stock según tipo de movimiento
    IF NEW.tipo = 'entrada' OR NEW.tipo = 'devolucion' THEN
        UPDATE materias_primas
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.materia_prima_id;
    ELSIF NEW.tipo = 'salida' OR NEW.tipo = 'merma' THEN
        UPDATE materias_primas
        SET stock_actual = stock_actual - NEW.cantidad
        WHERE id = NEW.materia_prima_id;
    ELSIF NEW.tipo = 'ajuste' THEN
        -- Para ajustes, la cantidad puede ser positiva o negativa
        UPDATE materias_primas
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.materia_prima_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_stock_materia_prima
    AFTER INSERT ON movimientos_inventario
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_materia_prima();

-- ===========================================
-- FUNCIÓN: Calcular totales de orden de compra
-- ===========================================
CREATE OR REPLACE FUNCTION calcular_totales_orden_compra()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(10,2);
    v_impuestos DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(subtotal * (impuesto / 100)), 0)
    INTO v_subtotal, v_impuestos
    FROM lineas_orden_compra
    WHERE orden_compra_id = COALESCE(NEW.orden_compra_id, OLD.orden_compra_id);
    
    v_total := v_subtotal + v_impuestos;
    
    UPDATE ordenes_compra
    SET subtotal = v_subtotal,
        impuestos = v_impuestos,
        total = v_total
    WHERE id = COALESCE(NEW.orden_compra_id, OLD.orden_compra_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_totales_orden_compra
    AFTER INSERT OR UPDATE OR DELETE ON lineas_orden_compra
    FOR EACH ROW
    EXECUTE FUNCTION calcular_totales_orden_compra();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

ALTER TABLE materias_primas ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_orden_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspecciones_calidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE lote_materias_primas ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden ver materias_primas" ON materias_primas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar materias_primas" ON materias_primas
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver recetas" ON recetas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar recetas" ON recetas
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver receta_ingredientes" ON receta_ingredientes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar receta_ingredientes" ON receta_ingredientes
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver ordenes_produccion" ON ordenes_produccion
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar ordenes_produccion" ON ordenes_produccion
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver lotes_produccion" ON lotes_produccion
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar lotes_produccion" ON lotes_produccion
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver movimientos_inventario" ON movimientos_inventario
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar movimientos_inventario" ON movimientos_inventario
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver ordenes_compra" ON ordenes_compra
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar ordenes_compra" ON ordenes_compra
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver lineas_orden_compra" ON lineas_orden_compra
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar lineas_orden_compra" ON lineas_orden_compra
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver inspecciones_calidad" ON inspecciones_calidad
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar inspecciones_calidad" ON inspecciones_calidad
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver lote_materias_primas" ON lote_materias_primas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar lote_materias_primas" ON lote_materias_primas
    FOR ALL TO authenticated USING (true);

-- ===========================================
-- DATOS INICIALES
-- ===========================================

-- Insertar materias primas básicas
INSERT INTO materias_primas (codigo, nombre, categoria, unidad_medida, stock_minimo, requiere_refrigeracion, dias_caducidad) VALUES
    ('FRESA-001', 'Fresa Natural', 'fruta', 'kg', 50, true, 7),
    ('MANGO-001', 'Mango Natural', 'fruta', 'kg', 30, true, 7),
    ('KIWI-001', 'Kiwi Natural', 'fruta', 'kg', 20, true, 7),
    ('PERA-001', 'Pera Natural', 'fruta', 'kg', 20, true, 7),
    ('PINA-001', 'Piña Natural', 'fruta', 'kg', 25, true, 7),
    ('MELON-001', 'Melón Natural', 'fruta', 'kg', 30, true, 7),
    ('MANZANA-001', 'Manzana Natural', 'fruta', 'kg', 20, true, 7),
    ('UVA-001', 'Uva Natural', 'fruta', 'kg', 15, true, 7),
    ('AZUCAR-001', 'Azúcar Blanca', 'insumo', 'kg', 100, false, 365),
    ('AGUA-001', 'Agua Mineral', 'insumo', 'litros', 200, false, 180),
    ('PALITO-001', 'Palitos de Madera', 'embalaje', 'unidades', 5000, false, null),
    ('BOLSA-001', 'Bolsas Individuales', 'embalaje', 'unidades', 3000, false, null),
    ('CAJA-001', 'Cajas de Cartón (50 uds)', 'embalaje', 'unidades', 100, false, null)
ON CONFLICT (codigo) DO NOTHING;

-- Crear recetas para los productos existentes
DO $$
DECLARE
    v_producto_fresa UUID;
    v_producto_mango UUID;
    v_receta_id UUID;
    v_fresa_id UUID;
    v_mango_id UUID;
    v_azucar_id UUID;
    v_agua_id UUID;
BEGIN
    -- Obtener IDs de productos
    SELECT id INTO v_producto_fresa FROM productos WHERE nombre LIKE '%Fresa%' LIMIT 1;
    SELECT id INTO v_producto_mango FROM productos WHERE nombre LIKE '%Mango%' LIMIT 1;
    
    -- Obtener IDs de materias primas
    SELECT id INTO v_fresa_id FROM materias_primas WHERE codigo = 'FRESA-001';
    SELECT id INTO v_mango_id FROM materias_primas WHERE codigo = 'MANGO-001';
    SELECT id INTO v_azucar_id FROM materias_primas WHERE codigo = 'AZUCAR-001';
    SELECT id INTO v_agua_id FROM materias_primas WHERE codigo = 'AGUA-001';
    
    -- Crear receta para Polo de Fresa (si existe el producto)
    IF v_producto_fresa IS NOT NULL AND v_fresa_id IS NOT NULL THEN
        INSERT INTO recetas (producto_id, nombre, version, rendimiento, tiempo_preparacion, tiempo_congelacion, activa)
        VALUES (v_producto_fresa, 'Receta Estándar Polo de Fresa', 1, 100, 30, 240, true)
        RETURNING id INTO v_receta_id;
        
        -- Ingredientes para 100 polos de fresa
        INSERT INTO receta_ingredientes (receta_id, materia_prima_id, cantidad, unidad) VALUES
            (v_receta_id, v_fresa_id, 5.0, 'kg'),
            (v_receta_id, v_azucar_id, 1.5, 'kg'),
            (v_receta_id, v_agua_id, 3.0, 'litros');
    END IF;
    
    -- Crear receta para Polo de Mango (si existe el producto)
    IF v_producto_mango IS NOT NULL AND v_mango_id IS NOT NULL THEN
        INSERT INTO recetas (producto_id, nombre, version, rendimiento, tiempo_preparacion, tiempo_congelacion, activa)
        VALUES (v_producto_mango, 'Receta Estándar Polo de Mango', 1, 100, 30, 240, true)
        RETURNING id INTO v_receta_id;
        
        -- Ingredientes para 100 polos de mango
        INSERT INTO receta_ingredientes (receta_id, materia_prima_id, cantidad, unidad) VALUES
            (v_receta_id, v_mango_id, 6.0, 'kg'),
            (v_receta_id, v_azucar_id, 1.2, 'kg'),
            (v_receta_id, v_agua_id, 2.5, 'litros');
    END IF;
END $$;

-- ===========================================
-- MENSAJE FINAL
-- ===========================================
DO $$
BEGIN
    RAISE NOTICE '✅ Módulo de Producción - Fase 1 instalado correctamente';
    RAISE NOTICE '📦 Tablas creadas: materias_primas, recetas, receta_ingredientes, ordenes_produccion, lotes_produccion';
    RAISE NOTICE '📦 Tablas creadas: movimientos_inventario, ordenes_compra, lineas_orden_compra, inspecciones_calidad';
    RAISE NOTICE '🔒 Row Level Security habilitado';
    RAISE NOTICE '📊 Datos iniciales de materias primas insertados';
    RAISE NOTICE '🍓 Recetas de ejemplo creadas';
END $$;
