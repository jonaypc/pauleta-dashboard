import { NextResponse } from 'next/server'
import { bridgeEnabled, whatsappDatabase } from '@/lib/whatsapp-server'
import { normalizePhone } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  if (!bridgeEnabled(request) || process.env.WHATSAPP_NOTIFICATIONS_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Unavailable' }, { status: 403 })
  }
  const owner = normalizePhone(process.env.WHATSAPP_OWNER_PHONE || '')
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId,
    WHATSAPP_TEMPLATE_NAME: template, WHATSAPP_GRAPH_VERSION: version,
    NEXT_PUBLIC_APP_URL: appUrl } = process.env
  if (!/^[1-9]\d{6,14}$/.test(owner) || !token || !phoneId || !template || !/^v\d+\.\d+$/.test(version || '') || !appUrl?.startsWith('https://')) {
    return NextResponse.json({ error: 'Notification configuration incomplete' }, { status: 503 })
  }
  const db = whatsappDatabase()
  const { data: rows, error } = await db.rpc('claim_whatsapp_aviso')
  if (error) return NextResponse.json({ error: 'Queue unavailable' }, { status: 503 })
  const row = rows?.[0]
  if (!row) return NextResponse.json({ sent: 0 })
  let messageId: string | undefined
  try {
    const clean = (v: string) => v.replace(/\s+/g, ' ').slice(0, 300)
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ messaging_product: 'whatsapp', to: owner, type: 'template', template: {
        name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es' },
        components: [{ type: 'body', parameters: [
          { type: 'text', text: clean(row.nombre || row.telefono) },
          { type: 'text', text: clean(row.propuesta?.summary || 'Revisar mensaje') },
          { type: 'text', text: `${appUrl.replace(/\/$/, '')}/pedidos-whatsapp?solicitud=${row.id}` },
        ] }],
      } }),
    })
    const result = await response.json()
    if (!response.ok || !result.messages?.[0]?.id) throw new Error('Provider rejected notification')
    messageId = result.messages[0].id
  } catch {
    // A timeout may mean Meta accepted the message: never resend blindly.
    await db.from('whatsapp_solicitudes').update({ aviso_estado: 'revisar_error' }).eq('id', row.id).eq('aviso_estado', 'enviando')
    return NextResponse.json({ error: 'Notification requires manual review' }, { status: 502 })
  }
  const { error: saveError } = await db.from('whatsapp_solicitudes').update({
    aviso_estado: 'aceptado_meta', aviso_message_id: messageId,
  }).eq('id', row.id).eq('aviso_estado', 'enviando')
  if (saveError) return NextResponse.json({ error: 'Check provider receipt before retrying' }, { status: 503 })
  return NextResponse.json({ sent: 1 })
}
