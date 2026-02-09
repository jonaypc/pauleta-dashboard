-- Migration: Limpiar proveedores duplicados y añadir restricción UNIQUE
-- Versión corregida: PostgreSQL no soporta MIN() con UUID

-- 1. Primero identificamos los duplicados y el más antiguo de cada grupo
-- Usamos una subquery con ROW_NUMBER para seleccionar el "original" (el primero creado)

-- Paso 1: Actualizar gastos para que apunten al proveedor original de cada grupo
WITH provider_groups AS (
    SELECT 
        id,
        nombre,
        LOWER(TRIM(nombre)) as normalized_name,
        ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(nombre)) ORDER BY created_at ASC, id ASC) as rn
    FROM proveedores
),
originals AS (
    SELECT normalized_name, id as original_id
    FROM provider_groups
    WHERE rn = 1
),
duplicates_to_remap AS (
    SELECT pg.id as duplicate_id, o.original_id
    FROM provider_groups pg
    JOIN originals o ON pg.normalized_name = o.normalized_name
    WHERE pg.rn > 1
)
UPDATE gastos g
SET proveedor_id = d.original_id
FROM duplicates_to_remap d
WHERE g.proveedor_id = d.duplicate_id;

-- Paso 2: Eliminar los proveedores duplicados (mantener solo el original)
WITH provider_groups AS (
    SELECT 
        id,
        LOWER(TRIM(nombre)) as normalized_name,
        ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(nombre)) ORDER BY created_at ASC, id ASC) as rn
    FROM proveedores
)
DELETE FROM proveedores
WHERE id IN (
    SELECT id FROM provider_groups WHERE rn > 1
);

-- Paso 3: Normalizar nombres existentes (trim espacios)
UPDATE proveedores
SET nombre = TRIM(nombre)
WHERE nombre != TRIM(nombre);

-- Paso 4: Crear índice único para prevenir duplicados futuros (case-insensitive)
DROP INDEX IF EXISTS idx_proveedores_nombre_unique;

CREATE UNIQUE INDEX idx_proveedores_nombre_unique 
ON proveedores (LOWER(TRIM(nombre)));
