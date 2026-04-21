import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()

        const { data: presupuesto, error } = await supabase
            .from("presupuestos")
            .select(`
                *,
                cliente:clientes(*),
                lineas:lineas_presupuesto(*, producto:productos(nombre))
            `)
            .eq("id", params.id)
            .single()

        if (error || !presupuesto) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 })
        }

        const { data: empresa } = await supabase
            .from("empresa")
            .select("*")
            .single()

        const { generatePresupuestoPDF } = await import("@/lib/pdf-generator")

        const pdfBuffer = await generatePresupuestoPDF({
            presupuesto: {
                ...presupuesto,
                lineas: presupuesto.lineas || [],
            },
            cliente: presupuesto.cliente || { nombre: "Sin cliente" } as any,
            empresa: empresa || { nombre: "Pauleta Canaria S.L." } as any,
        })

        const safeName = (presupuesto.numero || presupuesto.id).replace(/[/\\?%*:|"<>]/g, "-")

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
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
