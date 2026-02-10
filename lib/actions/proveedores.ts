'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function mergeProveedores(sourceId: string, targetId: string) {
    const supabase = await createClient()

    if (!sourceId || !targetId) {
        throw new Error("Se requieren ambos proveedores")
    }

    if (sourceId === targetId) {
        throw new Error("No puedes fusionar un proveedor consigo mismo")
    }

    // 1. Verificar existencia
    const { data: source } = await supabase.from("proveedores").select("id").eq("id", sourceId).single()
    const { data: target } = await supabase.from("proveedores").select("id").eq("id", targetId).single()

    if (!source || !target) {
        throw new Error("Uno de los proveedores no existe")
    }

    // 2. Mover gastos del source al target
    const { error: updateError } = await supabase
        .from("gastos")
        .update({ proveedor_id: targetId })
        .eq("proveedor_id", sourceId)

    if (updateError) {
        throw new Error(`Error al mover facturas: ${updateError.message}`)
    }

    // 2.1 Mover productos asociados (si existen)
    // Intentamos actualizar, si la tabla o columna no existe, fallaría... 
    // Pero como usamos Supabase client, si no existe el schema en tipos, podría dar warning.
    // Hacemos una llamada "loose" o verificamos si falla.
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
    try {
        const { error: deleteError } = await supabase
            .from("proveedores")
            .delete()
            .eq("id", sourceId)

        if (deleteError) {
            // Si falla por FK, es probable que haya otra tabla (no gastos/productos) bloqueando.
            // Lanzamos error para que el usuario lo vea.
            throw new Error(`No se pudo eliminar el proveedor antiguo: ${deleteError.message} (Código: ${deleteError.code})`)
        }
    } catch (error: any) {
        throw new Error(error.message)
    }

    revalidatePath("/proveedores")
    revalidatePath(`/proveedores/${targetId}`)

    return { success: true }
}
