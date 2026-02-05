
-- MIGRRACIÓN PARA GESTIÓN DE COBROS AUTOMATIZADA
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Función para recalcular el estado de la factura basándose en los cobros
CREATE OR REPLACE FUNCTION manejar_estado_factura_por_cobro()
RETURNS TRIGGER AS $$
DECLARE
    v_factura_id UUID;
    v_total_factura DECIMAL(10,2);
    v_total_cobrado DECIMAL(10,2);
    v_estado_actual VARCHAR(20);
BEGIN
    -- Determinar el ID de la factura afectada
    IF (TG_OP = 'DELETE') THEN
        v_factura_id := OLD.factura_id;
    ELSE
        v_factura_id := NEW.factura_id;
    END IF;

    -- Obtener el total de la factura y su estado actual
    SELECT total, estado INTO v_total_factura, v_estado_actual
    FROM facturas
    WHERE id = v_factura_id;

    -- Calcular la suma de todos los cobros de esa factura
    SELECT COALESCE(SUM(importe), 0) INTO v_total_cobrado
    FROM cobros
    WHERE factura_id = v_factura_id;

    -- Lógica de cambio de estado
    -- Solo cambiamos si la factura está 'emitida' o 'cobrada'
    -- (No tocamos 'borrador' o 'anulada' automáticamente por seguridad)
    IF v_estado_actual IN ('emitida', 'cobrada') THEN
        IF v_total_cobrado >= v_total_factura THEN
            UPDATE facturas SET estado = 'cobrada' WHERE id = v_factura_id;
        ELSE
            UPDATE facturas SET estado = 'emitida' WHERE id = v_factura_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear el trigger
DROP TRIGGER IF EXISTS tr_manejar_estado_factura_cobros ON cobros;
CREATE TRIGGER tr_manejar_estado_factura_cobros
AFTER INSERT OR UPDATE OR DELETE ON cobros
FOR EACH ROW EXECUTE FUNCTION manejar_estado_estado_factura_por_cobro();

-- Corrección: hubo un pequeño error de nombre en el trigger de arriba, lo arreglo:
CREATE OR REPLACE FUNCTION manejar_estado_factura_por_cobro()
RETURNS TRIGGER AS $$
DECLARE
    v_factura_id UUID;
    v_total_factura DECIMAL(10,2);
    v_total_cobrado DECIMAL(10,2);
    v_estado_actual VARCHAR(20);
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_factura_id := OLD.factura_id;
    ELSE
        v_factura_id := NEW.factura_id;
    END IF;

    SELECT total, estado INTO v_total_factura, v_estado_actual FROM facturas WHERE id = v_factura_id;
    SELECT COALESCE(SUM(importe), 0) INTO v_total_cobrado FROM cobros WHERE factura_id = v_factura_id;

    IF v_estado_actual IN ('emitida', 'cobrada') THEN
        IF v_total_cobrado >= v_total_factura AND v_total_factura > 0 THEN
            UPDATE facturas SET estado = 'cobrada' WHERE id = v_factura_id;
        ELSIF v_total_cobrado < v_total_factura THEN
            UPDATE facturas SET estado = 'emitida' WHERE id = v_factura_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_manejar_estado_factura_cobros ON cobros;
CREATE TRIGGER tr_manejar_estado_factura_cobros
AFTER INSERT OR UPDATE OR DELETE ON cobros
FOR EACH ROW EXECUTE FUNCTION manejar_estado_factura_por_cobro();
