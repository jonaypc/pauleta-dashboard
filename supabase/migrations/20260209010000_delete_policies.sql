-- Migration: Add DELETE policies for expense-related tables
-- This ensures authenticated users can delete expenses and their related records

-- Políticas DELETE para tablas relacionadas con gastos
-- (Algunas podrían ya existir, usamos IF NOT EXISTS donde sea posible o ignoramos errores)

-- 1. pagos_gastos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir eliminar pagos_gastos' AND tablename = 'pagos_gastos') THEN
        CREATE POLICY "Permitir eliminar pagos_gastos" ON pagos_gastos FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END$$;

-- 2. lineas_gasto
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir eliminar lineas_gasto' AND tablename = 'lineas_gasto') THEN
        CREATE POLICY "Permitir eliminar lineas_gasto" ON lineas_gasto FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END$$;

-- 3. drive_sync_log
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir eliminar drive_sync_log' AND tablename = 'drive_sync_log') THEN
        CREATE POLICY "Permitir eliminar drive_sync_log" ON drive_sync_log FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END$$;

-- 4. Asegurar que gastos tiene DELETE (debería existir, pero por si acaso)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gastos eliminables para admin' AND tablename = 'gastos') THEN
        CREATE POLICY "Gastos eliminables para admin" ON gastos FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END$$;
