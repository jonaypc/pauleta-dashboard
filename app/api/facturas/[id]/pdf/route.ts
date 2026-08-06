import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()

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
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
        }

        // Obtener factura rectificada manualmente si existe
        let facturaRectificada = null
        if (factura.factura_rectificada_id) {
            const { data: rectificada } = await supabase
                .from("facturas")
                .select("numero, fecha")
                .eq("id", factura.factura_rectificada_id)
                .single()
            facturaRectificada = rectificada
        }

        const { data: empresa } = await supabase
            .from("empresa")
            .select("*")
            .single()

        const { generateInvoicePDF } = await import("@/lib/pdf-generator")

        const pdfBuffer = await generateInvoicePDF({
            factura: {
                ...factura,
                lineas: factura.lineas || [],
                factura_rectificada: facturaRectificada,
            },
            cliente: factura.cliente || { nombre: "Sin cliente" } as any,
            empresa: empresa || { nombre: "Pauleta Canaria S.L." } as any,
        })

        const safeName = (factura.numero || factura.id).replace(/[/\\?%*:|"<>]/g, "-")

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${safeName}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error("PDF generation error:", error)
        return NextResponse.json(
            { error: error.message || "Error al generar PDF" },
            { status: 500 }
        )
    }
}
