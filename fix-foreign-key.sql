-- Script para crear la foreign key que falta
-- Ejecuta esto en Supabase SQL Editor

-- 1. Verificar estado actual de la columna
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'facturas'
  AND column_name = 'factura_rectificada_id';

-- 2. Verificar si ya existe la FK (debería dar 0 resultados)
SELECT
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'facturas'
  AND constraint_name = 'facturas_factura_rectificada_id_fkey';

-- 3. CREAR la foreign key constraint
ALTER TABLE facturas
  ADD CONSTRAINT facturas_factura_rectificada_id_fkey
  FOREIGN KEY (factura_rectificada_id)
  REFERENCES facturas(id)
  ON DELETE SET NULL;

-- 4. Verificar que se creó correctamente
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'facturas'
  AND tc.constraint_name = 'facturas_factura_rectificada_id_fkey';

-- 5. Verificar índice (debería existir)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'facturas'
  AND indexname = 'idx_facturas_rectificativas';
