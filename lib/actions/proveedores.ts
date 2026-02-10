'use server'

import { createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function mergeProveedores(sourceId: string, targetId: string) {
    const supabase = await createAdminClient()

    try {
        if (!sourceId || !targetId) {
            return { success: false, error: "Se requieren ambos proveedores" }
        }

        if (sourceId === targetId) {
            return { success: false, error: "No puedes fusionar un proveedor consigo mismo" }
        }

        // 1. Verificar existencia
        const { data: source } = await supabase.from("proveedores").select("id").eq("id", sourceId).single()
        const { data: target } = await supabase.from("proveedores").select("id").eq("id", targetId).single()

        if (!source || !target) {
            return { success: false, error: "Uno de los proveedores no existe" }
        }

        // 2. Mover gastos del source al target
        const { error: updateError } = await supabase
            .from("gastos")
            .update({ proveedor_id: targetId })
            .eq("proveedor_id", sourceId)

        if (updateError) {
            return { success: false, error: `Error al mover facturas: ${updateError.message}` }
        }

        // 2.1 Mover productos asociados (si existen)
        try {
            await supabase
                .from("productos")
                .update({ proveedor_id: targetId })
                .eq("proveedor_id", sourceId)
        } catch (e) {
            // Ignorar si no existe, es opcional
            console.warn("No se pudieron mover productos (quizás no existe la relación)", e)
        }

        // 3. Eliminar proveedor source
        const { error: deleteError, count } = await supabase
            .from("proveedores")
            .delete({ count: 'exact' })
            .eq("id", sourceId)

        if (deleteError) {
            return { success: false, error: `No se pudo eliminar: ${deleteError.message}` }
        }

        if (count === 0) {
            return { success: false, error: "No se pudo eliminar el proveedor (posiblemente por permisos RLS o ya fue eliminado)" }
        }

        revalidatePath("/proveedores")
        revalidatePath(`/proveedores/${targetId}`)

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || "Error desconocido al fusionar" }
    }
}

export async function deleteProveedorAction(id: string) {
    const supabase = await createAdminClient()

    try {
        // DEBUG: Verificar si existe antes de borrar
        const { data: exists, error: findError } = await supabase
            .from("proveedores")
            .select("id, nombre")
            .eq("id", id)
            .maybeSingle()

        if (findError) {
            return { success: false, error: `Error buscándolo: ${findError.message}` }
        }

        if (!exists) {
            return { success: false, error: `El proveedor con ID ${id} NO existe en la base de datos (según admin client).` }
        }

        const { error, count } = await supabase
            .from("proveedores")
            .delete({ count: 'exact' })
            .eq("id", id)

        if (error) {
            return { success: false, error: `No se pudo eliminar: ${error.message} (Código: ${error.code})` }
        }

        if (count === 0) {
            return { success: false, error: `Se encontró el proveedor '${exists.nombre}' pero el DELETE retornó 0. Posible Trigger bloqueante.` }
        }

        revalidatePath("/proveedores")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || "Error desconocido al eliminar" }
    }
}
