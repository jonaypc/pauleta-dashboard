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
    try {
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
            console.error("Error saving movements in Supabase:", error)
            throw new Error(`Error de base de datos: ${error.message}`)
        }

        revalidatePath("/tesoreria")
        return {
            success: true,
            count: data?.length || 0
        }
    } catch (error: any) {
        console.error("Critical error in saveBankMovements:", error)
        throw new Error(error.message || "Error desconocido al guardar movimientos")
    }
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

export async function reconcileMovement(movementId: string, matchType: 'gasto' | 'factura', matchIds: string | string[]) {
    const supabase = await createClient()
    const ids = Array.isArray(matchIds) ? matchIds : [matchIds]

    // 1. Actualizar el movimiento de banco
    const { error: moveError } = await supabase
        .from("banco_movimientos")
        .update({
            estado: 'conciliado',
            match_type: matchType,
            match_id: ids[0] // Guardamos el primero para compatibilidad básica
        })
        .eq("id", movementId)

    if (moveError) throw new Error(moveError.message)

    // 2. Realizar acción según tipo para cada ID
    for (const matchId of ids) {
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
                // Necesitamos el total de la factura para saber cuánto cobrar si es pago total
                const { data: factura } = await supabase
                    .from("facturas")
                    .select("total")
                    .eq("id", matchId)
                    .single()

                const { error: cobroError } = await supabase
                    .from("cobros")
                    .insert({
                        factura_id: matchId,
                        importe: factura?.total || 0, // Asumimos pago total si se concilia así
                        fecha: movement.fecha,
                        metodo: 'transferencia',
                        notas: `Conciliado: ${movement.descripcion}${ids.length > 1 ? ' (Múltiple)' : ''}`
                    })

                if (cobroError) throw new Error(cobroError.message)

                // IMPORTANTE: Actualizar el estado de la factura a 'cobrada'
                const { error: invoiceStatusError } = await supabase
                    .from("facturas")
                    .update({ estado: 'cobrada' })
                    .eq("id", matchId)

                if (invoiceStatusError) throw new Error(invoiceStatusError.message)
            }
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
    startDate.setDate(startDate.getDate() - 45) // Ventana ampliada a 45 días
    const endDate = new Date(moveDate)
    endDate.setDate(endDate.getDate() + 15) // Ventana de 15 días después

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Margen de error para importes (fuzzy matching)
    // Usamos un pequeño margen para compensar redondeos o micro-comisiones
    const minAmount = parseFloat((absAmount - 0.05).toFixed(2))
    const maxAmount = parseFloat((absAmount + 0.05).toFixed(2))

    let suggestions: any[] = []

    if (movement.importe < 0) {
        // Buscar en GASTOS (Compras)
        const { data: gastos } = await supabase
            .from("gastos")
            .select("*, proveedor:proveedores(nombre)")
            .gte("importe", minAmount)
            .lte("importe", maxAmount)
            .eq("estado", "pendiente")
            .gte("fecha", startDateStr)
            .lte("fecha", endDateStr)

        suggestions = (gastos || []).map(g => ({
            id: g.id,
            type: 'gasto',
            date: g.fecha,
            amount: g.importe,
            entity: g.proveedor?.nombre || "Sin proveedor",
            reference: g.numero || "",
            matchScore: Math.abs(g.importe - absAmount) < 0.01 ? 100 : 80
        }))
    } else {
        // Buscar en FACTURAS (Ventas)
        const { data: facturas } = await supabase
            .from("facturas")
            .select("*, cliente:clientes(nombre)")
            .gte("total", minAmount)
            .lte("total", maxAmount)
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
            reference: f.numero || "",
            matchScore: Math.abs(f.total - absAmount) < 0.01 ? 100 : 80
        }))

        // Si es un ingreso, mostrar también facturas pendientes recientes como sugerencia "genérica"
        // Esto permite la conciliación manual aunque no coincida el importe total exacto
        const { data: recentPending } = await supabase
            .from("facturas")
            .select("*, cliente:clientes(nombre)")
            .neq("estado", "cobrada")
            .neq("estado", "anulada")
            .order("fecha", { ascending: false })
            .limit(10)

        const currentIds = new Set(suggestions.map(s => s.id))
        const extras = (recentPending || [])
            .filter(f => !currentIds.has(f.id))
            .map(f => ({
                id: f.id,
                type: 'factura',
                date: f.fecha,
                amount: f.total,
                entity: f.cliente?.nombre || "Sin cliente",
                reference: f.numero || "",
                matchScore: 10 // Valor bajo para ordenarlas al final
            }))

        suggestions = [...suggestions, ...extras]
    }

    return { movement, suggestions }
}

// ===========================================
// AUTOMATIZACIÓN BANCARIA (PSD2 / GOCARDLESS)
// ===========================================

import { gocardless } from "@/lib/gocardless"

export async function initiateBankConnection(institutionId: string) {
    const supabase = await createClient()
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tesoreria/configuracion/callback`
    const reference = `pauleta-${Date.now()}`

    try {
        const requisition = await gocardless.createRequisition(institutionId, redirectUrl, reference)

        // Guardar estado inicial en BD
        await supabase.from("bank_connections").insert({
            institution_id: institutionId,
            requisition_id: requisition.id,
            reference: reference,
            status: 'initiated'
        })

        return { url: requisition.link }
    } catch (error: any) {
        console.error("Error initiating bank connection:", error)
        throw new Error(error.message)
    }
}

export async function completeBankConnection(requisitionId: string) {
    const supabase = await createClient()

    try {
        const requisition = await gocardless.getRequisition(requisitionId)

        if (requisition.status === 'LN') { // Linked
            await supabase.from("bank_connections")
                .update({
                    status: 'linked',
                    agreement_id: requisition.agreement
                })
                .eq("requisition_id", requisitionId)

            return { success: true }
        }

        return { success: false, status: requisition.status }
    } catch (error: any) {
        console.error("Error completing bank connection:", error)
        throw new Error(error.message)
    }
}

export async function getBankInstitutions() {
    try {
        return await gocardless.getInstitutions("ES")
    } catch (error) {
        return []
    }
}
