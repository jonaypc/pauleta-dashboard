-- 1. Ver estructura de tabla y columnas (buscando deleted_at o soft delete)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'proveedores';

-- 2. Ver triggers en la tabla proveedores
SELECT 
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'proveedores';

-- 3. Ver si hay reglas (Rules) que a veces se usan para soft delete
SELECT * FROM pg_rules WHERE tablename = 'proveedores';
