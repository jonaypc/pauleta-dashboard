'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  id?: string
  numero?: string
  productos: ProductoConsolidado[]
  facturas: Array<{
    numero: string
    fecha: string
    cliente: string
  }>
  fecha_generacion: string
  total_productos: number
}

export async function generarInformeProduccionFacturas(facturaIds: string[], guardar: boolean = true) {
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
        lineas:lineas_factura!lineas_factura_factura_id_fkey(
          id,
          producto_id,
          descripcion,
          cantidad,
          producto:productos!lineas_factura_producto_id_fkey(nombre, unidad)
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

    const totalProductos = productos.reduce((sum, p) => sum + p.cantidad_total, 0)

    let informeId: string | undefined
    let numeroInforme: string | undefined

    // Guardar en BD si se solicita
    if (guardar) {
      // Generar número de informe
      const { data: numeroData } = await supabase.rpc('generar_numero_informe')
      numeroInforme = numeroData || 'IP-' + Date.now()

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()

      // Insertar informe principal
      const { data: informeData, error: informeError } = await supabase
        .from('informes_produccion')
        .insert({
          numero: numeroInforme,
          usuario_id: user?.id,
          num_facturas: facturas.length,
          num_productos: productos.length,
          cantidad_total: totalProductos,
          facturas_ids: facturaIds,
        })
        .select('id')
        .single()

      if (informeError) {
        console.error('Error guardando informe:', informeError)
      } else {
        informeId = informeData.id

        // Insertar productos del informe
        const productosInsert = productos.map(p => ({
          informe_id: informeId,
          producto_id: p.producto_id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          cantidad_total: p.cantidad_total,
          unidad: p.unidad,
          facturas_origen: p.facturas_origen,
          clientes: p.clientes,
        }))

        const { error: productosError } = await supabase
          .from('informes_produccion_productos')
          .insert(productosInsert)

        if (productosError) {
          console.error('Error guardando productos del informe:', productosError)
        }
      }

      revalidatePath('/produccion/informes')
    }

    const informe: InformeProduccionFacturas = {
      id: informeId,
      numero: numeroInforme,
      productos,
      facturas: facturas.map((f: any) => ({
        numero: f.numero,
        fecha: f.fecha,
        cliente: f.cliente?.nombre || 'Sin cliente',
      })),
      fecha_generacion: new Date().toISOString(),
      total_productos: totalProductos,
    }

    return { data: informe, error: null }
  } catch (error) {
    console.error('Error generando informe de producción:', error)
    return { data: null, error: 'Error al generar el informe' }
  }
}

export async function getInformesProduccion() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('informes_produccion')
      .select('*')
      .order('fecha_generacion', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error obteniendo informes:', error)
    return { data: null, error: 'Error al obtener informes' }
  }
}

export async function getInformeProduccion(id: string) {
  try {
    const supabase = await createClient()

    // Obtener informe principal
    const { data: informe, error: informeError } = await supabase
      .from('informes_produccion')
      .select('*')
      .eq('id', id)
      .single()

    if (informeError) {
      return { data: null, error: informeError.message }
    }

    // Obtener productos del informe
    const { data: productos, error: productosError } = await supabase
      .from('informes_produccion_productos')
      .select('*')
      .eq('informe_id', id)
      .order('nombre', { ascending: true })

    if (productosError) {
      return { data: null, error: productosError.message }
    }

    // Obtener facturas relacionadas
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('id, numero, fecha, cliente:clientes(nombre)')
      .in('id', informe.facturas_ids)
      .order('fecha', { ascending: true })

    if (facturasError) {
      return { data: null, error: facturasError.message }
    }

    const resultado: InformeProduccionFacturas = {
      id: informe.id,
      numero: informe.numero,
      productos: productos.map((p: any) => ({
        producto_id: p.producto_id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        cantidad_total: p.cantidad_total,
        unidad: p.unidad,
        facturas_origen: p.facturas_origen,
        clientes: p.clientes,
      })),
      facturas: facturas.map((f: any) => ({
        numero: f.numero,
        fecha: f.fecha,
        cliente: f.cliente?.nombre || 'Sin cliente',
      })),
      fecha_generacion: informe.fecha_generacion,
      total_productos: informe.cantidad_total,
    }

    return { data: resultado, error: null }
  } catch (error) {
    console.error('Error obteniendo informe:', error)
    return { data: null, error: 'Error al obtener el informe' }
  }
}

export async function eliminarInformeProduccion(id: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('informes_produccion')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/produccion/informes')
    return { error: null }
  } catch (error) {
    console.error('Error eliminando informe:', error)
    return { error: 'Error al eliminar el informe' }
  }
}
