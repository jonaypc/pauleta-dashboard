import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendInvoiceEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
    try {
        const { facturaIds } = await request.json()

        if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
            return NextResponse.json(
                { error: "Se requiere un array de IDs de facturas" },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Fetch all invoices with clients and lines
        const { data: facturas, error } = await supabase
            .from("facturas")
            .select(`
                *,
                cliente:clientes(*),
                lineas:lineas_factura(*, producto:productos!lineas_factura_producto_id_fkey(codigo_barras, nombre))
            `)
            .in("id", facturaIds)

        if (error || !facturas) {
            return NextResponse.json(
                { error: "Error al obtener facturas" },
                { status: 500 }
            )
        }

        // Fetch empresa once
        const { data: empresa } = await supabase
            .from("empresa")
            .select("*")
            .single()

        const empresaNombre = empresa?.nombre || "Pauleta Canaria S.L."
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

        const resultados = {
            enviados: 0,
            sinEmail: [] as string[],
            errores: [] as string[],
        }

        // Process each invoice sequentially
        for (const factura of facturas) {
            if (!factura.cliente?.email) {
                resultados.sinEmail.push(factura.numero)
                continue
            }

            try {
                // Create tracking record
                const { data: tracking } = await supabase
                    .from("email_tracking")
                    .insert({
                        factura_id: factura.id,
                        email_to: factura.cliente.email,
                        estado: "enviado",
                        enviado_at: new Date().toISOString(),
                    })
                    .select("id")
                    .single()

                const trackingId = tracking?.id || undefined

                // Generate PDF
                let pdfBuffer: Buffer | undefined
                try {
                    const { generateInvoicePDF } = await import("@/lib/pdf-generator")
                    pdfBuffer = await generateInvoicePDF({
                        factura: {
                            ...factura,
                            lineas: factura.lineas || [],
                        },
                        cliente: factura.cliente,
                        empresa: empresa || ({ nombre: empresaNombre } as any),
                    })
                } catch (pdfError) {
                    console.error(`[BULK] Error generating PDF for ${factura.numero}:`, pdfError)
                }

                // Send email
                const printUrl = `${baseUrl}/print/facturas/${factura.id}`
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

                // Update tracking with Resend ID
                if (trackingId && emailResult?.id) {
                    await supabase
                        .from("email_tracking")
                        .update({
                            resend_email_id: emailResult.id,
                            metadata: { resend_id: emailResult.id },
                        })
                        .eq("id", trackingId)
                }

                resultados.enviados++
            } catch (emailError) {
                console.error(`[BULK] Error sending ${factura.numero}:`, emailError)
                resultados.errores.push(factura.numero)
            }
        }

        return NextResponse.json(resultados)
    } catch (error) {
        console.error("[BULK] Error:", error)
        const msg = error instanceof Error ? error.message : "Error desconocido"
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
