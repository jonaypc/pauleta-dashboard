-- MIGRACION DE CORRECCION DE DATOS (DATA BACKFILL)

-- 1. Para gastos que ya estaban marcados como 'pagado' pero tienen monto_pagado = 0
--    Asumimos que el importe total fue pagado el mismo día de la factura (o fecha actual si null)

DO $$ 
DECLARE
    gasto_record RECORD;
BEGIN
    FOR gasto_record IN 
        SELECT id, fecha, importe 
        FROM gastos 
        WHERE estado = 'pagado' AND (monto_pagado IS NULL OR monto_pagado = 0)
    LOOP
        -- Insertar un pago por el total en la nueva tabla pagos_gastos
        INSERT INTO pagos_gastos (gasto_id, fecha, importe, metodo_pago, notas)
        VALUES (
            gasto_record.id,
            gasto_record.fecha, -- Usamos fecha del gasto como aproximación
            gasto_record.importe,
            'transferencia', -- Default safe method, user can change later if needed
            'Migración automática: Corrección de estado pagado'
        );
        
        -- El trigger 'trigger_update_gasto_payment' se encargará de actualizar monto_pagado automáticamente
        -- al insertar en pagos_gastos.
    END LOOP;
END $$;
