import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendInvoiceEmail } from "@/lib/email"

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()

        // Obtener factura con cliente
        const { data: factura, error } = await supabase
            .from("facturas")
            .select(`
        *,
        cliente:clientes(*)
      `)
            .eq("id", params.id)
            .single()

        if (error || !factura) {
            return NextResponse.json(
                { error: "Factura no encontrada" },
                { status: 404 }
            )
        }

        // Verificar que el cliente tenga email
        if (!factura.cliente?.email) {
            return NextResponse.json(
                { error: "El cliente no tiene email configurado" },
                { status: 400 }
            )
        }

        // Obtener datos de empresa
        const { data: empresa } = await supabase
            .from("empresa")
            .select("nombre")
            .single()

        // Construir URL de la factura
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const printUrl = `${baseUrl}/print/facturas/${params.id}`

        // Enviar email
        await sendInvoiceEmail({
            to: factura.cliente.email,
            facturaNumero: factura.numero,
            clienteNombre: factura.cliente.nombre,
            total: factura.total,
            fecha: factura.fecha,
            empresaNombre: empresa?.nombre || "Pauleta Canaria S.L.",
            printUrl,
        })

        // Registrar notificación
        await supabase.from("notificaciones").insert({
            tipo: "factura_emitida",
            mensaje: `Factura ${factura.numero} enviada a ${factura.cliente.email}`,
            enviada: true,
            fecha_envio: new Date().toISOString(),
            metadata: {
                factura_id: params.id,
                email: factura.cliente.email,
            },
        })

        return NextResponse.json({
            success: true,
            message: `Email enviado a ${factura.cliente.email}`,
        })
    } catch (error: unknown) {
        console.error("Error sending email:", error)
        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
