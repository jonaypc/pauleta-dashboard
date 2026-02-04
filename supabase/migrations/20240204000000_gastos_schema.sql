-- Create Proveedores table
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  cif VARCHAR(20),
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(255),
  categoria_default VARCHAR(100), -- Para sugerir categoría automática
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Gastos table
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50), -- Nº de factura proveedor
  proveedor_id UUID REFERENCES proveedores(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  importe DECIMAL(10,2) NOT NULL, -- Total
  base_imponible DECIMAL(10,2),
  impuestos DECIMAL(10,2),
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, pagado
  metodo_pago VARCHAR(50), -- transferencia, tarjeta, efectivo, domiciliacion
  categoria VARCHAR(100), -- Materia prima, Alquiler, Suministros, etc.
  archivo_url TEXT, -- URL del PDF/Imagen en Storage
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Policies for Proveedores
CREATE POLICY "Proveedores visibles para admin/empleado" ON proveedores
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Proveedores editables para admin" ON proveedores
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Proveedores actualizables para admin" ON proveedores
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for Gastos
CREATE POLICY "Gastos visibles para admin/empleado" ON gastos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Gastos insertables para admin" ON gastos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Gastos actualizables para admin" ON gastos
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Gastos eliminables para admin" ON gastos
  FOR DELETE USING (auth.role() = 'authenticated');

-- Storage Bucket for 'gastos'
-- Note: Bucket creation is usually manual or via client-side if policy allows, 
-- but we can insert into storage.buckets if using Supabase locally or if we have permissions.
-- Safe fallback: Users typically create buckets in Dashboard. 
-- We will try to create policies assuming bucket 'gastos' exists.

create policy "Gastos visibles para autenticados"
  on storage.objects for select
  using ( bucket_id = 'gastos' and auth.role() = 'authenticated' );

create policy "Gastos subibles para autenticados"
  on storage.objects for insert
  with check ( bucket_id = 'gastos' and auth.role() = 'authenticated' );

create policy "Gastos actualizables para autenticados"
  on storage.objects for update
  using ( bucket_id = 'gastos' and auth.role() = 'authenticated' );
