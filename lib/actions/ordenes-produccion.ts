"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ===========================================
// OBTENER TODAS LAS ÓRDENES DE PRODUCCIÓN
// ===========================================
export async function getOrdenesProduccion() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("ordenes_produccion")
        .select(`
            *,
            producto:productos(id, nombre),
            receta:recetas(id, nombre, version)
        `)
        .order("fecha_planificada", { ascending: false })

    if (error) {
        console.error("Error fetching ordenes produccion:", error)
        return { error: error.message }
    }

    return { data }
}

// ===========================================
// OBTENER ORDEN POR ID
// ===========================================
export async function getOrdenProduccionById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("ordenes_produccion")
        .select(`
            *,
            producto:productos(id, nombre),
            receta:recetas(
                id,
                nombre,
                version,
                ingredientes:receta_ingredientes(
                    id,
                    cantidad,
                    unidad,
                    materia_prima:materias_primas(id, nombre, codigo, stock_actual)
                )
            ),
            lotes:lotes_produccion(*)
        `)
        .eq("id", id)
        .single()

    if (error) {
        console.error("Error fetching orden produccion:", error)
        return { error: error.message }
    }

    return { data }
}

// ===========================================
// CREAR ORDEN DE PRODUCCIÓN
// ===========================================
export async function createOrdenProduccion(formData: {
    producto_id: string
    receta_id?: string
    cantidad_planificada: number
    fecha_planificada: string
    prioridad: number
    operario_responsable?: string
    turno?: string
    notas?: string
}) {
    const supabase = await createClient()

    // Generar número de orden
    const { data: numeroData, error: numeroError } = await supabase
        .rpc("generar_numero_orden_produccion")

    if (numeroError) {
        console.error("Error generating order number:", numeroError)
        return { error: numeroError.message }
    }

    const { data, error } = await supabase
        .from("ordenes_produccion")
        .insert({
            numero: numeroData,
            producto_id: formData.producto_id,
            receta_id: formData.receta_id || null,
            cantidad_planificada: formData.cantidad_planificada,
            fecha_planificada: formData.fecha_planificada,
            prioridad: formData.prioridad,
            operario_responsable: formData.operario_responsable || null,
            turno: formData.turno || null,
            notas: formData.notas || null,
            estado: "planificada",
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating orden produccion:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/ordenes")
    return { data }
}

// ===========================================
// ACTUALIZAR ESTADO DE ORDEN
// ===========================================
export async function updateEstadoOrden(id: string, estado: string) {
    const supabase = await createClient()

    const updates: any = { estado }

    // Si se inicia, registrar fecha de inicio
    if (estado === "en_proceso") {
        updates.fecha_inicio = new Date().toISOString()
    }

    // Si se completa, registrar fecha de fin
    if (estado === "completada") {
        updates.fecha_fin = new Date().toISOString()
    }

    const { data, error } = await supabase
        .from("ordenes_produccion")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

    if (error) {
        console.error("Error updating orden estado:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/ordenes")
    return { data }
}

// ===========================================
// REGISTRAR PRODUCCIÓN
// ===========================================
export async function registrarProduccion(
    ordenId: string,
    cantidadProducida: number,
    cantidadRechazada: number
) {
    const supabase = await createClient()

    const cantidadAprobada = cantidadProducida - cantidadRechazada

    const { data, error } = await supabase
        .from("ordenes_produccion")
        .update({
            cantidad_producida: cantidadProducida,
            cantidad_rechazada: cantidadRechazada,
            cantidad_aprobada: cantidadAprobada,
        })
        .eq("id", ordenId)
        .select()
        .single()

    if (error) {
        console.error("Error registering production:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/ordenes")
    return { data }
}

// ===========================================
// CREAR LOTE DE PRODUCCIÓN
// ===========================================
export async function createLoteProduccion(
    ordenId: string,
    productoId: string,
    cantidad: number,
    diasCaducidad: number
) {
    const supabase = await createClient()

    // Generar número de lote
    const { data: numeroLote, error: numeroError } = await supabase
        .rpc("generar_numero_lote", { p_producto_id: productoId })

    if (numeroError) {
        console.error("Error generating lote number:", numeroError)
        return { error: numeroError.message }
    }

    // Calcular fecha de caducidad
    const fechaCaducidad = new Date()
    fechaCaducidad.setDate(fechaCaducidad.getDate() + diasCaducidad)

    const { data, error } = await supabase
        .from("lotes_produccion")
        .insert({
            numero_lote: numeroLote,
            orden_produccion_id: ordenId,
            producto_id: productoId,
            cantidad: cantidad,
            fecha_fabricacion: new Date().toISOString().split("T")[0],
            fecha_caducidad: fechaCaducidad.toISOString().split("T")[0],
            estado: "disponible",
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating lote:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/lotes")
    revalidatePath("/produccion/ordenes")
    return { data }
}

// ===========================================
// OBTENER ESTADÍSTICAS DE ÓRDENES
// ===========================================
export async function getEstadisticasOrdenes() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("ordenes_produccion")
        .select("*")

    if (error) {
        console.error("Error fetching stats:", error)
        return { error: error.message }
    }

    const total = data?.length || 0
    const planificadas = data?.filter(o => o.estado === "planificada").length || 0
    const enProceso = data?.filter(o => o.estado === "en_proceso").length || 0
    const completadas = data?.filter(o => o.estado === "completada").length || 0
    const canceladas = data?.filter(o => o.estado === "cancelada").length || 0

    const totalPlanificado = data?.reduce((sum, o) => sum + (o.cantidad_planificada || 0), 0) || 0
    const totalProducido = data?.reduce((sum, o) => sum + (o.cantidad_producida || 0), 0) || 0
    const totalRechazado = data?.reduce((sum, o) => sum + (o.cantidad_rechazada || 0), 0) || 0

    const eficiencia = totalPlanificado > 0 ? (totalProducido / totalPlanificado) * 100 : 0

    return {
        data: {
            total,
            planificadas,
            enProceso,
            completadas,
            canceladas,
            totalPlanificado,
            totalProducido,
            totalRechazado,
            eficiencia,
        }
    }
}
