-- Tabla para tracking de emails de facturas
CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID REFERENCES facturas(id) ON DELETE CASCADE,
  email_to VARCHAR(255) NOT NULL,
  resend_email_id VARCHAR(100),
  estado VARCHAR(30) DEFAULT 'enviado'
    CHECK (estado IN ('enviado','entregado','abierto','clickeado','rebotado','error')),
  enviado_at TIMESTAMPTZ DEFAULT NOW(),
  entregado_at TIMESTAMPTZ,
  abierto_at TIMESTAMPTZ,
  abierto_count INT DEFAULT 0,
  clickeado_at TIMESTAMPTZ,
  error_mensaje TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_tracking_factura ON email_tracking(factura_id);
CREATE INDEX idx_email_tracking_estado ON email_tracking(estado);

-- RLS
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver email_tracking"
  ON email_tracking FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar email_tracking"
  ON email_tracking FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar email_tracking"
  ON email_tracking FOR UPDATE TO authenticated USING (true);

-- Acceso publico para el tracking pixel (actualizacion sin auth)
CREATE POLICY "Acceso publico para tracking pixel"
  ON email_tracking FOR UPDATE TO anon USING (true);

CREATE POLICY "Acceso publico lectura tracking"
  ON email_tracking FOR SELECT TO anon USING (true);
