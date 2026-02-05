'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface BankMovement {
    fecha: string
    importe: number
    descripcion: string
    referencia?: string
}

export async function saveBankMovements(movements: BankMovement[]) {
    const supabase = await createClient()

    // Insertar movimientos
    const { data, error } = await supabase
        .from("banco_movimientos")
        .insert(movements.map(m => ({
            fecha: m.fecha,
            importe: m.importe,
            descripcion: m.descripcion,
            referencia: m.referencia,
            estado: 'pendiente'
        })))
        .select()

    if (error) {
        console.error("Error saving movements", error)
        throw new Error(error.message)
    }

    revalidatePath("/tesoreria")
    return { success: true, count: data.length }
}

export async function getPendingBankMovements() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("banco_movimientos")
        .select("*")
        .eq("estado", "pendiente")
        .order("fecha", { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function reconcileMovement(movementId: string, matchType: 'gasto' | 'factura', matchId: string) {
    const supabase = await createClient()

    // 1. Actualizar el movimiento de banco
    const { error: moveError } = await supabase
        .from("banco_movimientos")
        .update({
            estado: 'conciliado',
            match_type: matchType,
            match_id: matchId
        })
        .eq("id", movementId)

    if (moveError) throw new Error(moveError.message)

    // 2. Realizar acción según tipo
    if (matchType === 'gasto') {
        const { error: gastoError } = await supabase
            .from("gastos")
            .update({ estado: 'pagado' })
            .eq("id", matchId)

        if (gastoError) throw new Error(gastoError.message)
    } else if (matchType === 'factura') {
        // Para facturas (ventas), creamos un registro de cobro
        const { data: movement } = await supabase
            .from("banco_movimientos")
            .select("importe, fecha, descripcion")
            .eq("id", movementId)
            .single()

        if (movement) {
            const { error: cobroError } = await supabase
                .from("cobros")
                .insert({
                    factura_id: matchId,
                    importe: movement.importe,
                    fecha: movement.fecha,
                    metodo: 'transferencia',
                    notas: `Conciliado: ${movement.descripcion}`
                })

            if (cobroError) throw new Error(cobroError.message)
        }
    }

    revalidatePath("/tesoreria")
    revalidatePath("/gastos")
    revalidatePath("/facturas")
    return { success: true }
}

export async function getReconciliationSuggestions(movementId: string) {
    const supabase = await createClient()

    // 1. Obtener el movimiento
    const { data: movement, error: moveError } = await supabase
        .from("banco_movimientos")
        .select("*")
        .eq("id", movementId)
        .single()

    if (moveError || !movement) throw new Error("Movimiento no encontrado")

    const absAmount = Math.abs(Number(movement.importe))
    const moveDate = new Date(movement.fecha)
    const startDate = new Date(moveDate)
    startDate.setDate(startDate.getDate() - 30) // Ventana de 30 días antes
    const endDate = new Date(moveDate)
    endDate.setDate(endDate.getDate() + 15) // Ventana de 15 días después

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    let suggestions: any[] = []

    if (movement.importe < 0) {
        // Buscar en GASTOS (Compras)
        const { data: gastos } = await supabase
            .from("gastos")
            .select("*, proveedor:proveedores(nombre)")
            .eq("importe", absAmount)
            .eq("estado", "pendiente")
            .gte("fecha", startDateStr)
            .lte("fecha", endDateStr)

        suggestions = (gastos || []).map(g => ({
            id: g.id,
            type: 'gasto',
            date: g.fecha,
            amount: g.importe,
            entity: g.proveedor?.nombre || "Sin proveedor",
            reference: g.numero || ""
        }))
    } else {
        // Buscar en FACTURAS (Ventas)
        const { data: facturas } = await supabase
            .from("facturas")
            .select("*, cliente:clientes(nombre)")
            .eq("total", absAmount)
            .neq("estado", "cobrada")
            .neq("estado", "anulada")
            .gte("fecha", startDateStr)
            .lte("fecha", endDateStr)

        suggestions = (facturas || []).map(f => ({
            id: f.id,
            type: 'factura',
            date: f.fecha,
            amount: f.total,
            entity: f.cliente?.nombre || "Sin cliente",
            reference: f.numero || ""
        }))
    }

    return { movement, suggestions }
}
