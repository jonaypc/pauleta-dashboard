import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/facturas/PrintButton"
import NextImage from "next/image"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
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

export async function generateMetadata() {
  return {
    title: {
      absolute: " "
    }
  }
}

export default async function AlbaranPrintPage({ params }: PageProps) {
  const supabase = await createAdminClient()

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
    notFound()
  }

  const { data: empresa } = await supabase
    .from("empresa")
    .select("*")
    .single()

  const color = "#059669" // Verde esmeralda para albaranes
  const mostrarLogo = empresa?.mostrar_logo ?? true
  const logoWidth = empresa?.logo_width || 80
  const numeroAlbaran = `ALB-${factura.numero}`

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4;
          margin: 0 !important;
        }

        @media print {
          @page { margin: 0 !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-button-container { display: none !important; }
          .albaran { box-shadow: none !important; }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f0f0f0;
        }
        
        .albaran {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        /* === HEADER === */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8mm;
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-logo {
          margin-bottom: 8px;
        }
        
        .company-name {
          font-size: 22px;
          font-weight: 700;
          color: ${color};
          margin-bottom: 4px;
        }
        
        .company-details {
          color: #64748b;
          font-size: 10px;
          line-height: 1.5;
        }
        
        .company-details a {
          color: ${color};
          text-decoration: none;
        }
        
        .albaran-title-box {
          text-align: right;
          padding: 12px 20px;
          background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
          border-radius: 8px;
          color: white;
        }
        
        .albaran-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.9;
        }
        
        .albaran-number {
          font-size: 24px;
          font-weight: 800;
          margin: 4px 0;
        }
        
        .albaran-date {
          font-size: 11px;
          opacity: 0.9;
        }
        
        /* === PARTIES === */
        .parties-section {
          display: flex;
          gap: 15mm;
          margin-bottom: 10mm;
          padding: 15px 0;
          border-top: 2px solid #e2e8f0;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .party-box {
          flex: 1;
        }
        
        .party-label {
          font-size: 9px;
          text-transform: uppercase;
          color: ${color};
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .party-label::before {
          content: '';
          width: 3px;
          height: 12px;
          background: ${color};
          border-radius: 2px;
        }
        
        .party-name {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }
        
        .party-cif {
          font-size: 11px;
          color: #64748b;
          font-family: monospace;
          margin-bottom: 4px;
        }
        
        .party-address {
          font-size: 10px;
          color: #64748b;
          line-height: 1.5;
        }
        
        /* === TABLE === */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10mm;
        }
        
        .items-table thead {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }
        
        .items-table th {
          padding: 12px 10px;
          text-align: left;
          font-size: 9px;
          text-transform: uppercase;
          color: ${color};
          font-weight: 700;
          letter-spacing: 0.5px;
          border-bottom: 2px solid ${color}60;
        }
        
        .items-table th.center { text-align: center; }
        
        .items-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #fafbfc;
        }
        
        .items-table td {
          padding: 12px 10px;
          font-size: 11px;
          color: #334155;
        }
        
        .items-table td.center { text-align: center; font-weight: 600; font-size: 13px; }
        
        .item-code {
          font-size: 9px;
          color: #94a3b8;
          font-family: monospace;
        }
        
        .item-description {
          font-weight: 500;
        }
        
        /* === SUMMARY === */
        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 10mm;
        }
        
        .summary-box {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border-radius: 6px;
          padding: 8px 15px;
          border: 1px solid ${color}40;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .summary-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-value {
          font-size: 18px;
          font-weight: 700;
          color: ${color};
        }
        
        .summary-unit {
          font-size: 10px;
          color: #64748b;
        }
        
        /* === SIGNATURES === */
        .signatures-section {
          display: flex;
          justify-content: space-between;
          gap: 20mm;
          margin-top: auto;
          padding-top: 10mm;
        }
        
        .signature-box {
          flex: 1;
          text-align: center;
        }
        
        .signature-space {
          height: 25mm;
          border: 2px dashed #e2e8f0;
          border-radius: 8px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          font-size: 10px;
        }
        
        .signature-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding-top: 8px;
          border-top: 2px solid #1e293b;
        }
        
        /* === FOOTER === */
        .footer {
          margin-top: 10mm;
          padding-top: 8mm;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }
        
        .invoice-ref {
          display: inline-block;
          background: #f1f5f9;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 10px;
          color: #64748b;
          margin-bottom: 8px;
        }
        
        .invoice-ref strong {
          color: #1e293b;
        }
        
        .footer-message {
          font-size: 11px;
          color: ${color};
          font-weight: 500;
        }
        
        .footer-company {
          font-size: 9px;
          color: #94a3b8;
          margin-top: 5px;
        }
        
        .print-button-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 100;
        }
        
        /* Decorative elements */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 120px;
          font-weight: 900;
          color: rgba(5, 150, 105, 0.03);
          pointer-events: none;
          white-space: nowrap;
        }
      `}} />

      <div className="albaran">
        <div className="watermark">ALBARÁN</div>
        
        {/* HEADER */}
        <div className="header">
          <div className="company-info">
            {mostrarLogo && empresa?.logo_url && (
              <div className="company-logo">
                <NextImage
                  src={empresa.logo_url}
                  alt="Logo"
                  width={200}
                  height={logoWidth}
                  style={{ height: `${logoWidth}px`, width: "auto" }}
                  unoptimized
                />
              </div>
            )}
            <div className="company-name">{empresa?.nombre || "Pauleta Canaria SL"}</div>
            <div className="company-details">
              {empresa?.direccion && <div>{empresa.direccion}</div>}
              {(empresa?.ciudad || empresa?.codigo_postal) && (
                <div>{empresa.ciudad}{empresa?.provincia ? `, ${empresa.provincia}` : ''} {empresa.codigo_postal}</div>
              )}
              {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
              {empresa?.cif && <div>CIF: {empresa.cif}</div>}
            </div>
          </div>
          
          <div className="albaran-title-box">
            <div className="albaran-label">Albarán de Entrega</div>
            <div className="albaran-number">{numeroAlbaran}</div>
            <div className="albaran-date">{formatFecha(factura.fecha)}</div>
          </div>
        </div>

        {/* PARTIES */}
        <div className="parties-section">
          <div className="party-box">
            <div className="party-label">Entregar a</div>
            <div className="party-name">{factura.cliente?.nombre}</div>
            {factura.cliente?.cif && <div className="party-cif">{factura.cliente.cif}</div>}
            <div className="party-address">
              {factura.cliente?.direccion && <div>{factura.cliente.direccion}</div>}
              {(factura.cliente?.ciudad || factura.cliente?.codigo_postal) && (
                <div>
                  {factura.cliente.codigo_postal} {factura.cliente.ciudad}
                  {factura.cliente?.provincia && ` (${factura.cliente.provincia})`}
                </div>
              )}
            </div>
          </div>
          
          {factura.cliente?.direccion_envio && (
            <div className="party-box">
              <div className="party-label">Dirección de Envío</div>
              <div className="party-name">{factura.cliente?.nombre}</div>
              <div className="party-address">
                <div>{factura.cliente.direccion_envio}</div>
              </div>
            </div>
          )}
        </div>

        {/* ITEMS TABLE */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Código</th>
              <th style={{ width: '65%' }}>Descripción del Producto</th>
              <th className="center" style={{ width: '20%' }}>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {factura.lineas?.map((linea: any) => (
              <tr key={linea.id}>
                <td>
                  <span className="item-code">
                    {linea.producto?.codigo_barras || '-'}
                  </span>
                </td>
                <td>
                  <span className="item-description">{linea.descripcion}</span>
                  {linea.fecha_servicio && (
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                      F. Servicio: {formatFechaCorta(linea.fecha_servicio)}
                    </div>
                  )}
                </td>
                <td className="center">{linea.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY */}
        <div className="summary-section">
          <div className="summary-box">
            <span className="summary-label">Total Unidades</span>
            <span className="summary-value">
              {factura.lineas?.reduce((acc: number, l: any) => acc + l.cantidad, 0) || 0}
            </span>
            <span className="summary-unit">uds.</span>
          </div>
        </div>

        {/* SIGNATURES */}
        <div className="signatures-section">
          <div className="signature-box">
            <div className="signature-space">Firme aquí</div>
            <div className="signature-label">Recibido por el Cliente</div>
          </div>
          <div className="signature-box">
            <div className="signature-space">Firme aquí</div>
            <div className="signature-label">Entregado por</div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="footer">
          <div className="invoice-ref">
            📄 Referencia Factura: <strong>{factura.numero}</strong>
          </div>
          <div className="footer-message">
            Gracias por confiar en nosotros
          </div>
          <div className="footer-company">
            {empresa?.nombre || "Pauleta Canaria SL"} · Helados Artesanales Canarios
          </div>
        </div>
      </div>

      <div className="print-button-container print:hidden">
        <PrintButton color={color} />
      </div>
    </div>
  )
}
