-- Añadir campos de dirección de entrega a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_entrega TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cp_entrega VARCHAR(10);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ciudad_entrega VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS provincia_entrega VARCHAR(100);
