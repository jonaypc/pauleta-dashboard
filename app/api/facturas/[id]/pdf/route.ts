import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import jsPDF from "jspdf"

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = await createClient()
    const id = params.id

    // Obtener datos de la factura
    const { data: factura, error } = await supabase
        .from("facturas")
        .select(`
            *,
            cliente:clientes(*),
            lineas:lineas_factura(*)
        `)
        .eq("id", id)
        .single()

    if (error || !factura) {
        return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    // Obtener datos de la empresa
    const { data: empresa } = await supabase
        .from("empresa")
        .select("*")
        .single()

    // Crear PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Configuración
    const marginLeft = 20
    const marginRight = 20
    let y = 20

    // Encabezado - Logo/Nombre empresa
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text(empresa?.nombre || "Pauleta Canaria S.L.", marginLeft, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    if (empresa?.direccion) {
        doc.text(empresa.direccion, marginLeft, y)
        y += 5
    }
    if (empresa?.cif) {
        doc.text(`CIF: ${empresa.cif}`, marginLeft, y)
        y += 5
    }
    if (empresa?.telefono || empresa?.email) {
        doc.text(`${empresa?.telefono || ""} | ${empresa?.email || ""}`, marginLeft, y)
        y += 5
    }

    // Número de factura (derecha)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text(`FACTURA`, pageWidth - marginRight, 25, { align: "right" })
    doc.setFontSize(14)
    doc.text(factura.numero || "", pageWidth - marginRight, 35, { align: "right" })

    // Fecha
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const fecha = new Date(factura.fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    })
    doc.text(`Fecha: ${fecha}`, pageWidth - marginRight, 45, { align: "right" })

    y = 60

    // Línea separadora
    doc.setDrawColor(200, 200, 200)
    doc.line(marginLeft, y, pageWidth - marginRight, y)
    y += 10

    // Datos del cliente
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("CLIENTE", marginLeft, y)
    y += 6

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(factura.cliente?.nombre || "Sin cliente", marginLeft, y)
    y += 5
    if (factura.cliente?.persona_contacto) {
        doc.text(`Attn: ${factura.cliente.persona_contacto}`, marginLeft, y)
        y += 5
    }
    if (factura.cliente?.direccion) {
        doc.text(factura.cliente.direccion, marginLeft, y)
        y += 5
    }
    if (factura.cliente?.cif) {
        doc.text(`CIF: ${factura.cliente.cif}`, marginLeft, y)
        y += 5
    }

    y += 10

    // Tabla de productos
    doc.setFillColor(245, 245, 245)
    doc.rect(marginLeft, y, pageWidth - marginLeft - marginRight, 8, "F")

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Descripción", marginLeft + 2, y + 5.5)
    doc.text("Cant.", 110, y + 5.5)
    doc.text("Precio", 130, y + 5.5)
    doc.text("IGIC", 155, y + 5.5)
    doc.text("Subtotal", pageWidth - marginRight - 2, y + 5.5, { align: "right" })
    y += 10

    // Líneas de factura
    doc.setFont("helvetica", "normal")
    const lineas = factura.lineas || []
    for (const linea of lineas) {
        if (y > 250) {
            doc.addPage()
            y = 20
        }

        const descripcion = linea.descripcion || "Producto"
        doc.text(descripcion.substring(0, 45), marginLeft + 2, y + 4)
        doc.text(String(linea.cantidad), 110, y + 4)
        doc.text(`${linea.precio_unitario.toFixed(2)} €`, 130, y + 4)
        doc.text(`${linea.igic || 7}%`, 155, y + 4)
        doc.text(`${linea.subtotal.toFixed(2)} €`, pageWidth - marginRight - 2, y + 4, { align: "right" })

        y += 8
    }

    y += 5
    doc.line(marginLeft, y, pageWidth - marginRight, y)
    y += 10

    // Totales
    const totalsX = 130
    doc.setFontSize(10)
    doc.text("Base Imponible:", totalsX, y)
    doc.text(`${factura.base_imponible.toFixed(2)} €`, pageWidth - marginRight, y, { align: "right" })
    y += 6

    doc.text("IGIC:", totalsX, y)
    doc.text(`${factura.igic.toFixed(2)} €`, pageWidth - marginRight, y, { align: "right" })
    y += 6

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("TOTAL:", totalsX, y)
    doc.text(`${factura.total.toFixed(2)} €`, pageWidth - marginRight, y, { align: "right" })

    y += 20

    // Datos de pago
    if (empresa?.cuenta_bancaria) {
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.text("Datos para transferencia:", marginLeft, y)
        y += 5
        doc.text(`IBAN: ${empresa.cuenta_bancaria}`, marginLeft, y)
    }

    // Generar PDF como buffer
    const pdfBuffer = doc.output("arraybuffer")

    // Devolver PDF
    return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${factura.numero || "factura"}.pdf"`,
        },
    })
}
