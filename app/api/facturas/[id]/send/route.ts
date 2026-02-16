import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendInvoiceEmail } from "@/lib/email"

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()

        // Obtener factura con cliente y líneas
        const { data: factura, error } = await supabase
            .from("facturas")
            .select(`
                *,
                cliente:clientes(*),
                lineas:lineas_factura(*, producto:productos!lineas_factura_producto_id_fkey(codigo_barras, nombre))
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
            .select("*")
            .single()

        const empresaNombre = empresa?.nombre || "Pauleta Canaria S.L."
        console.log('[SEND] Empresa logo_url:', empresa?.logo_url, 'mostrar_logo:', empresa?.mostrar_logo)

        // Crear registro de tracking ANTES de enviar
        const { data: tracking, error: trackingError } = await supabase
            .from("email_tracking")
            .insert({
                factura_id: params.id,
                email_to: factura.cliente.email,
                estado: 'enviado',
                enviado_at: new Date().toISOString(),
            })
            .select("id")
            .single()

        if (trackingError) {
            console.error("Error creating tracking record:", trackingError)
        }

        const trackingId = tracking?.id || undefined

        // Generar PDF de la factura (import dinámico para evitar problemas en serverless)
        let pdfBuffer: Buffer | undefined
        try {
            const { generateInvoicePDF } = await import("@/lib/pdf-generator")
            pdfBuffer = await generateInvoicePDF({
                factura: {
                    ...factura,
                    lineas: factura.lineas || [],
                },
                cliente: factura.cliente,
                empresa: empresa || { nombre: empresaNombre } as any,
            })
        } catch (pdfError: unknown) {
            const msg = pdfError instanceof Error ? pdfError.message : String(pdfError)
            console.error("Error generating PDF (sending without attachment):", msg)
        }

        // Construir URL de la factura
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const printUrl = `${baseUrl}/print/facturas/${params.id}`

        // Enviar email con PDF adjunto y tracking pixel
        const emailResult = await sendInvoiceEmail({
            to: factura.cliente.email,
            facturaNumero: factura.numero,
            clienteNombre: factura.cliente.nombre,
            total: factura.total,
            fecha: factura.fecha,
            empresaNombre,
            printUrl,
            trackingId,
            pdfBuffer,
        })

        // Actualizar tracking con el ID de Resend
        if (trackingId && emailResult?.id) {
            await supabase
                .from("email_tracking")
                .update({
                    resend_email_id: emailResult.id,
                    metadata: { resend_id: emailResult.id },
                })
                .eq("id", trackingId)
        }

        // Registrar notificación (compatibilidad con sistema existente)
        await supabase.from("notificaciones").insert({
            tipo: "factura_emitida",
            mensaje: `Factura ${factura.numero} enviada a ${factura.cliente.email}`,
            enviada: true,
            fecha_envio: new Date().toISOString(),
            metadata: {
                factura_id: params.id,
                email: factura.cliente.email,
                tracking_id: trackingId,
            },
        })

        return NextResponse.json({
            success: true,
            message: `Email enviado a ${factura.cliente.email}`,
            trackingId,
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
