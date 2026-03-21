import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendPresupuestoEmail } from "@/lib/email"

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()

        // Obtener presupuesto con cliente y líneas
        const { data: presupuesto, error } = await supabase
            .from("presupuestos")
            .select(`
                *,
                cliente:clientes(*),
                lineas:lineas_presupuesto(*)
            `)
            .eq("id", params.id)
            .single()

        if (error || !presupuesto) {
            return NextResponse.json(
                { error: "Presupuesto no encontrado" },
                { status: 404 }
            )
        }

        // Verificar que el cliente tenga email
        if (!presupuesto.cliente?.email) {
            return NextResponse.json(
                { error: "El cliente no tiene email configurado" },
                { status: 400 }
            )
        }

        // Obtener datos de empresa
        const { data: empresa } = await supabase
            .from("empresa")
            .select("*")
            .single()

        const empresaNombre = empresa?.nombre || "Pauleta Canaria S.L."

        // Generar PDF del presupuesto
        let pdfBuffer: Buffer | undefined
        try {
            const { generatePresupuestoPDF } = await import("@/lib/pdf-generator")
            pdfBuffer = await generatePresupuestoPDF({
                presupuesto: {
                    ...presupuesto,
                    lineas: presupuesto.lineas || [],
                },
                cliente: presupuesto.cliente,
                empresa: empresa || { nombre: empresaNombre } as any,
            })
        } catch (pdfError: unknown) {
            const msg = pdfError instanceof Error ? pdfError.message : String(pdfError)
            console.error("Error generating presupuesto PDF (sending without attachment):", msg)
        }

        // Enviar email con PDF adjunto
        await sendPresupuestoEmail({
            to: presupuesto.cliente.email,
            presupuestoNumero: presupuesto.numero,
            clienteNombre: presupuesto.cliente.nombre,
            total: presupuesto.total,
            fecha: presupuesto.fecha,
            fechaValidez: presupuesto.fecha_validez,
            empresaNombre,
            pdfBuffer,
        })

        // Cambiar estado a "enviado" si está en borrador
        if (presupuesto.estado === "borrador") {
            await supabase
                .from("presupuestos")
                .update({ estado: "enviado" })
                .eq("id", params.id)
        }

        return NextResponse.json({
            success: true,
            message: `Email enviado a ${presupuesto.cliente.email}`,
        })
    } catch (error: unknown) {
        console.error("Error sending presupuesto email:", error)
        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
