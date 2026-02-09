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

    // 3. Eliminar proveedor source
    const { error: deleteError } = await supabase
        .from("proveedores")
        .delete()
        .eq("id", sourceId)

    if (deleteError) {
        throw new Error(`Error al eliminar proveedor antiguo: ${deleteError.message}`)
    }

    revalidatePath("/proveedores")
    revalidatePath(`/proveedores/${targetId}`)

    return { success: true }
}
