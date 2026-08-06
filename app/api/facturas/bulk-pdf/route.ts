import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateBulkInvoicePDF } from "@/lib/pdf-generator"

export const maxDuration = 60

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

    // Obtener facturas
    const { data: facturasRaw, error: facturasError } = await supabase
      .from("facturas")
      .select(`
        *,
        cliente:clientes(*),
        lineas:lineas_factura(*, producto:productos!lineas_factura_producto_id_fkey(codigo_barras, nombre))
      `)
      .in("id", facturaIds)
      .order("fecha", { ascending: true })
      .order("numero", { ascending: true })

    if (facturasError || !facturasRaw || facturasRaw.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron facturas" },
        { status: 404 }
      )
    }

    // Obtener datos de empresa
    const { data: empresa } = await supabase
      .from("empresa")
      .select("*")
      .single()

    const empresaData = empresa || { nombre: "Pauleta Canaria S.L." } as any

    // Transformar datos al formato esperado
    const facturas = facturasRaw.map(f => ({
      factura: {
        ...f,
        lineas: f.lineas || [],
      },
      cliente: f.cliente || { nombre: "Sin cliente" } as any,
    }))

    // Generar PDF optimizado con todas las facturas en un solo documento
    const pdfBuffer = await generateBulkInvoicePDF({
      facturas,
      empresa: empresaData,
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `facturas_${timestamp}_${facturas.length}docs.pdf`

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error("Bulk PDF generation error:", error)
    return NextResponse.json(
      { error: error.message || "Error al generar PDFs combinados" },
      { status: 500 }
    )
  }
}
