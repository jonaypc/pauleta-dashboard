# Aplicación de gestión: requisitos e incidencias

**No se certifica implementación:** esta lista se basa en solicitudes de usuario y antecedentes. Verificar en código, pruebas y producción antes de marcar algo como resuelto.

## Base técnica informada
Aplicación Next.js 14 / React 18 / TypeScript / Tailwind con Supabase y despliegue Vercel. Repositorio `jonaypc/pauleta-dashboard`. Módulos mencionados: clientes, productos, facturas, albaranes, rectificativas, cobros, gastos, producción, tesorería e informes. Existen integraciones que requieren configuración por entorno; no copiar secretos a Git.

## Impresión y PDF
- Impresión y descarga funcionales desde iPhone/PWA y escritorio.
- Conservar ubicación de entrega en factura y recuperar el dato del cliente según reglas vigentes.
- Copia de factura: evitar discrepancia entre sello «COPIA» en pantalla y salida física.
- Relación de facturas: vigilar tamaño de fuente, legibilidad y totales.
- Comprobar visualmente cada tipo de documento y navegador implicado.

## Usabilidad móvil
- Iconos de albarán y factura rectificativa dentro del ancho disponible.
- Líneas nuevas de factura en la parte superior.
- Filtros de facturas: el cambio de estado no debe borrar el cliente elegido.

## Integridad y datos
- No alterar numeración, importes, impuestos, estados o recibos reales durante pruebas.
- El estado «cobrada» debe poder conciliarse con movimientos bancarios.
- Verificar migraciones efectivamente aplicadas en Supabase antes de planear cambios de esquema.
- No ejecutar `supabase/schema.sql` histórico en producción como método de actualización.

## Estado técnico comprobado por el diagnóstico del 16-11-2026
La copia local antigua estaba en `89c3664` (06-08-2026), sin cambios locales pendientes. GitHub `main` y Vercel coincidían en `109fbef` (03-11-2026). El código reciente incluía trabajos sobre PDF, sesiones, lugar de entrega, IGIC, filtros y PWA. **Esta observación no equivale a validación funcional**. Rama `feat/whatsapp-pedidos` y PR #18 de borrador, no integrados.

## Próximo chequeo si se autoriza desarrollo local
Configurar entorno de pruebas aislado, dependencias, variables seguras, comparativa de migraciones, pruebas/lint/build. No trabajar sobre datos de producción sin aprobación.
