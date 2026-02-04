-- 1. Crear Tablas
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  cif VARCHAR(20),
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(255),
  categoria_default VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50),
  proveedor_id UUID REFERENCES proveedores(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  importe DECIMAL(10,2) NOT NULL,
  base_imponible DECIMAL(10,2),
  impuestos DECIMAL(10,2),
  estado VARCHAR(20) DEFAULT 'pendiente',
  metodo_pago VARCHAR(50),
  categoria VARCHAR(100),
  archivo_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Configurar Seguridad (RLS)
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Policies (Si ya existen darán error, pero no pasa nada, ignóralo)
DO $$ BEGIN
  CREATE POLICY "Proveedores visibles para admin/empleado" ON proveedores FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Proveedores editables para admin" ON proveedores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Proveedores actualizables para admin" ON proveedores FOR UPDATE USING (auth.role() = 'authenticated');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Gastos visibles para admin/empleado" ON gastos FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Gastos insertables para admin" ON gastos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Gastos actualizables para admin" ON gastos FOR UPDATE USING (auth.role() = 'authenticated');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Gastos eliminables para admin" ON gastos FOR DELETE USING (auth.role() = 'authenticated');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. Crear Bucket de Almacenamiento (Si no existe)
INSERT INTO storage.buckets (id, name, public)
SELECT 'gastos', 'gastos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'gastos');

-- 4. Policies de Almacenamiento
DO $$ BEGIN
  CREATE POLICY "Gastos Publicos Select" ON storage.objects FOR SELECT USING ( bucket_id = 'gastos' AND auth.role() = 'authenticated' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Gastos Publicos Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'gastos' AND auth.role() = 'authenticated' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;
