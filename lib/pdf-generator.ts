import jsPDF from 'jspdf'
import type { Empresa, Cliente, LineaFactura, LineaPresupuesto } from '@/types'

// Parse image dimensions from binary data
function getImageDimensions(buffer: ArrayBuffer, format: 'PNG' | 'JPEG'): { width: number; height: number } | null {
  try {
    const view = new DataView(buffer)
    if (format === 'PNG') {
      // PNG: width at byte 16-19, height at byte 20-23 (big-endian)
      if (buffer.byteLength > 24) {
        return { width: view.getUint32(16), height: view.getUint32(20) }
      }
    } else {
      // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
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

function formatFechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const logoUrl = empresa.logo_url.startsWith('http') ? empresa.logo_url : `${baseUrl}${empresa.logo_url}`
      console.log('[PDF] Fetching logo from:', logoUrl)
      const response = await fetch(logoUrl)
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

        // Get real image dimensions for correct aspect ratio
        const dims = getImageDimensions(arrayBuffer, ext)
        const maxHeightMm = 18
        const maxWidthMm = 60
        let logoWidthMm: number
        let logoHeightMm: number

        if (dims && dims.width > 0 && dims.height > 0) {
          const aspect = dims.width / dims.height
          // Fit within max bounds while preserving aspect ratio
          logoHeightMm = maxHeightMm
          logoWidthMm = logoHeightMm * aspect
          if (logoWidthMm > maxWidthMm) {
            logoWidthMm = maxWidthMm
            logoHeightMm = logoWidthMm / aspect
          }
        } else {
          logoHeightMm = maxHeightMm
          logoWidthMm = maxHeightMm * 2
        }

        doc.addImage(dataUrl, ext, margin, y - 3, logoWidthMm, logoHeightMm)
        y += logoHeightMm + 3
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

    // Calculate text height and add padding before drawing separator
    const textHeight = descLines.length * 3.5
    y += textHeight

    // Show per-line fecha_servicio if present
    if (linea.fecha_servicio) {
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      doc.text(`F. Servicio: ${formatFechaCorta(linea.fecha_servicio)}`, colX[0], y + 1)
      y += 4
    }

    y += 3

    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 4
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

// ===========================================
// PDF RESUMEN CONSOLIDADO DE FACTURAS
// ===========================================

interface ConsolidatedPDFData {
  facturas: {
    numero: string
    fecha: string
    base_imponible: number
    igic: number
    total: number
  }[]
  cliente: Cliente
  empresa: Empresa
}

export async function generateConsolidatedPDF(data: ConsolidatedPDFData): Promise<Buffer> {
  const { facturas, cliente, empresa } = data
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

  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [30, 64, 175]
  }

  const [r, g, b] = hexToRgb(color)

  // === HEADER: Company logo + name ===
  const mostrarLogo = empresa.mostrar_logo ?? true
  let logoAdded = false

  if (mostrarLogo && empresa.logo_url) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const logoUrl = empresa.logo_url.startsWith('http') ? empresa.logo_url : `${baseUrl}${empresa.logo_url}`
      const response = await fetch(logoUrl)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const contentType = response.headers.get('content-type') || 'image/png'
        const url = empresa.logo_url.toLowerCase()
        let ext: 'JPEG' | 'PNG' = 'PNG'
        if (contentType.includes('jpeg') || contentType.includes('jpg') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
          ext = 'JPEG'
        }
        const dataUrl = `data:${contentType};base64,${base64}`

        const dims = getImageDimensions(arrayBuffer, ext)
        const maxHeightMm = 18
        const maxWidthMm = 60
        let logoWidthMm: number
        let logoHeightMm: number

        if (dims && dims.width > 0 && dims.height > 0) {
          const aspect = dims.width / dims.height
          logoHeightMm = maxHeightMm
          logoWidthMm = logoHeightMm * aspect
          if (logoWidthMm > maxWidthMm) {
            logoWidthMm = maxWidthMm
            logoHeightMm = logoWidthMm / aspect
          }
        } else {
          logoHeightMm = maxHeightMm
          logoWidthMm = maxHeightMm * 2
        }

        doc.addImage(dataUrl, ext, margin, y - 3, logoWidthMm, logoHeightMm)
        y += logoHeightMm + 3
        logoAdded = true
      }
    } catch (logoError) {
      console.error('[PDF Consolidado] Error fetching logo:', logoError)
    }
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

  // === Title box (right side) ===
  const fechas = facturas.map(f => new Date(f.fecha))
  const mesMin = fechas.reduce((min, d) => d < min ? d : min, fechas[0])
  const mesMax = fechas.reduce((max, d) => d > max ? d : max, fechas[0])
  const periodoLabel = mesMin.getMonth() === mesMax.getMonth() && mesMin.getFullYear() === mesMax.getFullYear()
    ? mesMin.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    : `${mesMin.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} - ${mesMax.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`

  const boxW = 70
  const boxX = pageWidth - margin - boxW
  const boxY = 15
  const boxH = 22

  doc.setFillColor(r, g, b)
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('RESUMEN DE FACTURAS', boxX + boxW / 2, boxY + 9, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1), boxX + boxW / 2, boxY + 18, { align: 'center' })

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
  doc.text('CLIENTE', margin, y)
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

  // === Separator ===
  y += 4
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // === Invoice summary table ===
  const colWidths = [contentWidth * 0.30, contentWidth * 0.20, contentWidth * 0.20, contentWidth * 0.15, contentWidth * 0.15]
  const colX = [margin]
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1])
  }

  // Table header
  doc.setFillColor(r, g, b)
  doc.rect(margin, y - 4, contentWidth, 10, 'F')

  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURA', colX[0] + 4, y + 2)
  doc.text('FECHA', colX[1] + 4, y + 2)
  doc.text('BASE IMP.', colX[2] + colWidths[2] - 4, y + 2, { align: 'right' })
  doc.text('IGIC', colX[3] + colWidths[3] - 4, y + 2, { align: 'right' })
  doc.text('TOTAL', colX[4] + colWidths[4] - 4, y + 2, { align: 'right' })

  y += 10

  // Table rows
  let totalBase = 0
  let totalIgic = 0
  let totalGeneral = 0

  for (const factura of facturas) {
    if (y > 255) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(factura.numero, colX[0] + 4, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(formatFechaCorta(factura.fecha), colX[1] + 4, y)

    doc.setTextColor(51, 65, 81)
    doc.text(formatPrecio(factura.base_imponible), colX[2] + colWidths[2] - 4, y, { align: 'right' })
    doc.text(formatPrecio(factura.igic), colX[3] + colWidths[3] - 4, y, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(formatPrecio(factura.total), colX[4] + colWidths[4] - 4, y, { align: 'right' })

    totalBase += factura.base_imponible
    totalIgic += factura.igic
    totalGeneral += factura.total

    y += 4
    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
  }

  // === Totals row ===
  y += 2
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y - 4, contentWidth, 14, 2, 2, 'F')
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.8)
  doc.line(margin, y - 4, pageWidth - margin, y - 4)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`TOTAL (${facturas.length} facturas)`, colX[0] + 4, y + 3)

  doc.setFontSize(9)
  doc.text(formatPrecio(totalBase), colX[2] + colWidths[2] - 4, y + 3, { align: 'right' })
  doc.text(formatPrecio(totalIgic), colX[3] + colWidths[3] - 4, y + 3, { align: 'right' })

  doc.setFontSize(12)
  doc.setTextColor(r, g, b)
  doc.text(formatPrecio(totalGeneral), colX[4] + colWidths[4] - 4, y + 3, { align: 'right' })

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

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

// ===========================================
// PDF DE PRESUPUESTO
// ===========================================

interface PresupuestoPDFData {
  presupuesto: {
    numero: string
    fecha: string
    base_imponible: number
    igic: number
    total: number
    fecha_validez?: string | null
    notas?: string | null
    lineas?: LineaPresupuesto[]
  }
  cliente: Cliente
  empresa: Empresa
}

export async function generatePresupuestoPDF(data: PresupuestoPDFData): Promise<Buffer> {
  const { presupuesto, cliente, empresa } = data
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

  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [30, 64, 175]
  }

  const [r, g, b] = hexToRgb(color)

  // === HEADER: Company logo + name ===
  const mostrarLogo = empresa.mostrar_logo ?? true
  let logoAdded = false

  if (mostrarLogo && empresa.logo_url) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const logoUrl = empresa.logo_url.startsWith('http') ? empresa.logo_url : `${baseUrl}${empresa.logo_url}`
      const response = await fetch(logoUrl)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const contentType = response.headers.get('content-type') || 'image/png'
        const url = empresa.logo_url.toLowerCase()
        let ext: 'JPEG' | 'PNG' = 'PNG'
        if (contentType.includes('jpeg') || contentType.includes('jpg') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
          ext = 'JPEG'
        }
        const dataUrl = `data:${contentType};base64,${base64}`

        const dims = getImageDimensions(arrayBuffer, ext)
        const maxHeightMm = 18
        const maxWidthMm = 60
        let logoWidthMm: number
        let logoHeightMm: number

        if (dims && dims.width > 0 && dims.height > 0) {
          const aspect = dims.width / dims.height
          logoHeightMm = maxHeightMm
          logoWidthMm = logoHeightMm * aspect
          if (logoWidthMm > maxWidthMm) {
            logoWidthMm = maxWidthMm
            logoHeightMm = logoWidthMm / aspect
          }
        } else {
          logoHeightMm = maxHeightMm
          logoWidthMm = maxHeightMm * 2
        }

        doc.addImage(dataUrl, ext, margin, y - 3, logoWidthMm, logoHeightMm)
        y += logoHeightMm + 3
        logoAdded = true
      }
    } catch (logoError) {
      console.error('[PDF Presupuesto] Error fetching logo:', logoError)
    }
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

  // === Presupuesto box (right side) ===
  const boxW = 65
  const boxX = pageWidth - margin - boxW
  const boxY = 15
  const boxH = 28

  doc.setFillColor(r, g, b)
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('PRESUPUESTO', boxX + boxW / 2, boxY + 8, { align: 'center' })

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`N.° ${presupuesto.numero}`, boxX + boxW / 2, boxY + 17, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(formatFecha(presupuesto.fecha), boxX + boxW / 2, boxY + 24, { align: 'center' })

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
  doc.text('PRESUPUESTO PARA', margin, y)
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

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const lineas = presupuesto.lineas || []
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

    const textHeight = descLines.length * 3.5
    y += textHeight + 3

    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 4
  }

  // === Totals ===
  y += 6
  const totalsX = pageWidth - margin - 65
  const totalsW = 65

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(totalsX, y - 4, totalsW, 36, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(totalsX, y - 4, totalsW, 36, 2, 2, 'S')

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal', totalsX + 4, y + 2)
  doc.setTextColor(51, 65, 81)
  doc.setFont('helvetica', 'bold')
  doc.text(formatPrecio(presupuesto.base_imponible), totalsX + totalsW - 4, y + 2, { align: 'right' })

  y += 8
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('IGIC', totalsX + 4, y + 2)
  doc.setTextColor(51, 65, 81)
  doc.setFont('helvetica', 'bold')
  doc.text(formatPrecio(presupuesto.igic), totalsX + totalsW - 4, y + 2, { align: 'right' })

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
  doc.text(formatPrecio(presupuesto.total), totalsX + totalsW - 4, y + 2, { align: 'right' })

  // === Footer ===
  const footerY = 270

  if (presupuesto.fecha_validez) {
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.text(`Este presupuesto es válido hasta el ${formatFecha(presupuesto.fecha_validez)}`, pageWidth / 2, footerY, { align: 'center' })
  }

  doc.setFontSize(9)
  doc.setTextColor(r, g, b)
  doc.setFont('helvetica', 'normal')
  doc.text('Gracias por su confianza.', pageWidth / 2, footerY + (presupuesto.fecha_validez ? 7 : 0), { align: 'center' })

  const arrayBuffer2 = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer2)
}

// ==================== QUARTERLY REPORT PDF ====================

interface QuarterlyReportData {
  facturas: {
    numero: string
    fecha: string
    base_imponible: number
    igic: number
    total: number
    estado: string
  }[]
  empresa: Empresa
  dateFrom: string
  dateTo: string
}

export async function generateQuarterlyReportPDF(data: QuarterlyReportData): Promise<Buffer> {
  const { facturas, empresa, dateFrom, dateTo } = data
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

  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [30, 64, 175]
  }

  const [r, g, b] = hexToRgb(color)

  // === HEADER: Logo ===
  const mostrarLogo = empresa.mostrar_logo ?? true
  let logoAdded = false

  if (mostrarLogo && empresa.logo_url) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const logoUrl = empresa.logo_url.startsWith('http') ? empresa.logo_url : `${baseUrl}${empresa.logo_url}`
      const response = await fetch(logoUrl)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const contentType = response.headers.get('content-type') || 'image/png'
        const url = empresa.logo_url.toLowerCase()
        let ext: 'JPEG' | 'PNG' = 'PNG'
        if (contentType.includes('jpeg') || contentType.includes('jpg') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
          ext = 'JPEG'
        }
        const dataUrl = `data:${contentType};base64,${base64}`
        const dims = getImageDimensions(arrayBuffer, ext)
        const maxHeightMm = 18
        const maxWidthMm = 60
        let logoWidthMm: number
        let logoHeightMm: number

        if (dims && dims.width > 0 && dims.height > 0) {
          const aspect = dims.width / dims.height
          logoHeightMm = maxHeightMm
          logoWidthMm = logoHeightMm * aspect
          if (logoWidthMm > maxWidthMm) {
            logoWidthMm = maxWidthMm
            logoHeightMm = logoWidthMm / aspect
          }
        } else {
          logoHeightMm = maxHeightMm
          logoWidthMm = maxHeightMm * 2
        }

        doc.addImage(dataUrl, ext, margin, y - 3, logoWidthMm, logoHeightMm)
        y += logoHeightMm + 3
        logoAdded = true
      }
    } catch (logoError) {
      console.error('[PDF Reporte] Error fetching logo:', logoError)
    }
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

  // === Title box (right side) ===
  const fromDate = new Date(dateFrom)
  const toDate = new Date(dateTo)
  const periodoLabel = `${fromDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} - ${toDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`

  const boxW = 75
  const boxX = pageWidth - margin - boxW
  const boxY = 15
  const boxH = 22

  doc.setFillColor(r, g, b)
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('RESUMEN TRIMESTRAL', boxX + boxW / 2, boxY + 9, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(periodoLabel, boxX + boxW / 2, boxY + 18, { align: 'center' })

  // === Separator ===
  y = Math.max(y, boxY + boxH) + 10
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // === Group invoices by month ===
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const monthlyData: Record<string, { label: string; count: number; base: number; igic: number; total: number }> = {}

  for (const f of facturas) {
    const d = new Date(f.fecha)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyData[key]) {
      monthlyData[key] = {
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        count: 0,
        base: 0,
        igic: 0,
        total: 0,
      }
    }
    monthlyData[key].count++
    monthlyData[key].base += f.base_imponible || 0
    monthlyData[key].igic += f.igic || 0
    monthlyData[key].total += f.total || 0
  }

  const months = Object.keys(monthlyData).sort()

  // === Monthly breakdown table ===
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.text('Desglose por mes', margin, y)
  y += 8

  // Table header
  const colX = {
    mes: margin,
    facturas: margin + 55,
    base: margin + 80,
    igic: margin + 115,
    total: margin + 145,
  }

  doc.setFillColor(r, g, b)
  doc.roundedRect(margin, y - 5, contentWidth, 8, 1.5, 1.5, 'F')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Mes', colX.mes + 3, y)
  doc.text('Facturas', colX.facturas, y, { align: 'center' })
  doc.text('Base Imponible', colX.base, y, { align: 'right' })
  doc.text('IGIC', colX.igic, y, { align: 'right' })
  doc.text('Total', colX.total, y, { align: 'right' })
  y += 7

  // Table rows
  let totalBase = 0, totalIgic = 0, totalTotal = 0, totalCount = 0

  for (const key of months) {
    const m = monthlyData[key]
    totalBase += m.base
    totalIgic += m.igic
    totalTotal += m.total
    totalCount += m.count

    // Alternate row background
    if (months.indexOf(key) % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, y - 4.5, contentWidth, 8, 'F')
    }

    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'normal')
    doc.text(m.label, colX.mes + 3, y)
    doc.text(String(m.count), colX.facturas, y, { align: 'center' })
    doc.text(formatPrecio(m.base), colX.base, y, { align: 'right' })
    doc.text(formatPrecio(m.igic), colX.igic, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(formatPrecio(m.total), colX.total, y, { align: 'right' })
    y += 8
  }

  // Totals row
  y += 2
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.8)
  doc.line(margin, y - 5, pageWidth - margin, y - 5)

  doc.setFillColor(r, g, b)
  doc.roundedRect(margin, y - 4, contentWidth, 10, 1.5, 1.5, 'F')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL PERÍODO', colX.mes + 3, y + 2)
  doc.text(String(totalCount), colX.facturas, y + 2, { align: 'center' })
  doc.text(formatPrecio(totalBase), colX.base, y + 2, { align: 'right' })
  doc.text(formatPrecio(totalIgic), colX.igic, y + 2, { align: 'right' })
  doc.text(formatPrecio(totalTotal), colX.total, y + 2, { align: 'right' })
  y += 18

  // === Summary cards ===
  const cardW = contentWidth / 3 - 3
  const cardH = 28
  const cards = [
    { label: 'Base Imponible', value: formatPrecio(totalBase) },
    { label: 'IGIC Repercutido', value: formatPrecio(totalIgic) },
    { label: 'Total Facturado', value: formatPrecio(totalTotal) },
  ]

  for (let i = 0; i < cards.length; i++) {
    const cx = margin + i * (cardW + 4.5)

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'FD')

    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.text(cards[i].label, cx + cardW / 2, y + 10, { align: 'center' })

    doc.setFontSize(14)
    doc.setTextColor(r, g, b)
    doc.setFont('helvetica', 'bold')
    doc.text(cards[i].value, cx + cardW / 2, y + 22, { align: 'center' })
  }

  y += cardH + 12

  // === Invoice detail list ===
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.text('Detalle de facturas', margin, y)
  y += 8

  // Detail table header
  const dColX = {
    num: margin,
    fecha: margin + 30,
    base: margin + 70,
    igic: margin + 105,
    total: margin + 140,
  }

  doc.setFillColor(r, g, b)
  doc.roundedRect(margin, y - 5, contentWidth, 8, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Nº Factura', dColX.num + 3, y)
  doc.text('Fecha', dColX.fecha, y)
  doc.text('Base Imponible', dColX.base, y, { align: 'right' })
  doc.text('IGIC', dColX.igic, y, { align: 'right' })
  doc.text('Total', dColX.total, y, { align: 'right' })
  y += 7

  // Sort by date then by number
  const sortedFacturas = [...facturas].sort((a, b) => {
    const dateComp = a.fecha.localeCompare(b.fecha)
    return dateComp !== 0 ? dateComp : a.numero.localeCompare(b.numero)
  })

  for (let i = 0; i < sortedFacturas.length; i++) {
    // Check if we need a new page
    if (y > 270) {
      doc.addPage()
      y = 20
    }

    const f = sortedFacturas[i]

    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, y - 4, contentWidth, 7, 'F')
    }

    doc.setFontSize(8)
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'normal')
    doc.text(f.numero || '-', dColX.num + 3, y)
    doc.text(formatFechaCorta(f.fecha), dColX.fecha, y)
    doc.text(formatPrecio(f.base_imponible || 0), dColX.base, y, { align: 'right' })
    doc.text(formatPrecio(f.igic || 0), dColX.igic, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(formatPrecio(f.total || 0), dColX.total, y, { align: 'right' })
    y += 7
  }

  // Footer
  const footerY = 282
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado el ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`, pageWidth / 2, footerY, { align: 'center' })

  const arrayBufferOut = doc.output('arraybuffer')
  return Buffer.from(arrayBufferOut)
}
