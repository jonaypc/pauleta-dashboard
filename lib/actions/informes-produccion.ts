'use server'

import { createClient } from '@/lib/supabase/server'

export interface ProductoConsolidado {
  producto_id: string | null
  nombre: string
  descripcion: string
  cantidad_total: number
  unidad: string
  facturas_origen: string[]
  clientes: string[]
}

export interface InformeProduccionFacturas {
  productos: ProductoConsolidado[]
  facturas: Array<{
    numero: string
    fecha: string
    cliente: string
  }>
  fecha_generacion: string
  total_productos: number
}

export async function generarInformeProduccionFacturas(facturaIds: string[]) {
  try {
    const supabase = await createClient()

    // Obtener facturas con sus líneas y clientes
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select(`
        id,
        numero,
        fecha,
        cliente:clientes(nombre),
        lineas:lineas_facturas(
          id,
          producto_id,
          descripcion,
          cantidad,
          producto:productos(nombre, unidad)
        )
      `)
      .in('id', facturaIds)
      .order('fecha', { ascending: true })

    if (facturasError) {
      return { data: null, error: facturasError.message }
    }

    if (!facturas || facturas.length === 0) {
      return { data: null, error: 'No se encontraron facturas' }
    }

    // Consolidar productos
    const productosMap = new Map<string, ProductoConsolidado>()

    facturas.forEach((factura: any) => {
      if (!factura.lineas) return

      factura.lineas.forEach((linea: any) => {
        // Usar el nombre del producto o la descripción como key
        const productoKey = linea.producto_id || linea.descripcion
        const nombreProducto = linea.producto?.nombre || linea.descripcion

        if (productosMap.has(productoKey)) {
          const existente = productosMap.get(productoKey)!
          existente.cantidad_total += linea.cantidad
          if (!existente.facturas_origen.includes(factura.numero)) {
            existente.facturas_origen.push(factura.numero)
          }
          if (!existente.clientes.includes(factura.cliente?.nombre)) {
            existente.clientes.push(factura.cliente?.nombre)
          }
        } else {
          productosMap.set(productoKey, {
            producto_id: linea.producto_id,
            nombre: nombreProducto,
            descripcion: linea.descripcion,
            cantidad_total: linea.cantidad,
            unidad: linea.producto?.unidad || 'unidad',
            facturas_origen: [factura.numero],
            clientes: [factura.cliente?.nombre],
          })
        }
      })
    })

    const productos = Array.from(productosMap.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))

    const informe: InformeProduccionFacturas = {
      productos,
      facturas: facturas.map((f: any) => ({
        numero: f.numero,
        fecha: f.fecha,
        cliente: f.cliente?.nombre || 'Sin cliente',
      })),
      fecha_generacion: new Date().toISOString(),
      total_productos: productos.reduce((sum, p) => sum + p.cantidad_total, 0),
    }

    return { data: informe, error: null }
  } catch (error) {
    console.error('Error generando informe de producción:', error)
    return { data: null, error: 'Error al generar el informe' }
  }
}
