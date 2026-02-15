"use server"

import { createClient } from "@/lib/supabase/server"

export interface Alerta {
    id: string
    tipo: "stock_bajo" | "caducidad_proxima" | "stock_critico"
    prioridad: "alta" | "media" | "baja"
    titulo: string
    descripcion: string
    materia_prima?: {
        id: string
        nombre: string
        codigo: string
        stock_actual: number
        stock_minimo: number
        unidad_medida: string
    }
    lote?: {
        id: string
        numero_lote: string
        fecha_caducidad: string
        cantidad: number
        producto: { nombre: string }
    }
}

// ===========================================
// OBTENER TODAS LAS ALERTAS
// ===========================================
export async function getAlertas() {
    const supabase = await createClient()
    const alertas: Alerta[] = []

    // 1. Alertas de Stock Bajo
    const { data: materiasBajas } = await supabase
        .from("materias_primas")
        .select("id, nombre, codigo, stock_actual, stock_minimo, unidad_medida")
        .eq("activo", true)
        .filter("stock_actual", "lt", "stock_minimo")

    materiasBajas?.forEach((materia) => {
        const porcentaje = (materia.stock_actual / materia.stock_minimo) * 100
        const esCritico = porcentaje < 25

        alertas.push({
            id: `stock-${materia.id}`,
            tipo: esCritico ? "stock_critico" : "stock_bajo",
            prioridad: esCritico ? "alta" : "media",
            titulo: esCritico ? "Stock Crítico" : "Stock Bajo",
            descripcion: `${materia.nombre} tiene solo ${materia.stock_actual} ${materia.unidad_medida} (mínimo: ${materia.stock_minimo})`,
            materia_prima: materia,
        })
    })

    // 2. Alertas de Caducidad Próxima (próximos 7 días)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + 7)

    const { data: lotesProximos } = await supabase
        .from("lotes_produccion")
        .select(`
            id,
            numero_lote,
            fecha_caducidad,
            cantidad,
            producto:productos(nombre)
        `)
        .in("estado", ["disponible", "reservado"])
        .lte("fecha_caducidad", fechaLimite.toISOString().split("T")[0])
        .gte("fecha_caducidad", new Date().toISOString().split("T")[0])

    lotesProximos?.forEach((lote) => {
        const diasRestantes = Math.ceil(
            (new Date(lote.fecha_caducidad).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )

        let prioridad: "alta" | "media" | "baja" = "baja"
        if (diasRestantes <= 2) prioridad = "alta"
        else if (diasRestantes <= 5) prioridad = "media"

        alertas.push({
            id: `caducidad-${lote.id}`,
            tipo: "caducidad_proxima",
            prioridad,
            titulo: `Caducidad en ${diasRestantes} día${diasRestantes > 1 ? "s" : ""}`,
            descripcion: `Lote ${lote.numero_lote} de ${lote.producto?.nombre || "producto"} caduca el ${new Date(lote.fecha_caducidad).toLocaleDateString("es-ES")}`,
            lote,
        })
    })

    // 3. Lotes ya caducados
    const { data: lotesCaducados } = await supabase
        .from("lotes_produccion")
        .select(`
            id,
            numero_lote,
            fecha_caducidad,
            cantidad,
            producto:productos(nombre)
        `)
        .in("estado", ["disponible", "reservado"])
        .lt("fecha_caducidad", new Date().toISOString().split("T")[0])

    lotesCaducados?.forEach((lote) => {
        alertas.push({
            id: `caducado-${lote.id}`,
            tipo: "caducidad_proxima",
            prioridad: "alta",
            titulo: "Lote Caducado",
            descripcion: `Lote ${lote.numero_lote} de ${lote.producto?.nombre || "producto"} está caducado desde el ${new Date(lote.fecha_caducidad).toLocaleDateString("es-ES")}`,
            lote,
        })
    })

    // Ordenar por prioridad
    const prioridadOrden = { alta: 1, media: 2, baja: 3 }
    alertas.sort((a, b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad])

    return { data: alertas }
}

// ===========================================
// MARCAR LOTE COMO CADUCADO
// ===========================================
export async function marcarLoteCaducado(loteId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("lotes_produccion")
        .update({ estado: "caducado" })
        .eq("id", loteId)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

// ===========================================
// CREAR ORDEN DE COMPRA DESDE ALERTA
// ===========================================
export async function crearOrdenCompraDesdellerta(materiaPrimaId: string) {
    const supabase = await createClient()

    // Obtener materia prima
    const { data: materia } = await supabase
        .from("materias_primas")
        .select("*, proveedor:proveedores(*)")
        .eq("id", materiaPrimaId)
        .single()

    if (!materia || !materia.proveedor_principal_id) {
        return { error: "No hay proveedor configurado para esta materia prima" }
    }

    // Calcular cantidad sugerida (el doble del stock mínimo)
    const cantidadSugerida = materia.stock_minimo * 2

    return {
        data: {
            proveedor_id: materia.proveedor_principal_id,
            materia_prima_id: materiaPrimaId,
            cantidad_sugerida: cantidadSugerida,
        }
    }
}
