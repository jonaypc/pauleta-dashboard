-- Verificar la factura rectificativa que creaste
SELECT
  numero,
  fecha,
  tipo_factura,
  base_imponible,
  igic,
  total,
  motivo_rectificacion
FROM facturas
WHERE tipo_factura = 'rectificativa'
ORDER BY created_at DESC
LIMIT 5;

-- Ver las líneas de la rectificativa
SELECT
  f.numero as factura,
  lf.descripcion,
  lf.cantidad,
  lf.precio_unitario,
  lf.igic as igic_porcentaje,
  lf.subtotal
FROM facturas f
JOIN lineas_factura lf ON lf.factura_id = f.id
WHERE f.tipo_factura = 'rectificativa'
ORDER BY f.created_at DESC, lf.created_at
LIMIT 10;
