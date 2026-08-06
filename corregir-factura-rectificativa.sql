-- CORREGIR la factura rectificativa F1844 que tiene cantidades positivas
-- Ejecuta esto en Supabase SQL Editor

-- 1. Ver el estado ANTES de corregir
SELECT
  numero,
  base_imponible,
  igic,
  total,
  motivo_rectificacion
FROM facturas
WHERE numero = 'F1844';

-- Ver líneas ANTES
SELECT
  descripcion,
  cantidad,
  precio_unitario,
  subtotal
FROM lineas_factura
WHERE factura_id = (SELECT id FROM facturas WHERE numero = 'F1844');

-- 2. CORREGIR: Convertir cantidades y subtotales a negativos
UPDATE lineas_factura
SET
  cantidad = -cantidad,
  subtotal = -subtotal
WHERE factura_id = (SELECT id FROM facturas WHERE numero = 'F1844');

-- 3. CORREGIR: Recalcular totales de la factura en base a las líneas corregidas
UPDATE facturas
SET
  base_imponible = (
    SELECT SUM(cantidad * precio_unitario)
    FROM lineas_factura
    WHERE factura_id = facturas.id
  ),
  igic = (
    SELECT SUM(cantidad * precio_unitario * (igic / 100))
    FROM lineas_factura
    WHERE factura_id = facturas.id
  ),
  total = (
    SELECT SUM(subtotal)
    FROM lineas_factura
    WHERE factura_id = facturas.id
  )
WHERE numero = 'F1844';

-- 4. Verificar DESPUÉS de la corrección
SELECT
  numero,
  base_imponible,
  igic,
  total,
  motivo_rectificacion
FROM facturas
WHERE numero = 'F1844';

-- Ver líneas DESPUÉS
SELECT
  descripcion,
  cantidad,
  precio_unitario,
  subtotal
FROM lineas_factura
WHERE factura_id = (SELECT id FROM facturas WHERE numero = 'F1844');
