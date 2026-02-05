
-- MIGRRACIÓN PARA CONTROL DE INVENTARIO (STOCKS)
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Añadir columnas a la tabla de productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock DECIMAL(10,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo DECIMAL(10,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS multiplicador_stock INTEGER DEFAULT 1;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS vinculado_a_id UUID REFERENCES productos(id);

-- 2. Función para manejar el descuento automático de stock
CREATE OR REPLACE FUNCTION manejar_stock_linea_factura()
RETURNS TRIGGER AS $$
DECLARE
    v_producto_id UUID;
    v_multiplicador INTEGER;
    v_target_id UUID;
BEGIN
    -- Determinar producto y multiplicador
    IF (TG_OP = 'DELETE') THEN
        v_producto_id := OLD.producto_id;
    ELSE
        v_producto_id := NEW.producto_id;
    END IF;

    IF v_producto_id IS NOT NULL THEN
        -- Obtener multiplicador y vinculación
        SELECT multiplicador_stock, COALESCE(vinculado_a_id, id) 
        INTO v_multiplicador, v_target_id
        FROM productos 
        WHERE id = v_producto_id;

        -- Ajustar stock según operación
        IF (TG_OP = 'INSERT') THEN
            UPDATE productos SET stock = stock - (NEW.cantidad * v_multiplicador) WHERE id = v_target_id;
        ELSIF (TG_OP = 'UPDATE') THEN
            -- Revertir antiguo, aplicar nuevo (solo si cambió cantidad o producto)
            UPDATE productos SET stock = stock + (OLD.cantidad * v_multiplicador) WHERE id = v_target_id;
            UPDATE productos SET stock = stock - (NEW.cantidad * v_multiplicador) WHERE id = v_target_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE productos SET stock = stock + (OLD.cantidad * v_multiplicador) WHERE id = v_target_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear el trigger
DROP TRIGGER IF EXISTS tr_manejar_stock ON lineas_factura;
CREATE TRIGGER tr_manejar_stock
AFTER INSERT OR UPDATE OR DELETE ON lineas_factura
FOR EACH ROW EXECUTE FUNCTION manejar_stock_linea_factura();
