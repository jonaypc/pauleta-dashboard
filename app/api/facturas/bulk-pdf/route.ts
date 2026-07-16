import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import jsPDF from "jspdf"

export const maxDuration = 60

interface InvoiceData {
  numero: string
  fecha: string
  base_imponible: number
  igic: number
  total: number
  estado: string
  notas?: string | null
  lineas?: any[]
  cliente?: any
}

function formatPrecio(precio: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(precio)
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatFechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [30, 64, 175]
}

async function getImageDimensions(buffer: ArrayBuffer, format: 'PNG' | 'JPEG'): Promise<{ width: number; height: number } | null> {
  try {
    const view = new DataView(buffer)
    if (format === 'PNG') {
      if (buffer.byteLength > 24) {
        return { width: view.getUint32(16), height: view.getUint32(20) }
      }
    } else {
      let offset = 2
      while (offset < buffer.byteLength - 9) {
        if (view.getUint8(offset) === 0xFF) {
          const marker = view.getUint8(offset + 1)
          if (marker === 0xC0 || marker === 0xC2) {
            return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) }
          }
          const segLen = view.getUint16(offset + 2)
          offset += 2 + segLen
        } else {
          offset++
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

async function addInvoiceToDoc(
  doc: jsPDF,
  factura: InvoiceData,
  empresa: any,
  isFirst: boolean
): Promise<void> {
  if (!isFirst) {
    doc.addPage()
  }

  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 20

  const color = empresa.color_primario || "#1e40af"
  const [r, g, b] = hexToRgb(color)

  // Header con logo
  const mostrarLogo = empresa.mostrar_logo ?? true
  const logoWidth = empresa.logo_width || 80
  let logoAdded = false

  if (mostrarLogo && empresa.logo_url) {
    try {
      const response = await fetch(empresa.logo_url)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const ext = empresa.logo_url.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG'
        const dims = await getImageDimensions(arrayBuffer, ext)

        if (dims) {
          const aspectRatio = dims.height / dims.width
          const logoHeight = logoWidth * aspectRatio
          doc.addImage(`data:image/${ext.toLowerCase()};base64,${base64}`, ext, margin, y, logoWidth, logoHeight)
          logoAdded = true
          y += logoHeight + 5
        }
      }
    } catch (error) {
      console.error("Error loading logo:", error)
    }
  }

  // Nombre empresa
  if (!logoAdded) {
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(r, g, b)
    doc.text(empresa.nombre || "Pauleta Canaria S.L.", margin, y)
    y += 8
  }

  // Datos empresa
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  if (empresa.direccion) {
    doc.text(empresa.direccion, margin, y)
    y += 4
  }
  if (empresa.telefono || empresa.email) {
    const contacto = [empresa.telefono, empresa.email].filter(Boolean).join(" · ")
    doc.text(contacto, margin, y)
    y += 4
  }
  if (empresa.cif) {
    doc.text(`CIF: ${empresa.cif}`, margin, y)
    y += 4
  }

  // Título FACTURA
  y += 5
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(r, g, b)
  doc.text("FACTURA", pageWidth - margin, y, { align: 'right' })
  y += 2

  // Número y fecha
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(`Nº ${factura.numero}`, pageWidth - margin, y + 8, { align: 'right' })
  doc.text(`Fecha: ${formatFechaCorta(factura.fecha)}`, pageWidth - margin, y + 13, { align: 'right' })

  y += 20

  // Cliente
  doc.setFillColor(r, g, b)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text("CLIENTE", margin + 2, y + 5)

  y += 10
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(factura.cliente?.nombre || "Sin cliente", margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (factura.cliente?.direccion) {
    doc.text(factura.cliente.direccion, margin, y)
    y += 4
  }
  if (factura.cliente?.cif) {
    doc.text(`CIF: ${factura.cliente.cif}`, margin, y)
    y += 4
  }
  if (factura.cliente?.telefono) {
    doc.text(`Tel: ${factura.cliente.telefono}`, margin, y)
    y += 4
  }

  y += 8

  // Líneas de factura
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)

  doc.text("Concepto", margin + 2, y + 5)
  doc.text("Cant.", margin + 105, y + 5, { align: 'right' })
  doc.text("Precio", margin + 130, y + 5, { align: 'right' })
  doc.text("Total", pageWidth - margin - 2, y + 5, { align: 'right' })

  y += 10

  doc.setFont('helvetica', 'normal')

  const lineas = factura.lineas || []
  for (const linea of lineas) {
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    const concepto = linea.concepto || linea.producto?.nombre || ""
    doc.text(concepto, margin + 2, y)
    doc.text(linea.cantidad?.toString() || "0", margin + 105, y, { align: 'right' })
    doc.text(formatPrecio(linea.precio_unitario || 0), margin + 130, y, { align: 'right' })
    doc.text(formatPrecio((linea.cantidad || 0) * (linea.precio_unitario || 0)), pageWidth - margin - 2, y, { align: 'right' })
    y += 5
  }

  y += 10

  // Totales
  const totalesX = pageWidth - margin - 50
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text("Base imponible:", totalesX, y)
  doc.text(formatPrecio(factura.base_imponible), pageWidth - margin - 2, y, { align: 'right' })
  y += 6

  doc.text("IGIC (7%):", totalesX, y)
  doc.text(formatPrecio(factura.igic), pageWidth - margin - 2, y, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(r, g, b)
  doc.text("TOTAL:", totalesX, y)
  doc.text(formatPrecio(factura.total), pageWidth - margin - 2, y, { align: 'right' })

  // Notas
  if (factura.notas) {
    y += 15
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'italic')
    const lines = doc.splitTextToSize(factura.notas, contentWidth)
    doc.text(lines, margin, y)
  }

  // Footer con cuenta bancaria
  if (empresa.cuenta_bancaria) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Cuenta bancaria: ${empresa.cuenta_bancaria}`, margin, 285)
  }
}

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

    // Crear PDF combinado
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Agregar cada factura al PDF
    for (let i = 0; i < facturas.length; i++) {
      await addInvoiceToDoc(doc, facturas[i], empresa || { nombre: "Pauleta Canaria S.L." }, i === 0)
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `facturas_${timestamp}_${facturas.length}docs.pdf`

    return new NextResponse(pdfBuffer, {
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
