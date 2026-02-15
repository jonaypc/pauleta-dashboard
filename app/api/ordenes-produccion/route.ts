import { NextRequest, NextResponse } from "next/server"
import { createOrdenProduccion } from "@/lib/actions/ordenes-produccion"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validar campos requeridos
        if (!body.producto_id) {
            return NextResponse.json(
                { error: "El campo producto_id es requerido" },
                { status: 400 }
            )
        }

        if (!body.cantidad_planificada || body.cantidad_planificada <= 0) {
            return NextResponse.json(
                { error: "La cantidad planificada debe ser mayor a 0" },
                { status: 400 }
            )
        }

        if (!body.fecha_planificada) {
            return NextResponse.json(
                { error: "La fecha planificada es requerida" },
                { status: 400 }
            )
        }

        const result = await createOrdenProduccion({
            producto_id: body.producto_id,
            receta_id: body.receta_id || undefined,
            cantidad_planificada: body.cantidad_planificada,
            fecha_planificada: body.fecha_planificada,
            prioridad: body.prioridad || 3,
            operario_responsable: body.operario_responsable || undefined,
            turno: body.turno || undefined,
            notas: body.notas || undefined,
        })

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            )
        }

        return NextResponse.json({ data: result.data }, { status: 201 })
    } catch (error: any) {
        console.error("Error in ordenes-produccion API:", error)
        return NextResponse.json(
            { error: error.message || "Error interno del servidor" },
            { status: 500 }
        )
    }
}
