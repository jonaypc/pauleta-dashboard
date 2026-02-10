-- 1. Intentar hacer la columna proveedor_id en productos ON DELETE SET NULL si existe y es FK
DO $$ 
BEGIN
    -- Verificar si existe la constraint en productos
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'productos_proveedor_id_fkey') THEN
        ALTER TABLE productos DROP CONSTRAINT productos_proveedor_id_fkey;
        ALTER TABLE productos ADD CONSTRAINT productos_proveedor_id_fkey 
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;
    END IF;

    -- Verificar si existe la columna proveedor_id en productos pero sin FK (para añadirla correctamente)
    -- O si existe con otro nombre.
END $$;

-- 2. Asegurar que gastos tenga ON DELETE SET NULL o CASCADE? 
-- En gastos, si borramos proveedor, ¿borramos gasto? NO. Mejor SET NULL o impedir borrar si hay gastos.
-- Pero en el merge, movemos los gastos primero. 
-- El problema es si queda algo "colgando".

-- 3. Revisar drive_sync_log (ya tiene ON DELETE SET NULL segun migracion 20260208190000)

-- 4. Revisar si hay tablas intermedias tipo 'proveedor_producto' (no parece).
