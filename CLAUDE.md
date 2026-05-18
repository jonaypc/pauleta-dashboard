# CLAUDE.md — Pauleta Canaria Dashboard

## REGLAS OBLIGATORIAS
- NUNCA toques `components/ui/` — son componentes shadcn, no se modifican
- SIEMPRE usa Server Actions para mutaciones, NO fetch a API routes propias salvo excepciones
- IGIC siempre al 7% — `const IGIC_RATE = 0.07`
- Todos los importes en DECIMAL(10,2), nunca float
- Antes de crear una tabla nueva en Supabase, confirma que no existe ya
- Usa `lib/supabase/server.ts` en Server Components, `lib/supabase/client.ts` en Client Components
- PDFs se generan en `lib/pdf-generator.ts` — reutiliza lo que hay
- Emails se envían con Resend desde `lib/email.ts`
- Parseo de facturas con IA en `lib/ai/invoice-parser.ts`

---

## EMPRESA
- **Nombre:** Pauleta Canaria S.L.
- **CIF:** B70853163
- **Régimen:** IGIC Canarias 7%
- **Cuenta:** ES96 3058 6109 1427 2001 9948 (Cajamar)
- **Productos:** Mango, Fresa, Frutos Rojos, Pera Piña, Kiwi Manzana Uva, Melón

---

## STACK
- Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- Resend (email)
- GoCardless (`lib/gocardless.ts`) — integración bancaria en tesorería
- Google Drive (`lib/google-drive.ts`) — importación de facturas/gastos
- Vercel (deploy)

---

## MÓDULOS EXISTENTES

| Módulo | Ruta | Estado |
|--------|------|--------|
| Dashboard | `app/(dashboard)/page.tsx` | ✅ |
| Clientes | `app/(dashboard)/clientes/` | ✅ CRUD completo |
| Facturas | `app/(dashboard)/facturas/` | ✅ + PDF + email + importar |
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

## ANTES DE EMPEZAR CUALQUIER TAREA
1. Lee `types/index.ts` para ver los tipos existentes
2. Si tocas Supabase: verifica la tabla exacta antes de escribir queries
3. Si creas componente nuevo: busca en `components/` si ya existe algo similar
4. Si generas PDF: usa `lib/pdf-generator.ts` como base
5. Si envías email: usa `lib/email.ts`
