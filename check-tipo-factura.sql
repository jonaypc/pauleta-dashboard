-- Verificar si las facturas tienen tipo_factura
SELECT 
  numero,
  estado,
  tipo_factura,
  created_at::date as fecha_creacion
FROM facturas 
ORDER BY created_at DESC 
LIMIT 10;
