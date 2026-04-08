import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendConsolidatedInvoiceEmail } from "@/lib/email"

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
            .order("fecha", { ascending: true })

        if (error || !facturas || facturas.length === 0) {
            return NextResponse.json(
                { error: "Error al obtener facturas" },
                { status: 500 }
            )
        }

        // Validate all invoices belong to the same client
        const clienteIds = new Set(facturas.map(f => f.cliente_id))
        if (clienteIds.size > 1) {
            return NextResponse.json(
                { error: "Todas las facturas deben ser del mismo cliente" },
                { status: 400 }
            )
        }

        const cliente = facturas[0].cliente
        if (!cliente?.email) {
            return NextResponse.json(
                { error: "El cliente no tiene email configurado" },
                { status: 400 }
            )
        }

        // Fetch empresa
        const { data: empresa } = await supabase
            .from("empresa")
            .select("*")
            .single()

        const empresaNombre = empresa?.nombre || "Pauleta Canaria S.L."

        // Generate individual PDFs
        const pdfAttachments: { filename: string; content: Buffer }[] = []

        const { generateInvoicePDF, generateConsolidatedPDF } = await import("@/lib/pdf-generator")

        for (const factura of facturas) {
            try {
                const pdfBuffer = await generateInvoicePDF({
                    factura: {
                        ...factura,
                        lineas: factura.lineas || [],
                    },
                    cliente,
                    empresa: empresa || ({ nombre: empresaNombre } as any),
                })
                pdfAttachments.push({
                    filename: `Factura-${factura.numero}.pdf`,
                    content: pdfBuffer,
                })
            } catch (pdfError) {
                console.error(`[CONSOLIDATED] Error generating PDF for ${factura.numero}:`, pdfError)
            }
        }

        // Generate consolidated summary PDF
        try {
            const consolidatedPdf = await generateConsolidatedPDF({
                facturas: facturas.map(f => ({
                    numero: f.numero,
                    fecha: f.fecha,
                    base_imponible: f.base_imponible,
                    igic: f.igic,
                    total: f.total,
                })),
                cliente,
                empresa: empresa || ({ nombre: empresaNombre } as any),
            })

            // Determine period label for filename
            const fechas = facturas.map(f => new Date(f.fecha))
            const mesMin = fechas.reduce((min, d) => d < min ? d : min, fechas[0])
            const mesMax = fechas.reduce((max, d) => d > max ? d : max, fechas[0])
            const periodoFile = mesMin.getMonth() === mesMax.getMonth() && mesMin.getFullYear() === mesMax.getFullYear()
                ? `${mesMin.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`
                : `${mesMin.toLocaleDateString("es-ES", { month: "short", year: "numeric" })}-${mesMax.toLocaleDateString("es-ES", { month: "short", year: "numeric" })}`

            pdfAttachments.unshift({
                filename: `Resumen-Facturas-${periodoFile.replace(/\s/g, '-')}.pdf`,
                content: consolidatedPdf,
            })
        } catch (pdfError) {
            console.error("[CONSOLIDATED] Error generating consolidated PDF:", pdfError)
        }

        // Create email tracking records for each invoice
        const trackingIds: string[] = []
        for (const factura of facturas) {
            const { data: tracking } = await supabase
                .from("email_tracking")
                .insert({
                    factura_id: factura.id,
                    email_to: cliente.email,
                    estado: "enviado",
                    enviado_at: new Date().toISOString(),
                    metadata: { tipo: "consolidado", facturas_count: facturas.length },
                })
                .select("id")
                .single()

            if (tracking?.id) {
                trackingIds.push(tracking.id)
            }
        }

        // Use the first tracking ID for the tracking pixel
        const trackingId = trackingIds[0] || undefined
        const totalGlobal = facturas.reduce((sum, f) => sum + f.total, 0)

        // Send consolidated email
        const emailResult = await sendConsolidatedInvoiceEmail({
            to: cliente.email,
            clienteNombre: cliente.nombre,
            empresaNombre,
            facturas: facturas.map(f => ({
                numero: f.numero,
                fecha: f.fecha,
                total: f.total,
            })),
            totalGlobal,
            trackingId,
            pdfAttachments,
        })

        // Update all tracking records with Resend email ID
        if (emailResult?.id) {
            for (const tid of trackingIds) {
                await supabase
                    .from("email_tracking")
                    .update({
                        resend_email_id: emailResult.id,
                        metadata: {
                            tipo: "consolidado",
                            facturas_count: facturas.length,
                            resend_id: emailResult.id,
                        },
                    })
                    .eq("id", tid)
            }
        }

        return NextResponse.json({
            success: true,
            enviadas: facturas.length,
            clienteEmail: cliente.email,
            clienteNombre: cliente.nombre,
        })
    } catch (error) {
        console.error("[CONSOLIDATED] Error:", error)
        const msg = error instanceof Error ? error.message : "Error desconocido"
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
