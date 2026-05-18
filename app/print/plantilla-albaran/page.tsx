import { PrintButton } from "@/components/facturas/PrintButton"
import { createAdminClient } from "@/lib/supabase/server"
import NextImage from "next/image"

interface PageProps {
  searchParams: { cliente_id?: string }
}

export async function generateMetadata() {
  return {
    title: {
      absolute: "Plantilla Albarán - Pauleta Canaria"
    }
  }
}

export default async function PlantillaAlbaranPage({ searchParams }: PageProps) {
  const supabase = await createAdminClient()

  // Obtener datos de la empresa
  const { data: empresa } = await supabase
    .from("empresa")
    .select("*")
    .single()

  // Si hay cliente_id, obtener sus datos
  let cliente = null
  if (searchParams.cliente_id) {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", searchParams.cliente_id)
      .single()
    cliente = data
  }

  const color = "#059669" // Verde esmeralda para albaranes
  const mostrarLogo = empresa?.mostrar_logo ?? false
  const logoWidth = empresa?.logo_width || 80

  // 15 líneas en blanco para productos
  const lineasVacias = Array.from({ length: 15 }, (_, i) => i + 1)

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
          .albaran { box-shadow: none !important; page-break-after: always; }
          .no-print { display: none !important; }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f0f0f0;
        }

        .albaran {
          width: 210mm;
          height: 297mm;
          padding: 10mm 18mm;
          margin: 0 auto 10mm;
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
          margin-bottom: 5mm;
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

        .albaran-title-box {
          text-align: right;
          padding: 8px 16px;
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

        .albaran-number-blank {
          font-size: 24px;
          font-weight: 800;
          margin: 4px 0;
          min-height: 36px;
          border-bottom: 2px solid rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .albaran-date-blank {
          font-size: 11px;
          opacity: 0.9;
          min-height: 20px;
          border-bottom: 2px solid rgba(255,255,255,0.5);
          margin-top: 4px;
        }

        /* === PARTIES === */
        .parties-section {
          display: flex;
          gap: 15mm;
          margin-bottom: 5mm;
          padding: 8px 0;
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

        .blank-field {
          min-height: 18px;
          border-bottom: 1px solid #cbd5e1;
          margin-bottom: 4px;
          color: #94a3b8;
          font-size: 10px;
          padding: 2px 0;
        }

        .blank-field-tall {
          min-height: 38px;
          border-bottom: 1px solid #cbd5e1;
          margin-bottom: 4px;
          color: #94a3b8;
          font-size: 10px;
          padding: 2px 0;
        }

        /* === TABLE === */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5mm;
        }

        .items-table thead {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }

        .items-table th {
          padding: 6px 8px;
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
          border-bottom: 1px solid #e2e8f0;
          height: 10mm;
        }

        .items-table tbody tr:nth-child(even) {
          background: #fafbfc;
        }

        .items-table td {
          padding: 5px 8px;
          font-size: 11px;
          color: #94a3b8;
          vertical-align: middle;
        }

        .items-table td.center {
          text-align: center;
        }

        /* === SUMMARY === */
        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 5mm;
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

        .summary-value-blank {
          font-size: 18px;
          font-weight: 700;
          color: ${color};
          min-width: 60px;
          text-align: center;
          border-bottom: 2px solid ${color};
          padding: 2px 8px;
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
          padding-top: 5mm;
        }

        .signature-box {
          flex: 1;
        }

        .signature-space {
          height: 20mm;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          font-size: 10px;
          position: relative;
        }

        .sello-space {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 50px;
          height: 50px;
          border: 2px dashed #d1d5db;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #d1d5db;
        }

        .signature-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding-top: 8px;
          border-top: 2px solid #1e293b;
          text-align: center;
        }

        /* === FOOTER === */
        .footer {
          margin-top: 5mm;
          padding-top: 4mm;
          border-top: 1px solid #e2e8f0;
          text-align: center;
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

        .instructions {
          max-width: 210mm;
          margin: 0 auto 20px;
          padding: 15px;
          background: #fffbeb;
          border: 2px solid #fbbf24;
          border-radius: 8px;
          color: #92400e;
          font-size: 14px;
        }

        .instructions h2 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #78350f;
        }

        .instructions ul {
          margin-left: 20px;
          line-height: 1.6;
        }
      `}} />

      {/* Instrucciones (solo en pantalla) */}
      <div className="instructions no-print">
        <h2>📋 Plantilla de Albarán {cliente ? `para ${cliente.nombre}` : 'en Blanco'}</h2>
        <ul>
          <li>Esta plantilla está lista para imprimir y rellenar a mano</li>
          {cliente && <li><strong>Los datos del cliente ya están pre-rellenados</strong></li>}
          <li>Imprime varias copias para llevar en el móvil/guagua</li>
          <li>Rellena a mano: fecha, número de albarán, productos y cantidades</li>
          <li>El cliente firma en el espacio izquierdo</li>
          <li>Pon el sello de la empresa en el círculo de la derecha</li>
          <li>Puedes imprimir varias hojas de una vez (Ctrl+P)</li>
        </ul>
      </div>

      {/* Repetir 3 veces para que salgan 3 albaranes por defecto */}
      {[1, 2, 3].map((pageNum) => (
        <div key={pageNum} className="albaran">
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
              <div className="albaran-number-blank">ALB-</div>
              <div className="albaran-date-blank"></div>
            </div>
          </div>

          {/* PARTIES */}
          <div className="parties-section">
            <div className="party-box">
              <div className="party-label">Entregar a</div>
              {cliente ? (
                <>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>
                    {cliente.nombre}
                  </div>
                  {cliente.cif && (
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginBottom: '4px' }}>
                      {cliente.cif}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.5 }}>
                    {cliente.direccion && <div>{cliente.direccion}</div>}
                    {(cliente.ciudad || cliente.codigo_postal) && (
                      <div>
                        {cliente.codigo_postal} {cliente.ciudad}
                        {cliente.provincia && ` (${cliente.provincia})`}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="blank-field">Nombre:</div>
                  <div className="blank-field">CIF/NIF:</div>
                  <div className="blank-field-tall">Dirección:</div>
                </>
              )}
            </div>
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
              {lineasVacias.map((num) => (
                <tr key={num}>
                  <td></td>
                  <td></td>
                  <td className="center"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* SUMMARY */}
          <div className="summary-section">
            <div className="summary-box">
              <span className="summary-label">Total Unidades</span>
              <span className="summary-value-blank"></span>
              <span className="summary-unit">uds.</span>
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="signatures-section">
            <div className="signature-box">
              <div className="signature-space">
                Firma del Cliente
              </div>
              <div className="signature-label">Recibido Conforme</div>
            </div>
            <div className="signature-box">
              <div className="signature-space">
                Firma y Sello
                <div className="sello-space">SELLO</div>
              </div>
              <div className="signature-label">Entregado por Pauleta Canaria</div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="footer">
            <div className="footer-message">
              Gracias por confiar en nosotros
            </div>
            <div className="footer-company">
              {empresa?.nombre || "Pauleta Canaria SL"} · Helados Artesanales Canarios
            </div>
          </div>
        </div>
      ))}

      <div className="print-button-container print:hidden">
        <PrintButton color={color} />
      </div>
    </div>
  )
}
