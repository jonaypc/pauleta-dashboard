-- MIGRACIÓN FASE 5: CÓDIGOS DE BARRAS
-- Añadir columna codigo_barras a la tabla productos

ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(50);

-- Crear índice para búsquedas rápidas (ej: escanear código) y unicidad opcional
-- (Lo hacemos UNIQUE para evitar duplicados, a menos que un mismo código se use en variantes)
-- Asumimos UNIQUE por ahora.
ALTER TABLE productos 
ADD CONSTRAINT productos_codigo_barras_key UNIQUE (codigo_barras);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos(codigo_barras);
