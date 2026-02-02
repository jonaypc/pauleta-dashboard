-- ===========================================
-- PAULETA CANARIA - ESQUEMA DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- ===========================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- TABLA: empresa (configuración)
-- ===========================================
CREATE TABLE IF NOT EXISTS empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL DEFAULT 'Pauleta Canaria S.L.',
  cif VARCHAR(20) DEFAULT 'B70853163',
  direccion TEXT,
  codigo_postal VARCHAR(10),
  ciudad VARCHAR(100) DEFAULT 'Las Palmas de Gran Canaria',
  provincia VARCHAR(100) DEFAULT 'Las Palmas',
  telefono VARCHAR(20),
  email VARCHAR(255),
  cuenta_bancaria VARCHAR(34) DEFAULT 'ES96 3058 6109 1427 2001 9948',
  logo_url TEXT,
  serie_factura VARCHAR(10) DEFAULT 'F',
  ultimo_num_factura INTEGER DEFAULT 0,
  igic_default DECIMAL(4,2) DEFAULT 7.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- TABLA: usuarios
-- ===========================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'empleado' CHECK (rol IN ('admin', 'empleado')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- TABLA: clientes
-- ===========================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  cif VARCHAR(20),
  direccion TEXT,
  codigo_postal VARCHAR(10),
  ciudad VARCHAR(100),
  provincia VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(255),
  persona_contacto VARCHAR(255),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda por nombre
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);

-- ===========================================
-- TABLA: productos
-- ===========================================
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(20) DEFAULT 'unidad' CHECK (unidad IN ('unidad', 'caja', 'kg')),
  igic DECIMAL(4,2) DEFAULT 7.00,
  categoria VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- ===========================================
-- TABLA: facturas
-- ===========================================
CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(20) NOT NULL UNIQUE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  base_imponible DECIMAL(10,2) NOT NULL DEFAULT 0,
  igic DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'emitida', 'cobrada', 'anulada')),
  fecha_vencimiento DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);

-- ===========================================
-- TABLA: lineas_factura
-- ===========================================
CREATE TABLE IF NOT EXISTS lineas_factura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  descripcion VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  igic DECIMAL(4,2) DEFAULT 7.00,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lineas_factura_factura ON lineas_factura(factura_id);

-- ===========================================
-- TABLA: cobros
-- ===========================================
CREATE TABLE IF NOT EXISTS cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  importe DECIMAL(10,2) NOT NULL,
  metodo VARCHAR(50) CHECK (metodo IN ('transferencia', 'efectivo', 'bizum', 'tarjeta')),
  referencia VARCHAR(100),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cobros_factura ON cobros(factura_id);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha ON cobros(fecha DESC);

-- ===========================================
-- TABLA: pagos_fijos
-- ===========================================
CREATE TABLE IF NOT EXISTS pagos_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto VARCHAR(255) NOT NULL,
  dia_inicio INTEGER NOT NULL CHECK (dia_inicio >= 1 AND dia_inicio <= 31),
  dia_fin INTEGER NOT NULL CHECK (dia_fin >= 1 AND dia_fin <= 31),
  importe DECIMAL(10,2) NOT NULL DEFAULT 0,
  variable BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- TABLA: notificaciones
-- ===========================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) CHECK (tipo IN ('pago_proximo', 'factura_vencida', 'factura_emitida', 'cobro_registrado')),
  mensaje TEXT,
  enviada BOOLEAN DEFAULT false,
  fecha_envio TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(created_at DESC);

-- ===========================================
-- FUNCIONES Y TRIGGERS
-- ===========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_empresa_updated_at ON empresa;
CREATE TRIGGER update_empresa_updated_at
    BEFORE UPDATE ON empresa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_productos_updated_at ON productos;
CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facturas_updated_at ON facturas;
CREATE TRIGGER update_facturas_updated_at
    BEFORE UPDATE ON facturas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pagos_fijos_updated_at ON pagos_fijos;
CREATE TRIGGER update_pagos_fijos_updated_at
    BEFORE UPDATE ON pagos_fijos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- FUNCIÓN: Generar número de factura
-- ===========================================
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TEXT AS $$
DECLARE
    v_empresa_id UUID;
    v_serie VARCHAR(10);
    v_numero INTEGER;
    v_year VARCHAR(2);
    v_factura_numero TEXT;
BEGIN
    -- Obtener configuración de empresa
    SELECT id, serie_factura, ultimo_num_factura + 1
    INTO v_empresa_id, v_serie, v_numero
    FROM empresa
    LIMIT 1;
    
    -- Si no hay configuración, usar valores por defecto
    IF v_serie IS NULL THEN
        v_serie := 'F';
        v_numero := 1;
    END IF;
    
    -- Obtener año actual (2 dígitos)
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Generar número de factura
    v_factura_numero := v_serie || v_year || LPAD(v_numero::TEXT, 4, '0');
    
    -- Actualizar contador en empresa
    IF v_empresa_id IS NOT NULL THEN
        UPDATE empresa SET ultimo_num_factura = v_numero WHERE id = v_empresa_id;
    END IF;
    
    RETURN v_factura_numero;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCIÓN: Calcular totales de factura
-- ===========================================
CREATE OR REPLACE FUNCTION calcular_totales_factura(p_factura_id UUID)
RETURNS VOID AS $$
DECLARE
    v_base DECIMAL(10,2);
    v_igic DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    -- Calcular base imponible
    SELECT COALESCE(SUM(subtotal), 0)
    INTO v_base
    FROM lineas_factura
    WHERE factura_id = p_factura_id;
    
    -- Calcular IGIC
    SELECT COALESCE(SUM(subtotal * (igic / 100)), 0)
    INTO v_igic
    FROM lineas_factura
    WHERE factura_id = p_factura_id;
    
    -- Calcular total
    v_total := v_base + v_igic;
    
    -- Actualizar factura
    UPDATE facturas
    SET base_imponible = v_base,
        igic = v_igic,
        total = v_total
    WHERE id = p_factura_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular totales al modificar líneas
CREATE OR REPLACE FUNCTION trigger_recalcular_factura()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calcular_totales_factura(OLD.factura_id);
        RETURN OLD;
    ELSE
        PERFORM calcular_totales_factura(NEW.factura_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lineas_factura_totales ON lineas_factura;
CREATE TRIGGER trigger_lineas_factura_totales
    AFTER INSERT OR UPDATE OR DELETE ON lineas_factura
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalcular_factura();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_fijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden ver empresa" ON empresa
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins pueden modificar empresa" ON empresa
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin')
    );

CREATE POLICY "Usuarios autenticados pueden ver usuarios" ON usuarios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden ver su propio perfil" ON usuarios
    FOR ALL TO authenticated USING (id = auth.uid());

CREATE POLICY "Usuarios autenticados pueden ver clientes" ON clientes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar clientes" ON clientes
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver productos" ON productos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar productos" ON productos
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver facturas" ON facturas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar facturas" ON facturas
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver lineas_factura" ON lineas_factura
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar lineas_factura" ON lineas_factura
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver cobros" ON cobros
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar cobros" ON cobros
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver pagos_fijos" ON pagos_fijos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar pagos_fijos" ON pagos_fijos
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden ver notificaciones" ON notificaciones
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar notificaciones" ON notificaciones
    FOR ALL TO authenticated USING (true);

-- ===========================================
-- DATOS INICIALES
-- ===========================================

-- Insertar configuración de empresa por defecto
INSERT INTO empresa (
    nombre, 
    cif, 
    cuenta_bancaria, 
    ciudad, 
    provincia,
    serie_factura,
    ultimo_num_factura,
    igic_default
) VALUES (
    'Pauleta Canaria S.L.',
    'B70853163',
    'ES96 3058 6109 1427 2001 9948',
    'Las Palmas de Gran Canaria',
    'Las Palmas',
    'F',
    0,
    7.00
) ON CONFLICT DO NOTHING;

-- Insertar productos iniciales (sabores de helado)
INSERT INTO productos (nombre, descripcion, precio, unidad, igic, categoria) VALUES
    ('Polo de Fresa', 'Polo artesanal de fresa natural', 1.50, 'unidad', 7.00, 'Helados'),
    ('Polo de Mango', 'Polo artesanal de mango natural', 1.50, 'unidad', 7.00, 'Helados'),
    ('Polo de Frutos Rojos', 'Polo artesanal de frutos rojos', 1.50, 'unidad', 7.00, 'Helados'),
    ('Polo de Pera-Piña', 'Polo artesanal de pera y piña', 1.50, 'unidad', 7.00, 'Helados'),
    ('Polo de Melón', 'Polo artesanal de melón natural', 1.50, 'unidad', 7.00, 'Helados'),
    ('Polo de Kiwi-Manzana-Uva', 'Polo artesanal de kiwi, manzana y uva', 1.50, 'unidad', 7.00, 'Helados')
ON CONFLICT DO NOTHING;

-- Insertar algunos clientes de ejemplo
INSERT INTO clientes (nombre, cif, ciudad, provincia) VALUES
    ('Allday Stores SL', NULL, 'Las Palmas de Gran Canaria', 'Las Palmas'),
    ('Origen Hookah (Guachinche Motor Grande)', NULL, NULL, NULL),
    ('Supergolf SL', NULL, NULL, NULL),
    ('Cooperativa de Autotaxis de Mogán', NULL, 'Mogán', 'Las Palmas'),
    ('Ocio Tablero S.L.', NULL, NULL, NULL),
    ('Estación Autopista Sur 77177 SL', NULL, NULL, NULL),
    ('Estación Juan Grande Pk 42 SL', NULL, 'Juan Grande', 'Las Palmas'),
    ('Hocisa Costa Canaria S.L.U.', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Insertar pagos fijos de ejemplo
INSERT INTO pagos_fijos (concepto, dia_inicio, dia_fin, importe, variable) VALUES
    ('Alquiler fábrica', 1, 5, 800.00, false),
    ('Luz', 10, 15, 0, true),
    ('Teléfono/Internet', 5, 10, 45.00, false),
    ('Seguro', 1, 5, 150.00, false),
    ('Autónomo', 25, 30, 300.00, false)
ON CONFLICT DO NOTHING;

-- ===========================================
-- FUNCIÓN: Crear usuario en tabla usuarios después del registro
-- ===========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nombre, rol)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        'empleado'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear usuario automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- MENSAJE FINAL
-- ===========================================
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos de Pauleta Canaria configurada correctamente';
    RAISE NOTICE '📋 Tablas creadas: empresa, usuarios, clientes, productos, facturas, lineas_factura, cobros, pagos_fijos, notificaciones';
    RAISE NOTICE '🔒 Row Level Security habilitado';
    RAISE NOTICE '📦 Datos iniciales insertados';
END $$;
