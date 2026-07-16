import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { PDFDocument } from 'pdf-lib'

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
    const { data: facturas, error: facturasError } = await supabase
      .from("facturas")
      .select(`
        *,
        cliente:clientes(*),
        lineas:lineas_factura(*, producto:productos!lineas_factura_producto_id_fkey(codigo_barras, nombre))
      `)
      .in("id", facturaIds)
      .order("fecha", { ascending: true })
      .order("numero", { ascending: true })

    if (facturasError || !facturas || facturas.length === 0) {
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

    // Generar PDF individual para cada factura usando la función existente
    const pdfBuffers: Buffer[] = []
    for (const factura of facturas) {
      const pdfBuffer = await generateInvoicePDF({
        factura: {
          ...factura,
          lineas: factura.lineas || [],
        },
        cliente: factura.cliente || { nombre: "Sin cliente" } as any,
        empresa: empresaData,
      })
      pdfBuffers.push(pdfBuffer)
    }

    // Combinar todos los PDFs en uno solo usando pdf-lib
    const mergedPdf = await PDFDocument.create()

    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page)
      })
    }

    const mergedPdfBytes = await mergedPdf.save()
    const mergedPdfBuffer = Buffer.from(mergedPdfBytes)

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `facturas_${timestamp}_${facturas.length}docs.pdf`

    return new NextResponse(mergedPdfBuffer, {
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
