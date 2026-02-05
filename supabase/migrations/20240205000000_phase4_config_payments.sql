-- MIGRACIÓN FASE 4: CONFIGURACIÓN Y CONTROL DE PAGOS
-- Ejecutar en SQL Editor

-- 1. Asegurar función de generación de facturas usando la tabla empresa
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TEXT AS $$
DECLARE
    v_serie VARCHAR(10);
    v_ultimo_num INTEGER;
    v_nuevo_num INTEGER;
    v_resultado TEXT;
BEGIN
    -- Bloquear fila para evitar concurrencia (asumiendo 1 sola fila en empresa)
    SELECT serie_factura, ultimo_num_factura 
    INTO v_serie, v_ultimo_num
    FROM empresa
    LIMIT 1
    FOR UPDATE;

    IF v_serie IS NULL THEN
        -- Valores por defecto si no hay config
        v_serie := 'F';
        v_ultimo_num := 0;
        
        -- Auto-insertar si está vacío (seguridad)
        INSERT INTO empresa (nombre, serie_factura, ultimo_num_factura)
        SELECT 'Mi Empresa', 'F', 0
        WHERE NOT EXISTS (SELECT 1 FROM empresa);
    END IF;

    v_nuevo_num := v_ultimo_num + 1;

    -- Actualizar contador
    UPDATE empresa 
    SET ultimo_num_factura = v_nuevo_num
    WHERE id = (SELECT id FROM empresa LIMIT 1);

    -- Formatear: F25001, F25002... (Ejemplo: Serie + Año2digitos + Padding)
    -- Simplificación solicitada: Serie + Numero normal (el usuario controla el numero)
    -- Si el usuario pone 500, el siguiente es 501.
    -- Formato: SERIE + NUMERO (con padding de ceros opcional, aqui lo haremos simple)
    -- Ejemplo: F501
    
    v_resultado := v_serie || v_nuevo_num::TEXT;

    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql;


-- 2. Tabla para Historial de Pagos Fijos (Conciliación)
CREATE TABLE IF NOT EXISTS historial_pagos_fijos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pago_fijo_id UUID REFERENCES pagos_fijos(id) ON DELETE CASCADE,
    fecha_vencimiento DATE NOT NULL, -- El día 1 o el día X del mes que corresponde
    importe DECIMAL(10,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, pagado, anulado
    fecha_pago TIMESTAMPTZ,
    comprobante_url TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicados para el mismo pago y mes
    UNIQUE(pago_fijo_id, fecha_vencimiento)
);

-- Indices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_historial_pagos_estado ON historial_pagos_fijos(estado);
CREATE INDEX IF NOT EXISTS idx_historial_pagos_fecha ON historial_pagos_fijos(fecha_vencimiento);
