import Link from 'next/link'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { reviewWhatsApp } from '@/lib/actions/whatsapp'
import type { WhatsAppSolicitud } from '@/types'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Solicitudes por WhatsApp' }

const notificationLabels = {
  no_necesario: 'Sin aviso', pendiente: 'Aviso pendiente', enviando: 'Enviando aviso',
  aceptado_meta: 'Aviso aceptado por WhatsApp (entrega no verificada)', revisar_error: 'Aviso con incidencia: revisar',
}

export default async function WhatsAppOrders({ searchParams }: { searchParams: { vista?: string; pagina?: string; solicitud?: string } }) {
  const db = await createAuthenticatedClient()
  const { data: { user } } = await db.auth.getUser()
  const { data: admin } = await db.from('usuarios').select('rol,activo').eq('id', user!.id).single()
  if (!admin?.activo || admin.rol !== 'admin') return <p>Esta sección está disponible para administradores.</p>
  const all = searchParams.vista === 'todas'
  const selected = z.string().uuid().safeParse(searchParams.solicitud)
  const page = Math.floor(Math.max(1, Math.min(10000, Number(searchParams.pagina) || 1)))
  let query = db.from('whatsapp_solicitudes').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (selected.success) query = query.eq('id', selected.data)
  else if (!all) query = query.eq('revision', 'pendiente')
  const { data, error, count } = await query.range(selected.success ? 0 : (page - 1) * 30, selected.success ? 0 : page * 30 - 1)
  const rows = (data || []) as WhatsAppSolicitud[]
  const enabled = process.env.WHATSAPP_BRIDGE_ENABLED === 'true'
  return <div className="mx-auto max-w-4xl space-y-6">
    <Link href="/" className="text-sm text-blue-700">← Volver al inicio</Link>
    <div><h1 className="text-2xl font-bold">Solicitudes por WhatsApp</h1>
      <p className="text-muted-foreground">Revisa lo que solicita cada cliente antes de confirmar el pedido.</p></div>
    {!enabled && <p className="rounded-lg border border-amber-300 bg-amber-50 p-4">Conexión pendiente de activar. Todavía no se reciben mensajes ni se envían avisos.</p>}
    <div className="flex gap-4 text-sm"><Link className="underline" href="/pedidos-whatsapp">Pendientes</Link>
      <Link className="underline" href="/pedidos-whatsapp?vista=todas">Todos los mensajes</Link></div>
    {error ? <p role="alert" className="rounded-lg border p-4">La bandeja no está disponible. Falta completar la instalación o revisar la conexión.</p> : <>
      {!rows.length && <p className="rounded-lg border bg-white p-6">No hay solicitudes en esta vista.</p>}
      {rows.map(row => <article key={row.id} id={row.id} className="scroll-mt-20 space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-2"><div>
          <h2 className="font-semibold">{row.nombre || 'Cliente sin identificar'}</h2>
          <p className="text-sm text-muted-foreground">+{row.telefono} · {new Date(row.recibido_at).toLocaleString('es-ES', { timeZone: 'Atlantic/Canary' })}</p>
          {row.cliente_id && <Link className="text-sm text-blue-700 underline" href={`/clientes/${row.cliente_id}`}>Ver cliente en el CRM</Link>}
        </div><span className="rounded-full bg-amber-50 px-3 py-1 text-sm">{row.revision} · {row.clasificacion || 'Por interpretar'}</span></header>
        <div><h3 className="text-sm font-medium">Mensaje original</h3><p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm">{row.texto}</p></div>
        {row.propuesta && <div className="space-y-2"><h3 className="font-medium">{row.propuesta.summary}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">{row.propuesta.items.map((item, i) => <li key={i}>{item.quantity ?? 'Cantidad por indicar'} {item.unit || 'formato por indicar'} · {item.description}{!item.product_id && ' (producto por revisar)'}</li>)}</ul>
          {row.propuesta.delivery && <p className="text-sm">Entrega solicitada: {row.propuesta.delivery}</p>}
          {!!row.propuesta.missing.length && <p className="text-sm text-amber-800">Por revisar: {row.propuesta.missing.join(' · ')}</p>}
        </div>}
        <p className="text-xs text-muted-foreground">{notificationLabels[row.aviso_estado]}. Esta solicitud no confirma disponibilidad ni entrega.</p>
        <div className="flex flex-wrap gap-3">
          <a href={`https://wa.me/${row.telefono}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-2 text-sm">Abrir WhatsApp del cliente</a>
          {row.revision === 'pendiente' && <form action={reviewWhatsApp} className="flex flex-wrap gap-3">
            <input type="hidden" name="id" value={row.id}/>
            <button name="revision" value="revisado" className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Marcar revisado</button>
            <button name="revision" value="descartado" className="rounded-lg border px-3 py-2 text-sm">Descartar solicitud</button>
          </form>}
        </div>
      </article>)}
      <nav aria-label="Paginación" className="flex gap-4 text-sm">
        {page > 1 && <Link href={`?vista=${all ? 'todas' : 'pendientes'}&pagina=${page - 1}`}>← Anterior</Link>}
        {(count || 0) > page * 30 && <Link href={`?vista=${all ? 'todas' : 'pendientes'}&pagina=${page + 1}`}>Siguiente →</Link>}
      </nav>
    </>}
  </div>
}
