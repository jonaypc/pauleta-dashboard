'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function checkDuplicateExpense(numero: string, proveedorId: string) {
    const supabase = await createClient()

    // No check if number is empty
    if (!numero) return false

    const { data } = await supabase
        .from("gastos")
        .select("id")
        .eq("numero", numero)
        .eq("proveedor_id", proveedorId)
        .maybeSingle()

    return !!data
}

export async function checkDuplicateExpenseByNames(numero: string, proveedorNombre: string) {
    const supabase = await createClient()

    if (!numero || !proveedorNombre) return null

    // First find provider by name
    const { data: proveedor } = await supabase
        .from("proveedores")
        .select("id")
        .ilike("nombre", proveedorNombre)
        .maybeSingle()

    if (!proveedor) return null

    // Then check expense
    const { data: gasto } = await supabase
        .from("gastos")
        .select("id, fecha, importe")
        .eq("numero", numero)
        .eq("proveedor_id", proveedor.id)
        .maybeSingle()

    return gasto
}

export async function deleteGasto(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("gastos")
        .delete()
        .eq("id", id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath("/gastos")
    return { success: true }
}
