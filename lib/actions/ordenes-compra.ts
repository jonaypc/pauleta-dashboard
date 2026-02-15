"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { OrdenCompraFormData } from "@/types"

// ===========================================
// OBTENER TODAS LAS ÓRDENES DE COMPRA
// ===========================================
export async function getOrdenesCompra() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("ordenes_compra")
        .select(`
            *,
            proveedor:proveedores(id, nombre, cif),
            lineas:lineas_orden_compra(
                id,
                materia_prima_id,
                cantidad_pedida,
                cantidad_recibida,
                precio_unitario,
                subtotal,
                total,
                lote_proveedor,
                fecha_caducidad,
                materia_prima:materias_primas(id, nombre, codigo, unidad_medida)
            )
        `)
        .order("fecha", { ascending: false })

    if (error) {
        console.error("Error fetching ordenes compra:", error)
        return { error: error.message }
    }

    return { data }
}

// ===========================================
// OBTENER ORDEN POR ID
// ===========================================
export async function getOrdenCompraById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("ordenes_compra")
        .select(`
            *,
            proveedor:proveedores(id, nombre, cif, telefono, email),
            lineas:lineas_orden_compra(
                id,
                materia_prima_id,
                cantidad_pedida,
                cantidad_recibida,
                precio_unitario,
                subtotal,
                impuesto,
                total,
                lote_proveedor,
                fecha_caducidad,
                notas,
                materia_prima:materias_primas(id, nombre, codigo, unidad_medida)
            )
        `)
        .eq("id", id)
        .single()

    if (error) {
        console.error("Error fetching orden compra:", error)
        return { error: error.message }
    }

    return { data }
}

// ===========================================
// CREAR ORDEN DE COMPRA
// ===========================================
export async function createOrdenCompra(formData: OrdenCompraFormData) {
    const supabase = await createClient()

    // Generar número de orden
    const { data: numeroData, error: numeroError } = await supabase
        .rpc("generar_numero_orden_compra")

    if (numeroError) {
        console.error("Error generating order number:", numeroError)
        return { error: numeroError.message }
    }

    // Crear la orden
    const { data: orden, error: ordenError } = await supabase
        .from("ordenes_compra")
        .insert({
            numero: numeroData,
            proveedor_id: formData.proveedor_id,
            fecha: formData.fecha,
            fecha_entrega_esperada: formData.fecha_entrega_esperada || null,
            metodo_pago: formData.metodo_pago || null,
            referencia_proveedor: formData.referencia_proveedor || null,
            notas: formData.notas || null,
            estado: "borrador",
        })
        .select()
        .single()

    if (ordenError) {
        console.error("Error creating orden compra:", ordenError)
        return { error: ordenError.message }
    }

    // Crear las líneas
    if (formData.lineas && formData.lineas.length > 0) {
        const lineas = formData.lineas.map(linea => {
            const subtotal = linea.cantidad_pedida * linea.precio_unitario
            const impuesto = 7.0 // IGIC por defecto
            const totalLinea = subtotal + (subtotal * impuesto / 100)

            return {
                orden_compra_id: orden.id,
                materia_prima_id: linea.materia_prima_id,
                cantidad_pedida: linea.cantidad_pedida,
                cantidad_recibida: 0,
                precio_unitario: linea.precio_unitario,
                subtotal: subtotal,
                impuesto: impuesto,
                total: totalLinea,
                lote_proveedor: linea.lote_proveedor || null,
                fecha_caducidad: linea.fecha_caducidad || null,
                notas: linea.notas || null,
            }
        })

        const { error: lineasError } = await supabase
            .from("lineas_orden_compra")
            .insert(lineas)

        if (lineasError) {
            console.error("Error creating lineas orden compra:", lineasError)
            // Eliminar la orden si falla la creación de líneas
            await supabase.from("ordenes_compra").delete().eq("id", orden.id)
            return { error: lineasError.message }
        }
    }

    revalidatePath("/produccion/ordenes-compra")
    return { data: orden }
}

// ===========================================
// ACTUALIZAR ESTADO DE ORDEN
// ===========================================
export async function updateEstadoOrdenCompra(id: string, estado: string) {
    const supabase = await createClient()

    const updates: any = { estado }

    // Si se marca como recibida, actualizar fecha de entrega real
    if (estado === "recibida") {
        updates.fecha_entrega_real = new Date().toISOString().split("T")[0]
    }

    const { data, error } = await supabase
        .from("ordenes_compra")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

    if (error) {
        console.error("Error updating orden estado:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/ordenes-compra")
    return { data }
}

// ===========================================
// RECIBIR MATERIALES (PARCIAL O COMPLETO)
// ===========================================
export async function recibirMateriales(
    ordenId: string,
    lineasRecibidas: Array<{
        linea_id: string
        cantidad_recibida: number
        lote_proveedor?: string
        fecha_caducidad?: string
    }>
) {
    const supabase = await createClient()

    try {
        // Actualizar cada línea
        for (const lineaRecibida of lineasRecibidas) {
            // Obtener la línea actual
            const { data: lineaActual, error: lineaError } = await supabase
                .from("lineas_orden_compra")
                .select("*, materia_prima:materias_primas(id)")
                .eq("id", lineaRecibida.linea_id)
                .single()

            if (lineaError || !lineaActual) {
                console.error("Error fetching linea:", lineaError)
                continue
            }

            const nuevaCantidadRecibida = (lineaActual.cantidad_recibida || 0) + lineaRecibida.cantidad_recibida

            // Actualizar línea
            const { error: updateError } = await supabase
                .from("lineas_orden_compra")
                .update({
                    cantidad_recibida: nuevaCantidadRecibida,
                    lote_proveedor: lineaRecibida.lote_proveedor || lineaActual.lote_proveedor,
                    fecha_caducidad: lineaRecibida.fecha_caducidad || lineaActual.fecha_caducidad,
                })
                .eq("id", lineaRecibida.linea_id)

            if (updateError) {
                console.error("Error updating linea:", updateError)
                continue
            }

            // Crear movimiento de inventario (entrada)
            const { data: stockAnterior } = await supabase
                .from("materias_primas")
                .select("stock_actual")
                .eq("id", lineaActual.materia_prima_id)
                .single()

            const stockAnteriorValue = stockAnterior?.stock_actual || 0
            const stockNuevo = stockAnteriorValue + lineaRecibida.cantidad_recibida

            await supabase
                .from("movimientos_inventario")
                .insert({
                    materia_prima_id: lineaActual.materia_prima_id,
                    tipo: "entrada",
                    cantidad: lineaRecibida.cantidad_recibida,
                    costo_unitario: lineaActual.precio_unitario,
                    costo_total: lineaRecibida.cantidad_recibida * lineaActual.precio_unitario,
                    stock_anterior: stockAnteriorValue,
                    stock_nuevo: stockNuevo,
                    referencia_id: ordenId,
                    referencia_tipo: "orden_compra",
                    lote_proveedor: lineaRecibida.lote_proveedor,
                    fecha_caducidad: lineaRecibida.fecha_caducidad,
                    motivo: `Recepción de orden de compra`,
                })
        }

        // Verificar si todas las líneas están completamente recibidas
        const { data: todasLineas } = await supabase
            .from("lineas_orden_compra")
            .select("cantidad_pedida, cantidad_recibida")
            .eq("orden_compra_id", ordenId)

        const todasRecibidas = todasLineas?.every(l => l.cantidad_recibida >= l.cantidad_pedida) || false
        const algunaRecibida = todasLineas?.some(l => (l.cantidad_recibida || 0) > 0) || false

        // Actualizar estado de la orden
        let nuevoEstado = "enviada"
        if (todasRecibidas) {
            nuevoEstado = "recibida"
        } else if (algunaRecibida) {
            nuevoEstado = "recibida_parcial"
        }

        await updateEstadoOrdenCompra(ordenId, nuevoEstado)

        revalidatePath("/produccion/ordenes-compra")
        revalidatePath("/produccion/materias-primas")
        return { success: true }
    } catch (error: any) {
        console.error("Error recibiendo materiales:", error)
        return { error: error.message || "Error al recibir materiales" }
    }
}

// ===========================================
// ELIMINAR ORDEN DE COMPRA
// ===========================================
export async function deleteOrdenCompra(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("ordenes_compra")
        .delete()
        .eq("id", id)

    if (error) {
        console.error("Error deleting orden compra:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/ordenes-compra")
    return { success: true }
}

// ===========================================
// OBTENER ESTADÍSTICAS DE ÓRDENES DE COMPRA
// ===========================================
export async function getEstadisticasOrdenesCompra() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("ordenes_compra")
        .select("*")

    if (error) {
        console.error("Error fetching stats:", error)
        return { error: error.message }
    }

    const total = data?.length || 0
    const borradores = data?.filter(o => o.estado === "borrador").length || 0
    const enviadas = data?.filter(o => o.estado === "enviada").length || 0
    const confirmadas = data?.filter(o => o.estado === "confirmada").length || 0
    const recibidas = data?.filter(o => o.estado === "recibida").length || 0
    const pendientes = data?.filter(o => ["enviada", "confirmada", "recibida_parcial"].includes(o.estado || "")).length || 0

    const totalGastado = data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0

    return {
        data: {
            total,
            borradores,
            enviadas,
            confirmadas,
            recibidas,
            pendientes,
            totalGastado,
        }
    }
}
