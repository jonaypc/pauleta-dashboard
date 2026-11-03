import { NextResponse } from 'next/server'
import { bridgeEnabled, whatsappDatabase } from '@/lib/whatsapp-server'
import { incomingSchema, normalizePhone } from '@/lib/whatsapp'

export const runtime = 'nodejs'

// Private n8n bridge, NOT a public Meta callback. The WhatsApp Trigger handles Meta.
export async function POST(request: Request) {
  if (!bridgeEnabled(request)) return NextResponse.json({ error: 'Unavailable' }, { status: 403 })
  const body = await request.text()
  if (Buffer.byteLength(body) > 16384) return NextResponse.json({ error: 'Too large' }, { status: 413 })
  let parsed
  try { parsed = incomingSchema.safeParse(JSON.parse(body)) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!parsed.success) return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
  const msg = parsed.data
  if (msg.phone_number_id !== process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return NextResponse.json({ error: 'Wrong business number' }, { status: 403 })
  }
  if (msg.from === normalizePhone(process.env.WHATSAPP_OWNER_PHONE || '')) {
    return NextResponse.json({ ignored: true })
  }
  const db = whatsappDatabase()
  const { error } = await db.from('whatsapp_solicitudes').insert({
    message_id: msg.message_id, phone_number_id: msg.phone_number_id,
    telefono: msg.from, nombre: msg.name, tipo: msg.type,
    texto: msg.text || `[Mensaje ${msg.type}: revisar en WhatsApp Business]`,
    recibido_at: new Date(Number(msg.timestamp) * 1000).toISOString(),
  })
  if (error?.code === '23505') return NextResponse.json({ duplicate: true })
  if (error) return NextResponse.json({ error: 'Could not save message' }, { status: 503 })
  return NextResponse.json({ received: true }, { status: 202 })
}
