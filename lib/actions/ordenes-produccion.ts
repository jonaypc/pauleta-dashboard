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

    // Si se completa, registrar fecha de fin y consumir materias primas
    if (estado === "completada") {
        updates.fecha_fin = new Date().toISOString()

        // Consumir materias primas automáticamente
        await consumirMateriasPrimasOrden(id)

        // Calcular costos
        await calcularCostosOrden(id)
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
// CONSUMIR MATERIAS PRIMAS DE UNA ORDEN
// ===========================================
async function consumirMateriasPrimasOrden(ordenId: string) {
    const supabase = await createClient()

    try {
        // Obtener la orden con su receta
        const { data: orden, error: ordenError } = await supabase
            .from("ordenes_produccion")
            .select(`
                *,
                receta:recetas(
                    id,
                    ingredientes:receta_ingredientes(
                        id,
                        materia_prima_id,
                        cantidad,
                        unidad,
                        materia_prima:materias_primas(id, nombre, stock_actual, costo_promedio)
                    )
                )
            `)
            .eq("id", ordenId)
            .single()

        if (ordenError || !orden || !orden.receta) {
            console.error("No se pudo obtener la receta:", ordenError)
            return
        }

        // Calcular factor de escala (cantidad producida vs rendimiento de receta)
        const cantidadProducida = orden.cantidad_producida || orden.cantidad_planificada
        const rendimiento = orden.receta.rendimiento || 1
        const factor = cantidadProducida / rendimiento

        // Consumir cada ingrediente
        for (const ingrediente of orden.receta.ingredientes || []) {
            const cantidadConsumida = ingrediente.cantidad * factor
            const materiaPrima = ingrediente.materia_prima

            if (!materiaPrima) continue

            // Obtener stock actual
            const stockActual = materiaPrima.stock_actual || 0

            // Crear movimiento de salida
            await supabase
                .from("movimientos_inventario")
                .insert({
                    materia_prima_id: ingrediente.materia_prima_id,
                    tipo: "salida",
                    cantidad: cantidadConsumida,
                    costo_unitario: materiaPrima.costo_promedio || 0,
                    costo_total: cantidadConsumida * (materiaPrima.costo_promedio || 0),
                    stock_anterior: stockActual,
                    stock_nuevo: stockActual - cantidadConsumida,
                    referencia_id: ordenId,
                    referencia_tipo: "orden_produccion",
                    motivo: `Consumo por orden ${orden.numero}`,
                })
        }

        console.log(`Materias primas consumidas para orden ${orden.numero}`)
    } catch (error) {
        console.error("Error al consumir materias primas:", error)
    }
}

// ===========================================
// CALCULAR COSTOS DE UNA ORDEN
// ===========================================
async function calcularCostosOrden(ordenId: string) {
    const supabase = await createClient()

    try {
        // Obtener movimientos de inventario de esta orden
        const { data: movimientos } = await supabase
            .from("movimientos_inventario")
            .select("costo_total")
            .eq("referencia_id", ordenId)
            .eq("referencia_tipo", "orden_produccion")
            .eq("tipo", "salida")

        const costoMateriasPrimas = movimientos?.reduce((sum, m) => sum + (m.costo_total || 0), 0) || 0

        // Actualizar costos en la orden
        await supabase
            .from("ordenes_produccion")
            .update({
                costo_materias_primas: costoMateriasPrimas,
                costo_total: costoMateriasPrimas, // Por ahora solo materias primas
            })
            .eq("id", ordenId)

        console.log(`Costos calculados para orden: ${costoMateriasPrimas}€`)
    } catch (error) {
        console.error("Error al calcular costos:", error)
    }
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
