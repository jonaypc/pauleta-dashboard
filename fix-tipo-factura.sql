-- Script para verificar y arreglar tipo_factura en facturas existentes
-- Ejecuta esto en Supabase SQL Editor

-- 1. Verificar cuántas facturas tienen tipo_factura NULL
SELECT
  'Facturas con tipo_factura NULL' as verificacion,
  COUNT(*) as cantidad
FROM facturas
WHERE tipo_factura IS NULL;

-- 2. Verificar distribución actual
SELECT
  COALESCE(tipo_factura, 'NULL') as tipo,
  COUNT(*) as cantidad
FROM facturas
GROUP BY tipo_factura
ORDER BY cantidad DESC;

-- 3. ARREGLAR: Actualizar todas las facturas sin tipo a 'ordinaria'
UPDATE facturas
SET tipo_factura = 'ordinaria'
WHERE tipo_factura IS NULL;

-- 4. Verificar que se aplicó
SELECT
  'Después de fix' as momento,
  tipo_factura,
  COUNT(*) as cantidad
FROM facturas
GROUP BY tipo_factura;

-- 5. Verificar que la columna existe y su configuración
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'facturas'
  AND column_name = 'tipo_factura';
