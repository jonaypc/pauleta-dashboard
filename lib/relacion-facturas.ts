import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cliente, Factura } from '@/types'

export type PeriodoRelacion = '1' | '2' | 'mensual' | 'anual' | 'personalizado'
export interface RangoRelacion { desde: string; hasta: string; label: string }
export type FacturaRelacionDatos = Pick<Factura, 'id' | 'numero' | 'fecha' | 'total' | 'cliente_id'> & {
  cliente: Pick<Cliente, 'nombre' | 'persona_contacto' | 'cif'> | null
}

export function validarRango(desde: string, hasta: string) {
  const valida = (fecha: string) => /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    && !Number.isNaN(Date.parse(fecha))
    && new Date(fecha).toISOString().slice(0, 10) === fecha
  if (!valida(desde) || !valida(hasta)) throw new Error('Introduce fechas válidas.')
  if (desde > hasta) throw new Error('La fecha inicial debe ser anterior o igual a la final.')
}

export function etiquetaPeriodo(periodo?: string) {
  return ({ '1': '1ª quincena', '2': '2ª quincena', mensual: 'Mes completo', anual: 'Año completo' } as Record<string, string>)[periodo || ''] || 'Intervalo de fechas'
}

export function calcularRango({ periodo, mes, anio, desde, hasta }: {
  periodo: PeriodoRelacion; mes: string; anio: string; desde: string; hasta: string
}): RangoRelacion {
  if (periodo === 'anual') {
    if (!/^\d{4}$/.test(anio) || Number(anio) < 1900) throw new Error('Introduce un año válido (desde 1900).')
    desde = `${anio}-01-01`
    hasta = `${anio}-12-31`
  } else if (periodo !== 'personalizado') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error('Selecciona un mes válido.')
    const [year, month] = mes.split('-').map(Number)
    const ultimoDia = new Date(Date.UTC(year, month, 0)).getUTCDate()
    desde = `${mes}-${periodo === '2' ? '16' : '01'}`
    hasta = `${mes}-${periodo === '1' ? '15' : ultimoDia}`
  }
  validarRango(desde, hasta)
  return { desde, hasta, label: etiquetaPeriodo(periodo) }
}

export function ultimosDoceMeses(now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()
  const desde = `${year - 1}-${String(month + 1).padStart(2, '0')}-01`
  const ultimo = new Date(year, month, 0)
  const hasta = `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`
  return { desde, hasta }
}

// Sumar importes DECIMAL con céntimos enteros, incluidos abonos negativos.
export function sumarImportes(facturas: { total: number }[]) {
  return facturas.reduce((sum, f) => sum + Math.sign(Number(f.total)) * Math.round(Math.abs(Number(f.total)) * 100), 0) / 100
}

export function resumenMensual(facturas: { fecha: string; total: number }[], desde: string, hasta: string) {
  validarRango(desde, hasta)
  const meses = new Map<string, { mes: string; label: string; cantidad: number; centimos: number }>()
  let [year, month] = desde.slice(0, 7).split('-').map(Number)
  const fin = hasta.slice(0, 7)
  while (`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}` <= fin) {
    const mes = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
    meses.set(mes, { mes, label: new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }), cantidad: 0, centimos: 0 })
    if (++month > 12) { month = 1; year++ }
  }
  for (const factura of facturas) {
    if (factura.fecha < desde || factura.fecha > hasta) continue
    const mes = meses.get(factura.fecha.slice(0, 7))
    if (mes) {
      mes.cantidad++
      mes.centimos += Math.sign(Number(factura.total)) * Math.round(Math.abs(Number(factura.total)) * 100)
    }
  }
  return Array.from(meses.values(), mes => ({ mes: mes.mes, label: mes.label, cantidad: mes.cantidad, total: mes.centimos / 100 }))
}

// Paginar para que un informe anual nunca se corte en el límite de Supabase.
export async function obtenerFacturasRelacion(supabase: SupabaseClient, clienteIds: string[], desde: string, hasta: string): Promise<FacturaRelacionDatos[]> {
  validarRango(desde, hasta)
  if (!clienteIds.length) return []
  const facturas: FacturaRelacionDatos[] = []
  while (true) {
    const { data, error, count } = await supabase.from('facturas')
      .select('id, numero, fecha, total, cliente_id, cliente:clientes(nombre, persona_contacto, cif)', { count: 'exact' })
      .in('cliente_id', clienteIds).gte('fecha', desde).lte('fecha', hasta)
      .neq('estado', 'anulada').order('fecha', { ascending: true }).order('id', { ascending: true })
      .range(facturas.length, facturas.length + 499)
    if (error) throw error
    if (!data?.length) {
      if (count != null && facturas.length < count) throw new Error('No se pudieron cargar todas las facturas. Vuelve a intentarlo.')
      break
    }
    facturas.push(...data.map(f => ({ ...f, total: Number(f.total), cliente: (Array.isArray(f.cliente) ? f.cliente[0] : f.cliente) || null })))
    if (count != null && facturas.length >= count) break
  }
  return facturas
}
