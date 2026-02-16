import jsPDF from 'jspdf'
import type { Empresa, Cliente, LineaFactura } from '@/types'

interface InvoicePDFData {
  factura: {
    numero: string
    fecha: string
    base_imponible: number
    igic: number
    total: number
    estado: string
    notas?: string | null
    lineas?: LineaFactura[]
  }
  cliente: Cliente
  empresa: Empresa
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

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Buffer> {
  const { factura, cliente, empresa } = data
  const color = empresa.color_primario || "#1e40af"

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 20

  // Helper: hex to RGB
  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [30, 64, 175]
  }

  const [r, g, b] = hexToRgb(color)

  // === HEADER: Company logo + name ===
  const mostrarLogo = empresa.mostrar_logo ?? true
  const logoWidth = empresa.logo_width || 80
  let logoAdded = false

  if (mostrarLogo && empresa.logo_url) {
    try {
      console.log('[PDF] Fetching logo from:', empresa.logo_url)
      const response = await fetch(empresa.logo_url)
      console.log('[PDF] Logo fetch status:', response.status, response.statusText)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const contentType = response.headers.get('content-type') || 'image/png'
        // Detect format from URL extension if content-type is generic
        const url = empresa.logo_url.toLowerCase()
        let ext: 'JPEG' | 'PNG' = 'PNG'
        if (contentType.includes('jpeg') || contentType.includes('jpg') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
          ext = 'JPEG'
        }
        const dataUrl = `data:${contentType};base64,${base64}`

        // Logo dimensions in mm
        const logoHeightMm = Math.min(20, logoWidth * 0.25)
        const logoWidthMm = logoHeightMm * 2.5

        doc.addImage(dataUrl, ext, margin, y - 5, logoWidthMm, logoHeightMm)
        y += logoHeightMm + 2
        logoAdded = true
        console.log('[PDF] Logo added successfully, format:', ext, 'size:', arrayBuffer.byteLength, 'bytes')
      }
    } catch (logoError) {
      console.error('[PDF] Error fetching logo:', logoError)
    }
  } else {
    console.log('[PDF] No logo to add. mostrarLogo:', mostrarLogo, 'logo_url:', empresa.logo_url)
  }

  if (!logoAdded) {
    doc.setFontSize(20)
    doc.setTextColor(r, g, b)
    doc.setFont('helvetica', 'bold')
    doc.text(empresa.nombre || 'Pauleta Canaria SL', margin, y)
  } else {
    doc.setFontSize(14)
    doc.setTextColor(r, g, b)
    doc.setFont('helvetica', 'bold')
    doc.text(empresa.nombre || 'Pauleta Canaria SL', margin, y)
  }

  // Company details
  y += 6
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  if (empresa.cif) { doc.text(`CIF: ${empresa.cif}`, margin, y); y += 4 }
  if (empresa.direccion) { doc.text(empresa.direccion, margin, y); y += 4 }
  if (empresa.ciudad || empresa.codigo_postal) {
    doc.text(`${empresa.ciudad || ''}${empresa.provincia ? `, ${empresa.provincia}` : ''} ${empresa.codigo_postal || ''}`.trim(), margin, y)
    y += 4
  }
  if (empresa.telefono) { doc.text(`Tel: ${empresa.telefono}`, margin, y); y += 4 }
  if (empresa.email) { doc.text(empresa.email, margin, y); y += 4 }

  // === Invoice box (right side) ===
  const boxW = 65
  const boxX = pageWidth - margin - boxW
  const boxY = 15
  const boxH = 28

  doc.setFillColor(r, g, b)
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('FACTURA', boxX + boxW / 2, boxY + 8, { align: 'center' })

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`N.° ${factura.numero}`, boxX + boxW / 2, boxY + 17, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(formatFecha(factura.fecha), boxX + boxW / 2, boxY + 24, { align: 'center' })

  // === Separator ===
  y = Math.max(y, boxY + boxH) + 8
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // === Client info ===
  doc.setFontSize(9)
  doc.setTextColor(r, g, b)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURAR A', margin, y)
  y += 5

  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.text(cliente.nombre, margin, y)
  y += 5

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  if (cliente.cif) { doc.text(`CIF: ${cliente.cif}`, margin, y); y += 4 }
  if (cliente.direccion) { doc.text(cliente.direccion, margin, y); y += 4 }
  if (cliente.ciudad || cliente.codigo_postal) {
    doc.text(`${cliente.codigo_postal || ''} ${cliente.ciudad || ''}${cliente.provincia ? ` (${cliente.provincia})` : ''}`.trim(), margin, y)
    y += 4
  }

  // === Separator ===
  y += 4
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // === Items table ===
  const colWidths = [contentWidth * 0.45, contentWidth * 0.12, contentWidth * 0.18, contentWidth * 0.25]
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]]

  // Table header
  doc.setFillColor(248, 250, 252)
  doc.rect(margin, y - 4, contentWidth, 10, 'F')

  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPCION', colX[0], y + 2)
  doc.text('CANT.', colX[1] + colWidths[1] / 2, y + 2, { align: 'center' })
  doc.text('PRECIO', colX[2] + colWidths[2] - 2, y + 2, { align: 'right' })
  doc.text('IMPORTE', colX[3] + colWidths[3] - 2, y + 2, { align: 'right' })

  y += 10

  // Table rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const lineas = factura.lineas || []
  for (const linea of lineas) {
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    doc.setTextColor(51, 65, 81)
    const desc = linea.descripcion || ''
    const descLines = doc.splitTextToSize(desc, colWidths[0] - 4)
    doc.text(descLines, colX[0], y)

    doc.text(String(linea.cantidad), colX[1] + colWidths[1] / 2, y, { align: 'center' })
    doc.text(formatPrecio(linea.precio_unitario), colX[2] + colWidths[2] - 2, y, { align: 'right' })
    doc.text(formatPrecio(linea.subtotal), colX[3] + colWidths[3] - 2, y, { align: 'right' })

    const lineHeight = descLines.length * 4 + 4
    y += lineHeight

    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(0.2)
    doc.line(margin, y - 2, pageWidth - margin, y - 2)
  }

  // === Totals ===
  y += 6
  const totalsX = pageWidth - margin - 65
  const totalsW = 65

  // Background
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(totalsX, y - 4, totalsW, 36, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(totalsX, y - 4, totalsW, 36, 2, 2, 'S')

  // Subtotal
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal', totalsX + 4, y + 2)
  doc.setTextColor(51, 65, 81)
  doc.setFont('helvetica', 'bold')
  doc.text(formatPrecio(factura.base_imponible), totalsX + totalsW - 4, y + 2, { align: 'right' })

  // IGIC
  y += 8
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('IGIC', totalsX + 4, y + 2)
  doc.setTextColor(51, 65, 81)
  doc.setFont('helvetica', 'bold')
  doc.text(formatPrecio(factura.igic), totalsX + totalsW - 4, y + 2, { align: 'right' })

  // Total line
  y += 6
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.8)
  doc.line(totalsX + 4, y, totalsX + totalsW - 4, y)

  y += 7
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.text('Total', totalsX + 4, y + 2)
  doc.setFontSize(14)
  doc.setTextColor(r, g, b)
  doc.text(formatPrecio(factura.total), totalsX + totalsW - 4, y + 2, { align: 'right' })

  // === Footer ===
  const footerY = 270

  if (empresa.cuenta_bancaria) {
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text('CUENTA BANCARIA', pageWidth / 2, footerY, { align: 'center' })
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.text(empresa.cuenta_bancaria, pageWidth / 2, footerY + 5, { align: 'center' })
  }

  doc.setFontSize(9)
  doc.setTextColor(r, g, b)
  doc.setFont('helvetica', 'normal')
  doc.text('Gracias por su compra.', pageWidth / 2, footerY + 13, { align: 'center' })

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}
