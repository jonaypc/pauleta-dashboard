-- Tabla para trackear archivos de Google Drive procesados
-- Evita duplicados al sincronizar

CREATE TABLE IF NOT EXISTS drive_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_file_id TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT, -- ej: "2024/02/factura.pdf"
    year TEXT,
    month TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    gasto_id UUID REFERENCES gastos(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'processed' CHECK (status IN ('processed', 'error', 'skipped', 'pending')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_drive_sync_log_file_id ON drive_sync_log(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_drive_sync_log_status ON drive_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_drive_sync_log_year_month ON drive_sync_log(year, month);

-- Tabla para configuración de Drive (carpeta raíz, última sincronización, etc.)
CREATE TABLE IF NOT EXISTS drive_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id TEXT NOT NULL,
    folder_name TEXT,
    last_sync_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Solo admins pueden ver/modificar estos registros
ALTER TABLE drive_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_config ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para esta versión (puedes restringir después)
CREATE POLICY "Allow all for drive_sync_log" ON drive_sync_log FOR ALL USING (true);
CREATE POLICY "Allow all for drive_config" ON drive_config FOR ALL USING (true);

COMMENT ON TABLE drive_sync_log IS 'Registro de archivos de Google Drive sincronizados para evitar duplicados';
COMMENT ON TABLE drive_config IS 'Configuración de la integración con Google Drive';
