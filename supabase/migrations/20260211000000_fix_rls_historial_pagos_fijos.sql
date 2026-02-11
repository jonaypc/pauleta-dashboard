-- Migration: Enable RLS and add basic policies for historial_pagos_fijos
-- This fixes the security vulnerability where the table was public without RLS

-- 1. Enable RLS
ALTER TABLE IF EXISTS "public"."historial_pagos_fijos" ENABLE ROW LEVEL SECURITY;

-- 2. Add policies for authenticated users (Full Access)
DO $$
BEGIN
    -- SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'historial_pagos_fijos' AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users" 
        ON "public"."historial_pagos_fijos" 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;

    -- INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'historial_pagos_fijos' AND policyname = 'Enable insert access for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert access for authenticated users" 
        ON "public"."historial_pagos_fijos" 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (true);
    END IF;

    -- UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'historial_pagos_fijos' AND policyname = 'Enable update access for authenticated users'
    ) THEN
        CREATE POLICY "Enable update access for authenticated users" 
        ON "public"."historial_pagos_fijos" 
        FOR UPDATE 
        TO authenticated 
        USING (true)
        WITH CHECK (true);
    END IF;

    -- DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'historial_pagos_fijos' AND policyname = 'Enable delete access for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete access for authenticated users" 
        ON "public"."historial_pagos_fijos" 
        FOR DELETE 
        TO authenticated 
        USING (true);
    END IF;
END$$;
