"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ===========================================
// OBTENER TODAS LAS INSPECCIONES
// ===========================================
export async function getInspecciones() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("inspecciones_calidad")
        .select(`
            *,
            orden_produccion:ordenes_produccion(numero, producto:productos(nombre)),
            lote_produccion:lotes_produccion(numero_lote, producto:productos(nombre))
        `)
        .order("fecha", { ascending: false })

    if (error) {
        console.error("Error fetching inspecciones:", error)
        return { error: error.message }
    }

    return { data }
}

// ===========================================
// OBTENER INSPECCIÓN POR ID
// ===========================================
export async function getInspeccionById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("inspecciones_calidad")
        .select(`
            *,
            orden_produccion:ordenes_produccion(id, numero, producto:productos(nombre)),
            lote_produccion:lotes_produccion(id, numero_lote, producto:productos(nombre))
        `)
        .eq("id", id)
        .single()

    if (error) {
        console.error("Error fetching inspeccion:", error)
        return { error: error.message }
    }

    return { data }
}

// ===========================================
// CREAR INSPECCIÓN DE CALIDAD
// ===========================================
export async function createInspeccion(formData: {
    orden_produccion_id?: string
    lote_produccion_id?: string
    tipo: "materia_prima" | "proceso" | "producto_terminado"
    inspector: string
    resultado: "aprobado" | "rechazado" | "condicional" | "en_revision"
    cantidad_inspeccionada?: number
    cantidad_aprobada?: number
    cantidad_rechazada?: number
    motivo_rechazo?: string
    criterios_evaluados?: Record<string, any>
    observaciones?: string
    acciones_correctivas?: string
}) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("inspecciones_calidad")
        .insert({
            orden_produccion_id: formData.orden_produccion_id || null,
            lote_produccion_id: formData.lote_produccion_id || null,
            tipo: formData.tipo,
            fecha: new Date().toISOString(),
            inspector: formData.inspector,
            resultado: formData.resultado,
            cantidad_inspeccionada: formData.cantidad_inspeccionada || null,
            cantidad_aprobada: formData.cantidad_aprobada || null,
            cantidad_rechazada: formData.cantidad_rechazada || null,
            motivo_rechazo: formData.motivo_rechazo || null,
            criterios_evaluados: formData.criterios_evaluados || null,
            observaciones: formData.observaciones || null,
            acciones_correctivas: formData.acciones_correctivas || null,
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating inspeccion:", error)
        return { error: error.message }
    }

    // Si es inspección de lote y se rechaza, actualizar estado del lote
    if (formData.lote_produccion_id && formData.resultado === "rechazado") {
        await supabase
            .from("lotes_produccion")
            .update({ estado: "retirado" })
            .eq("id", formData.lote_produccion_id)
    }

    // Si es inspección de lote y se aprueba condicional, poner en cuarentena
    if (formData.lote_produccion_id && formData.resultado === "condicional") {
        await supabase
            .from("lotes_produccion")
            .update({ estado: "en_cuarentena" })
            .eq("id", formData.lote_produccion_id)
    }

    revalidatePath("/produccion/inspecciones")
    revalidatePath("/produccion/lotes")
    return { data }
}

// ===========================================
// ACTUALIZAR INSPECCIÓN
// ===========================================
export async function updateInspeccion(id: string, formData: {
    resultado?: "aprobado" | "rechazado" | "condicional" | "en_revision"
    cantidad_aprobada?: number
    cantidad_rechazada?: number
    motivo_rechazo?: string
    observaciones?: string
    acciones_correctivas?: string
}) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("inspecciones_calidad")
        .update(formData)
        .eq("id", id)
        .select()
        .single()

    if (error) {
        console.error("Error updating inspeccion:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/inspecciones")
    return { data }
}

// ===========================================
// ELIMINAR INSPECCIÓN
// ===========================================
export async function deleteInspeccion(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("inspecciones_calidad")
        .delete()
        .eq("id", id)

    if (error) {
        console.error("Error deleting inspeccion:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/inspecciones")
    return { success: true }
}

// ===========================================
// OBTENER ESTADÍSTICAS DE INSPECCIONES
// ===========================================
export async function getEstadisticasInspecciones() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("inspecciones_calidad")
        .select("*")

    if (error) {
        console.error("Error fetching stats:", error)
        return { error: error.message }
    }

    const total = data?.length || 0
    const aprobadas = data?.filter(i => i.resultado === "aprobado").length || 0
    const rechazadas = data?.filter(i => i.resultado === "rechazado").length || 0
    const condicionales = data?.filter(i => i.resultado === "condicional").length || 0
    const enRevision = data?.filter(i => i.resultado === "en_revision").length || 0

    const porcentajeAprobado = total > 0 ? (aprobadas / total) * 100 : 0

    // Contar por tipo
    const porTipo = {
        materia_prima: data?.filter(i => i.tipo === "materia_prima").length || 0,
        proceso: data?.filter(i => i.tipo === "proceso").length || 0,
        producto_terminado: data?.filter(i => i.tipo === "producto_terminado").length || 0,
    }

    return {
        data: {
            total,
            aprobadas,
            rechazadas,
            condicionales,
            enRevision,
            porcentajeAprobado,
            porTipo,
        }
    }
}

// ===========================================
// OBTENER INSPECCIONES POR ORDEN DE PRODUCCIÓN
// ===========================================
export async function getInspeccionesPorOrden(ordenId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("inspecciones_calidad")
        .select("*")
        .eq("orden_produccion_id", ordenId)
        .order("fecha", { ascending: false })

    if (error) {
        console.error("Error fetching inspecciones:", error)
        return { error: error.message }
    }

    return { data }
}

// ===========================================
// OBTENER INSPECCIONES POR LOTE
// ===========================================
export async function getInspeccionesPorLote(loteId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("inspecciones_calidad")
        .select("*")
        .eq("lote_produccion_id", loteId)
        .order("fecha", { ascending: false })

    if (error) {
        console.error("Error fetching inspecciones:", error)
        return { error: error.message }
    }

    return { data }
}
