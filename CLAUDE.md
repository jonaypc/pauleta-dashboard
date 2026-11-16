# CLAUDE.md — Pauleta Canaria Dashboard

> **Documento técnico histórico.** Antes de actuar, leer `AGENTS.md` y `docs/contexto-pauleta/INDICE.md`. La versión de GitHub de la rama de trabajo es la referencia del **código**, no la vieja carpeta del escritorio. Para negocio, impuestos y catálogo prevalecen los datos vigentes del ERP y documentos verificados, no los ejemplos ni reglas antiguas de este archivo. La existencia de una ruta no prueba por sí sola su funcionamiento.

## REGLAS OBLIGATORIAS
- NUNCA toques `components/ui/` — son componentes shadcn, no se modifican
- SIEMPRE usa Server Actions para mutaciones, NO fetch a API routes propias salvo excepciones
- IGIC: **no imponer un 7 % universal**. La ficha comercial de octubre de 2026 refiere 3 % para ese producto; el código contempla 0 %, 3 % y 7 % según operación. Verificar tipo aplicable por producto/documento, configuración vigente y normativa antes de cambiar defaults o emitir documentos. No alterar impuestos ni facturas reales sin autorización.
- Todos los importes en DECIMAL(10,2), nunca float
- Antes de crear una tabla nueva en Supabase, confirma que no existe ya
- Usa `lib/supabase/server.ts` en Server Components, `lib/supabase/client.ts` en Client Components
- PDFs e impresión: revisar el flujo vigente antes de modificarlo, incluidos `lib/pdf-generator.ts`, `lib/invoice-print-pdf.ts` y vistas `/print/`; reutilizar el camino real de cada documento.
- Emails se envían con Resend desde `lib/email.ts`
- Parseo de facturas con IA en `lib/ai/invoice-parser.ts`

---

## EMPRESA
- **Nombre:** Pauleta Canaria S.L.
- **CIF:** B70853163
- **Fiscalidad:** IGIC Canarias; el porcentaje depende del producto/operación. Consultar registro vigente y asesoramiento aplicable. No asumir un tipo universal.
- **Catálogo:** la ficha comercial de octubre de 2026 enumera Mango, Mango-Fresa, Fresa, Pera-Piña y Frutos Rojos. Los demás sabores de listados antiguos son históricos. **La base de datos vigente determina cuáles están activos**, pendiente de verificación. 

---

## STACK
- Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- Resend (email)
- GoCardless (`lib/gocardless.ts`) — integración bancaria en tesorería
- Google Drive (`lib/google-drive.ts`) — importación de facturas/gastos
- Vercel (deploy)

---

## MÓDULOS CON RUTAS EN EL REPOSITORIO

> Los estados `✅` de la tabla siguiente documentan implementaciones declaradas en versiones anteriores. Confirmar código actual, pruebas y comportamiento antes de afirmar que están operativos.


| Módulo | Ruta | Estado |
|--------|------|--------|
| Dashboard | `app/(dashboard)/page.tsx` | ✅ |
| Clientes | `app/(dashboard)/clientes/` | ✅ CRUD completo |
| Facturas | `app/(dashboard)/facturas/` | ✅ + PDF + email + importar + **rectificativas** |
| Albaranes | `app/(dashboard)/facturas/[id]/albaran/` | ✅ |
| Presupuestos | `app/(dashboard)/presupuestos/` | ✅ + convertir a factura |
| Cobros | `app/(dashboard)/cobros/` | ✅ |
| Gastos | `app/(dashboard)/gastos/` | ✅ + importar Drive + IA |
| Pagos fijos | `app/(dashboard)/pagos-fijos/` | ✅ |
| Proveedores | `app/(dashboard)/proveedores/` | ✅ |
| Productos | `app/(dashboard)/productos/` | ✅ + barcodes |
| Producción | `app/(dashboard)/produccion/` | ✅ lotes, recetas, materias primas, órdenes compra |
| Tesorería | `app/(dashboard)/tesoreria/` | ✅ GoCardless + conciliación |
| Control cambios | `app/(dashboard)/control-cambios/` | ✅ rotación + resumen |
| Informes | `app/(dashboard)/informes/` | ✅ financiero + relación facturas |
| Fiscalidad | `app/(dashboard)/fiscalidad/` | ✅ |
| Configuración | `app/(dashboard)/configuracion/` | ✅ + Drive |

---

## API ROUTES EXISTENTES
```
POST /api/facturas/[id]/pdf          — Generar PDF factura
POST /api/facturas/[id]/send         — Enviar factura por email
GET  /api/facturas/export            — Exportar facturas CSV/Excel
POST /api/facturas/send-bulk         — Envío masivo
POST /api/facturas/send-consolidated — Factura consolidada por cliente
POST /api/import/clients             — Importar clientes
POST /api/import/productos           — Importar productos
POST /api/parse-invoice              — Parsear factura con IA
POST /api/parse-pdf                  — Parsear PDF genérico
POST /api/ordenes-produccion         — Órdenes de producción
POST /api/presupuestos/[id]/send     — Enviar presupuesto email
GET  /api/sync-drive                 — Sincronizar con Google Drive
GET  /api/track/[trackingId]         — Tracking email abierto
POST /api/webhooks/email-inbound     — Webhook email entrante
GET  /api/cron/check-pagos           — Cron pagos próximos
```

---

## PÁGINAS DE IMPRESIÓN (sin layout dashboard)
```
/print/facturas/[id]
/print/albaran/[id]
/print/control-cambios/[clienteId]
/print/control-cambios/registro/[id]
/print/relacion-facturas
```

---

## PATRONES DE CÓDIGO

### Server Action (mutación)
```typescript
// lib/actions/ejemplo.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearEjemplo(data: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('tabla').insert({...})
  if (error) throw new Error(error.message)
  revalidatePath('/ruta')
}
```

### Fetch datos en Server Component
```typescript
const supabase = await createClient()
const { data, error } = await supabase.from('tabla').select('*')
```

### Tipos centralizados
Todos en `types/index.ts` — antes de crear un tipo nuevo, revisa si ya existe ahí.

---

## COLORES UI
- Primario: `#2563EB`
- Éxito/Cobrado: `#10B981`
- Pendiente: `#F59E0B`
- Error/Vencido: `#EF4444`
- Fondo: `#F8FAFC`

---

## FACTURAS RECTIFICATIVAS (ABONOS/DEVOLUCIONES)
Implementado según Real Decreto 1619/2012:
- **Server Action**: `lib/actions/facturas.ts` → `crearFacturaRectificativa()`
- **Componente UI**: `components/facturas/CrearRectificativaDialog.tsx`
- **Tipos**: `TipoFactura = 'ordinaria' | 'rectificativa'`
- **Campos DB**: `tipo_factura`, `factura_rectificada_id`, `motivo_rectificacion`, `fecha_factura_rectificada`
- **PDF**: Generador detecta tipo y muestra encabezado especial + referencia
- **Validación**: Trigger `tr_validar_factura_rectificativa` asegura integridad
- **Vista helper**: `v_facturas_con_rectificativas` para informes
- **Función**: `get_total_neto_factura(uuid)` calcula total neto (original + rectificativas)
- **Doc completa**: `docs/FACTURAS_RECTIFICATIVAS.md`

Flujo:
1. Factura emitida/cobrada → botón "Crear Rectificativa"
2. Seleccionar motivo + líneas con cantidades negativas (devolución)
3. Se genera factura nueva con importes negativos
4. Stock se ajusta automáticamente (trigger existente de lineas_factura)
5. PDF y email funcionan igual que facturas normales

---

## ANTES DE EMPEZAR CUALQUIER TAREA
1. Lee `types/index.ts` para ver los tipos existentes
2. Si tocas Supabase: verifica la tabla exacta antes de escribir queries
3. Si creas componente nuevo: busca en `components/` si ya existe algo similar
4. Si generas PDF: identifica la ruta de generación/impresión realmente utilizada, incluidos `lib/pdf-generator.ts` y `lib/invoice-print-pdf.ts`
5. Si envías email: usa `lib/email.ts`
6. Si trabajas con facturas: considera si aplica a rectificativas también
