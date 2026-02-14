"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { MateriaPrima, MateriaPrimaFormData } from "@/types"

// ===========================================
// OBTENER TODAS LAS MATERIAS PRIMAS
// ===========================================
export async function getMateriasPrimas() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("materias_primas")
        .select(`
            *,
            proveedor:proveedores(id, nombre)
        `)
        .order("nombre", { ascending: true })

    if (error) {
        console.error("Error fetching materias primas:", error)
        return { error: error.message }
    }

    return { data: data as MateriaPrima[] }
}

// ===========================================
// OBTENER MATERIA PRIMA POR ID
// ===========================================
export async function getMateriaPrimaById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("materias_primas")
        .select(`
            *,
            proveedor:proveedores(id, nombre)
        `)
        .eq("id", id)
        .single()

    if (error) {
        console.error("Error fetching materia prima:", error)
        return { error: error.message }
    }

    return { data: data as MateriaPrima }
}

// ===========================================
// CREAR MATERIA PRIMA
// ===========================================
export async function createMateriaPrima(formData: MateriaPrimaFormData) {
    const supabase = await createClient()

    // Verificar si el código ya existe
    const { data: existing } = await supabase
        .from("materias_primas")
        .select("id")
        .eq("codigo", formData.codigo)
        .single()

    if (existing) {
        return { error: "Ya existe una materia prima con ese código" }
    }

    const { data, error } = await supabase
        .from("materias_primas")
        .insert({
            codigo: formData.codigo,
            nombre: formData.nombre,
            categoria: formData.categoria,
            unidad_medida: formData.unidad_medida,
            stock_minimo: formData.stock_minimo,
            stock_maximo: formData.stock_maximo || null,
            proveedor_principal_id: formData.proveedor_principal_id || null,
            requiere_refrigeracion: formData.requiere_refrigeracion,
            dias_caducidad: formData.dias_caducidad || null,
            temperatura_almacenamiento: formData.temperatura_almacenamiento || null,
            descripcion: formData.descripcion || null,
            activo: true,
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating materia prima:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/materias-primas")
    return { data }
}

// ===========================================
// ACTUALIZAR MATERIA PRIMA
// ===========================================
export async function updateMateriaPrima(id: string, formData: MateriaPrimaFormData) {
    const supabase = await createClient()

    // Verificar si el código ya existe en otra materia prima
    const { data: existing } = await supabase
        .from("materias_primas")
        .select("id")
        .eq("codigo", formData.codigo)
        .neq("id", id)
        .single()

    if (existing) {
        return { error: "Ya existe otra materia prima con ese código" }
    }

    const { data, error } = await supabase
        .from("materias_primas")
        .update({
            codigo: formData.codigo,
            nombre: formData.nombre,
            categoria: formData.categoria,
            unidad_medida: formData.unidad_medida,
            stock_minimo: formData.stock_minimo,
            stock_maximo: formData.stock_maximo || null,
            proveedor_principal_id: formData.proveedor_principal_id || null,
            requiere_refrigeracion: formData.requiere_refrigeracion,
            dias_caducidad: formData.dias_caducidad || null,
            temperatura_almacenamiento: formData.temperatura_almacenamiento || null,
            descripcion: formData.descripcion || null,
        })
        .eq("id", id)
        .select()
        .single()

    if (error) {
        console.error("Error updating materia prima:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/materias-primas")
    return { data }
}

// ===========================================
// TOGGLE ACTIVO/INACTIVO
// ===========================================
export async function toggleMateriaPrimaActivo(id: string, activo: boolean) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("materias_primas")
        .update({ activo })
        .eq("id", id)
        .select()
        .single()

    if (error) {
        console.error("Error toggling materia prima:", error)
        return { error: error.message }
    }

    revalidatePath("/produccion/materias-primas")
    return { data }
}

// ===========================================
// AJUSTAR STOCK MANUALMENTE
// ===========================================
export async function ajustarStockMateriaPrima(
    materiaPrimaId: string,
    cantidad: number,
    motivo: string,
    notas?: string
) {
    const supabase = await createClient()

    // Obtener stock actual
    const { data: materia, error: materiaError } = await supabase
        .from("materias_primas")
        .select("stock_actual, nombre")
        .eq("id", materiaPrimaId)
        .single()

    if (materiaError || !materia) {
        return { error: "Materia prima no encontrada" }
    }

    const stockAnterior = materia.stock_actual
    const stockNuevo = stockAnterior + cantidad

    if (stockNuevo < 0) {
        return { error: "El stock no puede ser negativo" }
    }

    // Registrar movimiento
    const { error: movimientoError } = await supabase
        .from("movimientos_inventario")
        .insert({
            materia_prima_id: materiaPrimaId,
            tipo: "ajuste",
            cantidad: cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            referencia_tipo: "ajuste_manual",
            motivo: motivo,
            notas: notas || null,
        })

    if (movimientoError) {
        console.error("Error creating movement:", movimientoError)
        return { error: movimientoError.message }
    }

    // El trigger actualizar_stock_materia_prima() se encargará de actualizar el stock

    revalidatePath("/produccion/materias-primas")
    return { success: true }
}

// ===========================================
// OBTENER MOVIMIENTOS DE INVENTARIO
// ===========================================
export async function getMovimientosInventario(materiaPrimaId?: string, limit = 50) {
    const supabase = await createClient()

    let query = supabase
        .from("movimientos_inventario")
        .select(`
            *,
            materia_prima:materias_primas(id, nombre, codigo)
        `)
        .order("fecha", { ascending: false })
        .limit(limit)

    if (materiaPrimaId) {
        query = query.eq("materia_prima_id", materiaPrimaId)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching movimientos:", error)
        return { error: error.message }
    }

    return { data }
}

// ===========================================
// OBTENER MATERIAS PRIMAS CON STOCK BAJO
// ===========================================
export async function getMateriasPrimasStockBajo() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("materias_primas")
        .select("*")
        .eq("activo", true)

    if (error) {
        console.error("Error fetching materias primas:", error)
        return { error: error.message }
    }

    // Filtrar en el cliente las que tienen stock bajo
    const stockBajo = data?.filter(m => m.stock_actual <= m.stock_minimo) || []

    return { data: stockBajo }
}

// ===========================================
// OBTENER ESTADÍSTICAS DE MATERIAS PRIMAS
// ===========================================
export async function getEstadisticasMateriasPrimas() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("materias_primas")
        .select("*")
        .eq("activo", true)

    if (error) {
        console.error("Error fetching stats:", error)
        return { error: error.message }
    }

    const total = data?.length || 0
    const stockBajo = data?.filter(m => m.stock_actual <= m.stock_minimo).length || 0
    const sinStock = data?.filter(m => m.stock_actual === 0).length || 0
    const valorTotal = data?.reduce((sum, m) => sum + (m.stock_actual * m.costo_promedio), 0) || 0

    return {
        data: {
            total,
            stockBajo,
            sinStock,
            valorTotal,
        }
    }
}
