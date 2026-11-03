'use server'

import { revalidatePath } from 'next/cache'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { z } from 'zod'

export async function reviewWhatsApp(formData: FormData) {
  const id = z.string().uuid().parse(formData.get('id'))
  const revision = z.enum(['revisado', 'descartado']).parse(formData.get('revision'))
  const db = await createAuthenticatedClient()
  // RLS only grants active administrators access; column grant permits revision only.
  const { data, error } = await db.from('whatsapp_solicitudes').update({ revision }).eq('id', id).select('id').single()
  if (error || !data) throw new Error('No se pudo actualizar la solicitud')
  revalidatePath('/pedidos-whatsapp')
}
