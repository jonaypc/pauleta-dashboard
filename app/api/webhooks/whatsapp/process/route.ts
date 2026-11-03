import { NextResponse } from 'next/server'
import { bridgeEnabled, suggestOrder, whatsappDatabase } from '@/lib/whatsapp-server'
import { uniqueCustomer } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  if (!bridgeEnabled(request)) return NextResponse.json({ error: 'Unavailable' }, { status: 403 })
  const db = whatsappDatabase()
  const { data: rows, error } = await db.rpc('claim_whatsapp_solicitud')
  if (error) return NextResponse.json({ error: 'Queue unavailable' }, { status: 503 })
  const row = rows?.[0]
  if (!row) return NextResponse.json({ processed: 0 })
  const [products, customers] = await Promise.all([
    db.from('productos').select('id,nombre,unidad').eq('activo', true),
    db.from('clientes').select('id,telefono').eq('activo', true),
  ])
  let proposal
  let analysisError = false
  try {
    if (products.error || customers.error || row.tipo !== 'text') throw new Error('Manual review required')
    proposal = await suggestOrder(row.texto, products.data || [])
  } catch {
    analysisError = true
    proposal = { intent: 'revision_manual', summary: 'Mensaje pendiente de revisión manual', items: [], delivery: null, missing: ['Revisar el mensaje original en WhatsApp Business'] }
  }
  const customer = uniqueCustomer(customers.data || [], row.telefono)
  const { error: saveError } = await db.from('whatsapp_solicitudes').update({
    cliente_id: customer?.id || null,
    propuesta: proposal, clasificacion: proposal.intent,
    procesamiento: 'completado', error_analisis: analysisError,
    aviso_estado: proposal.intent === 'consulta' ? 'no_necesario' : 'pendiente',
  }).eq('id', row.id).eq('procesamiento', 'procesando').eq('lease_id', row.lease_id)
  if (saveError) return NextResponse.json({ error: 'Could not save analysis' }, { status: 503 })
  return NextResponse.json({ processed: 1 })
}
