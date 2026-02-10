-- 1. Listar todas las tablas que tienen Foreign Key a 'proveedores'
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='proveedores';

-- 2. Intentar buscar dependencias huérfanas o tablas no migradas (ej: productos antiguos)
-- Si 'productos' tiene 'proveedor_id' pero no FK explícita, no bloquaría el delete... 
-- PERO si tiene FK, bloquearía. Verificar columns de productos.
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'productos';
