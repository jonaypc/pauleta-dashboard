import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

// Merge de clases de Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ===========================================
// FORMATEO DE NÚMEROS Y MONEDA
// ===========================================

export function formatCurrency(amount: number): string {
  const num = Number(amount)
  if (!isFinite(num)) return '0,00 €'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatPercent(num: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num / 100)
}

// ===========================================
// FORMATEO DE FECHAS
// ===========================================

export function formatDate(date: string | Date | null | undefined, formatStr: string = 'dd/MM/yyyy'): string {
  if (!date) return 'Sin fecha'
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (isNaN(dateObj.getTime())) return 'Fecha inválida'
    return format(dateObj, formatStr, { locale: es })
  } catch (error) {
    return 'Error fecha'
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'Sin fecha'
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (isNaN(dateObj.getTime())) return 'Fecha inválida'
    return format(dateObj, "dd/MM/yyyy HH:mm", { locale: es })
  } catch (error) {
    return 'Error fecha'
  }
}

export function formatDateLong(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es })
}

export function getMonthName(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'MMMM yyyy', { locale: es })
}

// ===========================================
// GENERACIÓN DE NÚMEROS DE FACTURA
// ===========================================

export function generateInvoiceNumber(serie: string, numero: number): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const paddedNumber = numero.toString().padStart(4, '0')
  return `${serie}${year}${paddedNumber}`
}

export function parseInvoiceNumber(invoiceNumber: string): { serie: string; year: string; numero: number } | null {
  const match = invoiceNumber.match(/^([A-Z]+)(\d{2})(\d+)$/)
  if (!match) return null
  return {
    serie: match[1],
    year: match[2],
    numero: parseInt(match[3], 10),
  }
}

// ===========================================
// CÁLCULOS DE FACTURACIÓN
// ===========================================

export function calculateLineTotal(cantidad: number, precioUnitario: number): number {
  return Math.round(cantidad * precioUnitario * 100) / 100
}

export function calculateIGIC(baseImponible: number, igicPercent: number = 7): number {
  return Math.round(baseImponible * (igicPercent / 100) * 100) / 100
}

export function calculateTotal(baseImponible: number, igic: number): number {
  return Math.round((baseImponible + igic) * 100) / 100
}

export interface InvoiceCalculation {
  baseImponible: number
  igic: number
  total: number
}

export function calculateInvoiceTotals(
  lineas: Array<{ cantidad: number; precio_unitario: number; igic: number }>
): InvoiceCalculation {
  let baseImponible = 0
  let igicTotal = 0

  for (const linea of lineas) {
    const subtotal = calculateLineTotal(linea.cantidad, linea.precio_unitario)
    baseImponible += subtotal
    igicTotal += calculateIGIC(subtotal, linea.igic)
  }

  return {
    baseImponible: Math.round(baseImponible * 100) / 100,
    igic: Math.round(igicTotal * 100) / 100,
    total: calculateTotal(baseImponible, igicTotal),
  }
}

// ===========================================
// VALIDACIONES
// ===========================================

export function isValidCIF(cif: string): boolean {
  if (!cif || cif.length !== 9) return false
  const cifRegex = /^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-J]$/
  return cifRegex.test(cif.toUpperCase())
}

export function isValidNIF(nif: string): boolean {
  if (!nif || nif.length !== 9) return false
  const nifRegex = /^[0-9]{8}[A-Z]$/
  return nifRegex.test(nif.toUpperCase())
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+34)?[6-9]\d{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function isValidIBAN(iban: string): boolean {
  const ibanClean = iban.replace(/\s/g, '').toUpperCase()
  if (ibanClean.length !== 24 || !ibanClean.startsWith('ES')) return false
  // Validación básica de formato
  const ibanRegex = /^ES\d{22}$/
  return ibanRegex.test(ibanClean)
}

// ===========================================
// FORMATEO DE DATOS
// ===========================================

export function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return clean.match(/.{1,4}/g)?.join(' ') || clean
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
  }
  return phone
}

// ===========================================
// ESTADOS Y COLORES
// ===========================================

export const estadoFacturaColors = {
  borrador: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  emitida: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
  },
  cobrada: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    border: 'border-green-200',
    dot: 'bg-green-400',
  },
  anulada: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    border: 'border-red-200',
    dot: 'bg-red-400',
  },
} as const

export const estadoFacturaLabels = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  cobrada: 'Cobrada',
  anulada: 'Anulada',
} as const

export const metodoPagoLabels = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  bizum: 'Bizum',
  tarjeta: 'Tarjeta',
} as const

export const unidadMedidaLabels = {
  unidad: 'Unidad',
  caja: 'Caja',
  kg: 'Kg',
} as const

// ===========================================
// UTILIDADES GENERALES
// ===========================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// ===========================================
// DIFERENCIAS Y COMPARACIONES
// ===========================================

export function calculatePercentageChange(current: number, previous: number): number {
  if (!isFinite(current) || !isFinite(previous)) return 0
  if (previous === 0) return current > 0 ? 100 : 0
  const change = ((current - previous) / previous) * 100
  return isFinite(change) ? Math.round(change * 10) / 10 : 0
}

export function getDaysUntilDue(dueDate: string | Date): number {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function isOverdue(dueDate: string | Date): boolean {
  return getDaysUntilDue(dueDate) < 0
}
