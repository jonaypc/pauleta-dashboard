-- Verificar que las columnas se crearon
SELECT 
  'Columnas nuevas' as verificacion,
  COUNT(*) as cantidad
FROM information_schema.columns 
WHERE table_name = 'facturas' 
  AND column_name IN ('tipo_factura', 'factura_rectificada_id', 'motivo_rectificacion', 'fecha_factura_rectificada');
