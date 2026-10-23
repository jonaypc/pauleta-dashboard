import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^00/, '')
  return /^[6789]\d{8}$/.test(digits) ? `34${digits}` : digits
}

export function authorizedBridge(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header) return false
  const actual = Buffer.from(header)
  const expected = Buffer.from(`Bearer ${secret}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export const incomingSchema = z.object({
  message_id: z.string().min(1).max(200),
  phone_number_id: z.string().regex(/^\d{5,30}$/),
  from: z.string().regex(/^\+?\d{7,15}$/).transform(normalizePhone),
  name: z.string().max(200).default(''),
  type: z.enum(['text', 'image', 'audio', 'document', 'video', 'sticker', 'location', 'contacts', 'interactive', 'button', 'order', 'unsupported']),
  text: z.string().max(4096).default(''),
  timestamp: z.string().regex(/^\d{10}$/),
}).strict()

export const proposalSchema = z.object({
  intent: z.enum(['pedido', 'consulta', 'revision_manual']),
  summary: z.string().min(1).max(500),
  items: z.array(z.object({
    product_id: z.string().uuid().nullable(),
    description: z.string().min(1).max(200),
    quantity: z.number().positive().max(100000).nullable(),
    unit: z.enum(['unidad', 'caja', 'kg']).nullable(),
  }).strict()).max(30),
  delivery: z.string().max(500).nullable(),
  missing: z.array(z.string().max(200)).max(15),
}).strict()

// A model can suggest catalogue IDs, never invent them or convert boxes to units.
export function validateProposal(value: unknown, catalogue: { id: string; unidad: string }[]) {
  const result = proposalSchema.parse(value)
  for (const item of result.items) {
    const product = catalogue.find(p => p.id === item.product_id)
    if (!product || product.unidad !== item.unit) {
      item.product_id = null
      result.missing.push('Revisar producto o formato con el cliente')
    }
  }
  return result
}

export function uniqueCustomer<T extends { telefono: string | null }>(customers: T[], from: string): T | null {
  const matches = customers.filter(c => c.telefono && normalizePhone(c.telefono) === normalizePhone(from))
  return matches.length === 1 ? matches[0] : null
}
