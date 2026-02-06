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

export async function updateGastoStatus(id: string, status: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("gastos")
        .update({ estado: status })
        .eq("id", id)

    if (error) throw new Error(error.message)
    revalidatePath("/gastos")
    return { success: true }
}

export async function createBulkGastos(gastos: any[]) {
    const supabase = await createClient()

    const results = []
    const errors = []

    for (const gasto of gastos) {
        try {
            // 1. Gestionar Proveedor (Buscar o Crear)
            let proveedor_id = null
            if (gasto.nombre_proveedor) {
                const { data: existingProv } = await supabase
                    .from("proveedores")
                    .select("id")
                    .ilike("nombre", gasto.nombre_proveedor)
                    .maybeSingle()

                if (existingProv) {
                    proveedor_id = existingProv.id
                } else {
                    const { data: newProv, error: provError } = await supabase
                        .from("proveedores")
                        .insert({
                            nombre: gasto.nombre_proveedor,
                            cif: gasto.cif_proveedor,
                            categoria: "General" // Default category
                        })
                        .select("id")
                        .single()

                    if (provError) throw new Error(`Error creando proveedor: ${provError.message}`)
                    proveedor_id = newProv.id
                }
            }

            // 2. Insertar Gasto
            // Validar campos obligatorios minimos
            if (!gasto.fecha) gasto.fecha = new Date().toISOString()

            const { data: newGasto, error: gastoError } = await supabase
                .from("gastos")
                .insert({
                    fecha: gasto.fecha,
                    importe: gasto.importe || 0,
                    numero: gasto.numero,
                    concepto: gasto.concepto || `Gasto de ${gasto.nombre_proveedor || 'Desconocido'}`,
                    proveedor_id,
                    estado: "aprobado", // Auto-aprobar al importar en bulk? O mejor "pendiente"? El usuario dice "automaticamente"... dejemoslo aprobado o pendiente segun prefiera.
                    // Si se hace desde "Inbox" se supone que ya lo revisó. Pongamos "pendiente" de pago, pero "aprobado" como gasto valido. 
                    // En nuestra logica, estado es 'pendiente' (de pago?), 'pagado'?
                    // Revisando schema: estado VARCHAR(20) DEFAULT 'pendiente' -- pendiente, pagado
                    // Ok, estado se refiere al PAGO.
                    archivo_url: gasto.archivo_url, // URL del archivo subido
                    base_imponible: gasto.base_imponible,
                    iva: gasto.iva,
                    tipo_iva: 7.00 // Default, adjust if extracted
                })
                .select("id")
                .single()

            if (gastoError) throw new Error(`Error insertando gasto: ${gastoError.message}`)

            // 3. Insertar Líneas (Impuestos)
            if (gasto.desglose_impuestos && gasto.desglose_impuestos.length > 0) {
                const lineas = gasto.desglose_impuestos.map((imp: any) => ({
                    gasto_id: newGasto.id,
                    base_imponible: imp.base,
                    porcentaje: imp.porcentaje,
                    cuota: imp.cuota
                }))

                const { error: linesError } = await supabase
                    .from("lineas_gasto")
                    .insert(lineas)

                if (linesError) console.error("Error insertando líneas:", linesError)
            }

            results.push({ id: newGasto.id, numero: gasto.numero, status: 'success' })

        } catch (error: any) {
            console.error("Error procesando gasto bulk:", error)
            errors.push({ numero: gasto.numero, error: error.message })
        }
    }

    revalidatePath("/gastos")
    return { success: true, results, errors }
}
