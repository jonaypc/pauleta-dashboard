-- Habilitar RLS en tablas de facturación (por seguridad)
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen para evitar conflictos
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON facturas;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON facturas;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON facturas;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON facturas;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON lineas_factura;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON lineas_factura;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON lineas_factura;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON lineas_factura;

-- Crear políticas para facturas (CRUD completo para usuarios autenticados)
CREATE POLICY "Enable read access for authenticated users" ON facturas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON facturas
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON facturas
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON facturas
    FOR DELETE TO authenticated USING (true);

-- Crear políticas para líneas de factura (CRUD completo para usuarios autenticados)
CREATE POLICY "Enable read access for authenticated users" ON lineas_factura
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON lineas_factura
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON lineas_factura
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON lineas_factura
    FOR DELETE TO authenticated USING (true);
