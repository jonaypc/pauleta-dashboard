ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS establecimiento_entrega text;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS direccion_entrega_factura text;
COMMENT ON COLUMN public.facturas.establecimiento_entrega IS 'Establecimiento receptor de esta factura, independiente del cliente fiscal';
COMMENT ON COLUMN public.facturas.direccion_entrega_factura IS 'Dirección de entrega de esta factura';
