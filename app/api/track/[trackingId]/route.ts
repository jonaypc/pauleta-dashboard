import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// GIF transparente 1x1 pixel
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Usamos service role para evitar problemas de auth (el tracking pixel es publico)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  const { trackingId } = params

  // Actualizar tracking en background (no bloquear la respuesta)
  try {
    const supabase = getSupabaseAdmin()

    // Obtener registro actual
    const { data: tracking } = await supabase
      .from("email_tracking")
      .select("id, abierto_at, abierto_count")
      .eq("id", trackingId)
      .single()

    if (tracking) {
      const updates: Record<string, any> = {
        estado: 'abierto',
        abierto_count: (tracking.abierto_count || 0) + 1,
      }

      // Solo setear abierto_at la primera vez
      if (!tracking.abierto_at) {
        updates.abierto_at = new Date().toISOString()
      }

      await supabase
        .from("email_tracking")
        .update(updates)
        .eq("id", trackingId)
    }
  } catch (error) {
    // Silenciar errores - no afectar la entrega de la imagen
    console.error("Error updating email tracking:", error)
  }

  // Siempre devolver la imagen, independientemente de si el tracking funciono
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
