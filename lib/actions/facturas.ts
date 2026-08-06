'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface LineaRectificativa {
  linea_original_id: string
  cantidad: number
  precio_unitario: number
}

interface CrearRectificativaParams {
  factura_original_id: string
  motivo: string
  lineas: LineaRectificativa[]
}

export async function crearFacturaRectificativa(params: CrearRectificativaParams) {
  const { factura_original_id, motivo, lineas } = params
  const supabase = await createClient()

  try {
    // 1. Obtener factura original con sus líneas
    const { data: facturaOriginal, error: errorFactura } = await supabase
      .from('facturas')
      .select(`
        *,
        lineas:lineas_factura(*)
      `)
      .eq('id', factura_original_id)
      .single()

    if (errorFactura || !facturaOriginal) {
      return { error: 'Factura original no encontrada' }
    }

    // 2. Obtener configuración de empresa para numeración
    const { data: empresa } = await supabase
      .from('empresa')
      .select('id, serie_factura, ultimo_num_factura')
      .single()

    if (!empresa) {
      return { error: 'Configuración de empresa no encontrada' }
    }

    // 3. Generar número de factura rectificativa
    const nuevoNumero = empresa.ultimo_num_factura + 1
    const numeroFactura = `${empresa.serie_factura}${String(nuevoNumero).padStart(4, '0')}`

    // 4. Calcular importes de la rectificativa
    let base_imponible = 0
    let igic_total = 0

    const lineasRectificativas = lineas.map(linea => {
      const lineaOriginal = facturaOriginal.lineas.find((l: any) => l.id === linea.linea_original_id)

      if (!lineaOriginal) {
        throw new Error(`Línea original ${linea.linea_original_id} no encontrada`)
      }

      const subtotal = linea.cantidad * linea.precio_unitario
      const igic = subtotal * (lineaOriginal.igic / 100)

      base_imponible += subtotal
      igic_total += igic

      return {
        producto_id: lineaOriginal.producto_id,
        descripcion: lineaOriginal.descripcion,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        igic: lineaOriginal.igic,
        subtotal: subtotal + igic,
      }
    })

    const total = base_imponible + igic_total

    // 5. Crear factura rectificativa
    const { data: nuevaFactura, error: errorCrear } = await supabase
      .from('facturas')
      .insert({
        numero: numeroFactura,
        fecha: new Date().toISOString().split('T')[0],
        cliente_id: facturaOriginal.cliente_id,
        base_imponible,
        igic: igic_total,
        total,
        estado: 'emitida',
        tipo_factura: 'rectificativa',
        factura_rectificada_id: factura_original_id,
        motivo_rectificacion: motivo,
        fecha_factura_rectificada: facturaOriginal.fecha,
        notas: `Factura rectificativa de ${facturaOriginal.numero}. Motivo: ${motivo}`,
      })
      .select()
      .single()

    if (errorCrear || !nuevaFactura) {
      return { error: 'Error al crear la factura rectificativa: ' + (errorCrear?.message || 'Desconocido') }
    }

    // 6. Crear líneas de factura rectificativa
    const { error: errorLineas } = await supabase
      .from('lineas_factura')
      .insert(
        lineasRectificativas.map(linea => ({
          factura_id: nuevaFactura.id,
          ...linea,
        }))
      )

    if (errorLineas) {
      // Rollback: eliminar factura si falla la creación de líneas
      await supabase.from('facturas').delete().eq('id', nuevaFactura.id)
      return { error: 'Error al crear las líneas de la factura: ' + errorLineas.message }
    }

    // 7. Actualizar contador de facturas
    await supabase
      .from('empresa')
      .update({ ultimo_num_factura: nuevoNumero })
      .eq('id', empresa.id)

    // 8. Revalidar rutas
    revalidatePath('/facturas')
    revalidatePath(`/facturas/${factura_original_id}`)
    revalidatePath(`/facturas/${nuevaFactura.id}`)

    return {
      success: true,
      id: nuevaFactura.id,
      numero: numeroFactura
    }

  } catch (error: any) {
    console.error('Error en crearFacturaRectificativa:', error)
    return { error: error.message || 'Error desconocido al crear factura rectificativa' }
  }
}

export async function eliminarFactura(id: string) {
  const supabase = await createClient()

  try {
    // Verificar que la factura no tenga cobros
    const { data: cobros } = await supabase
      .from('cobros')
      .select('id')
      .eq('factura_id', id)
      .limit(1)

    if (cobros && cobros.length > 0) {
      return { error: 'No se puede eliminar una factura con cobros registrados' }
    }

    // Verificar que no sea una factura original con rectificativas
    const { data: rectificativas } = await supabase
      .from('facturas')
      .select('id')
      .eq('factura_rectificada_id', id)
      .limit(1)

    if (rectificativas && rectificativas.length > 0) {
      return { error: 'No se puede eliminar una factura que tiene facturas rectificativas asociadas' }
    }

    // Eliminar líneas primero (por FK)
    const { error: errorLineas } = await supabase
      .from('lineas_factura')
      .delete()
      .eq('factura_id', id)

    if (errorLineas) {
      return { error: 'Error al eliminar líneas: ' + errorLineas.message }
    }

    // Eliminar factura
    const { error: errorFactura } = await supabase
      .from('facturas')
      .delete()
      .eq('id', id)

    if (errorFactura) {
      return { error: 'Error al eliminar factura: ' + errorFactura.message }
    }

    revalidatePath('/facturas')
    return { success: true }

  } catch (error: any) {
    console.error('Error en eliminarFactura:', error)
    return { error: error.message || 'Error desconocido' }
  }
}
