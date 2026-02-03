
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

function loadEnv() {
    const envPath = path.join(process.cwd(), ".env.local")
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8")
        envContent.split("\n").forEach(line => {
            const match = line.match(/^([^#\s=]+)="?([^"\r\n]*)"?/)
            if (match) {
                const [_, key, value] = match
                process.env[key] = value
            }
        })
    }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

async function updateSchema() {
    // Note: Supabase JS client cannot run ALTER TABLE directly.
    // I will use a custom RPC or just assume the user will run the SQL.
    // However, I can check if the columns exist or try to use them.
    console.log("SQL to execute in Supabase SQL Editor:")
    console.log(`
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock DECIMAL(10,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo DECIMAL(10,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS multiplicador_stock INTEGER DEFAULT 1;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS vinculado_a_id UUID REFERENCES productos(id);

-- Trigger function for stock management
CREATE OR REPLACE FUNCTION manejar_stock_linea_factura()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se inserta una línea
    IF (TG_OP = 'INSERT') THEN
        IF NEW.producto_id IS NOT NULL THEN
            UPDATE productos 
            SET stock = stock - (NEW.cantidad * COALESCE((SELECT multiplicador_stock FROM productos WHERE id = NEW.producto_id), 1))
            WHERE id = COALESCE((SELECT vinculado_a_id FROM productos WHERE id = NEW.producto_id), NEW.producto_id);
        END IF;
    END IF;

    -- Cuando se actualiza (ajuste de diferencia)
    IF (TG_OP = 'UPDATE') THEN
        -- Revertir anterior
        IF OLD.producto_id IS NOT NULL THEN
            UPDATE productos 
            SET stock = stock + (OLD.cantidad * COALESCE((SELECT multiplicador_stock FROM productos WHERE id = OLD.producto_id), 1))
            WHERE id = COALESCE((SELECT vinculado_a_id FROM productos WHERE id = OLD.producto_id), OLD.producto_id);
        END IF;
        -- Aplicar nuevo
        IF NEW.producto_id IS NOT NULL THEN
            UPDATE productos 
            SET stock = stock - (NEW.cantidad * COALESCE((SELECT multiplicador_stock FROM productos WHERE id = NEW.producto_id), 1))
            WHERE id = COALESCE((SELECT vinculado_a_id FROM productos WHERE id = NEW.producto_id), NEW.producto_id);
        END IF;
    END IF;

    -- Cuando se borra
    IF (TG_OP = 'DELETE') THEN
        IF OLD.producto_id IS NOT NULL THEN
            UPDATE productos 
            SET stock = stock + (OLD.cantidad * COALESCE((SELECT multiplicador_stock FROM productos WHERE id = OLD.producto_id), 1))
            WHERE id = COALESCE((SELECT vinculado_a_id FROM productos WHERE id = OLD.producto_id), OLD.producto_id);
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_manejar_stock ON lineas_factura;
CREATE TRIGGER tr_manejar_stock
AFTER INSERT OR UPDATE OR DELETE ON lineas_factura
FOR EACH ROW EXECUTE FUNCTION manejar_stock_linea_factura();
    `)
}

updateSchema()
