import { PrintButton } from "@/components/facturas/PrintButton"
import { createAdminClient } from "@/lib/supabase/server"
import NextImage from "next/image"

interface PageProps {
  searchParams: { cliente_id?: string }
}

export async function generateMetadata() {
  return {
    title: {
      absolute: "Plantilla Albarán Térmica - Pauleta Canaria"
    }
  }
}

export default async function PlantillaAlbaranThermalPage({ searchParams }: PageProps) {
  const supabase = await createAdminClient()

  const { data: empresa } = await supabase
    .from("empresa")
    .select("*")
    .single()

  let cliente = null
  if (searchParams.cliente_id) {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", searchParams.cliente_id)
      .single()
    cliente = data
  }

  const color = "#059669"
  const mostrarLogo = empresa?.mostrar_logo ?? false
  const lineasVacias = Array.from({ length: 8 }, (_, i) => i + 1)

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: 80mm auto;
          margin: 0 !important;
        }

        @media print {
          @page { margin: 0 !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-button-container { display: none !important; }
          .no-print { display: none !important; }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Courier New', Courier, monospace;
          background: #fff;
          width: 80mm;
        }

        .thermal-receipt {
          width: 80mm;
          padding: 3mm;
          background: white;
        }

        .company-logo {
          text-align: center;
          margin-bottom: 2mm;
        }

        .company-name {
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1mm;
          text-transform: uppercase;
        }

        .company-details {
          font-size: 9px;
          text-align: center;
          line-height: 1.3;
          margin-bottom: 3mm;
        }

        .separator {
          border-top: 1px dashed #000;
          margin: 2mm 0;
        }

        .thick-separator {
          border-top: 2px solid #000;
          margin: 2mm 0;
        }

        .doc-header {
          text-align: center;
          margin-bottom: 3mm;
        }

        .doc-type {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 1mm;
        }

        .doc-number-blank {
          font-size: 11px;
          border-bottom: 2px solid #000;
          padding: 2mm;
          margin: 1mm 0;
          min-height: 8mm;
          text-align: center;
        }

        .section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 1mm;
        }

        .blank-field {
          min-height: 6mm;
          border-bottom: 1px solid #000;
          margin-bottom: 1mm;
          font-size: 8px;
          color: #666;
          padding: 1mm;
        }

        .blank-field-tall {
          min-height: 10mm;
          border-bottom: 1px solid #000;
          margin-bottom: 1mm;
          font-size: 8px;
          color: #666;
          padding: 1mm;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 2mm 0;
        }

        .items-table thead {
          background: #000;
          color: #fff;
        }

        .items-table th {
          padding: 1mm;
          text-align: left;
          font-size: 8px;
          text-transform: uppercase;
          border: 1px solid #000;
        }

        .items-table th.center { text-align: center; }

        .items-table tbody tr {
          border: 1px solid #000;
        }

        .items-table td {
          padding: 3mm 1mm;
          font-size: 8px;
          border: 1px solid #000;
          min-height: 8mm;
        }

        .items-table td.center { text-align: center; }

        .total-blank {
          text-align: center;
          margin: 3mm 0;
          padding: 2mm;
          border: 2px solid #000;
        }

        .total-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .total-value-blank {
          font-size: 12px;
          font-weight: 700;
          margin-top: 1mm;
          border-bottom: 2px solid #000;
          min-height: 8mm;
          padding: 1mm;
        }

        .signature-section {
          margin: 4mm 0;
          text-align: center;
        }

        .signature-box {
          margin: 2mm 0;
          padding: 8mm 0;
          border: 2px dashed #000;
        }

        .signature-label {
          font-size: 9px;
          font-weight: 700;
          margin-top: 1mm;
        }

        .footer-message {
          text-align: center;
          font-size: 9px;
          margin: 2mm 0;
          font-weight: 700;
        }

        .footer-company {
          font-size: 8px;
          text-align: center;
          color: #666;
        }

        .print-button-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 100;
        }

        .instructions {
          max-width: 80mm;
          margin: 0 auto 20px;
          padding: 15px;
          background: #fffbeb;
          border: 2px solid #fbbf24;
          border-radius: 8px;
          color: #92400e;
          font-size: 12px;
        }

        .instructions h2 {
          font-size: 14px;
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
        <h2>📋 Plantilla Térmica {cliente ? `para ${cliente.nombre}` : 'en Blanco'}</h2>
        <ul>
          <li>Para impresora portátil 80mm</li>
          {cliente && <li><strong>Cliente pre-rellenado</strong></li>}
          <li>Rellena a mano fecha, número y productos</li>
          <li>3 copias por defecto</li>
        </ul>
      </div>

      {/* Repetir 3 veces */}
      {[1, 2, 3].map((pageNum) => (
        <div key={pageNum} className="thermal-receipt" style={{ pageBreakAfter: pageNum < 3 ? 'always' : 'auto' }}>
          {/* HEADER */}
          {mostrarLogo && empresa?.logo_url && (
            <div className="company-logo">
              <NextImage
                src={empresa.logo_url}
                alt="Logo"
                width={150}
                height={50}
                style={{ maxWidth: '60mm', height: 'auto' }}
                unoptimized
              />
            </div>
          )}

          <div className="company-name">{empresa?.nombre || "Pauleta Canaria SL"}</div>
          <div className="company-details">
            {empresa?.direccion && <div>{empresa.direccion}</div>}
            {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
            {empresa?.cif && <div>CIF: {empresa.cif}</div>}
          </div>

          <div className="thick-separator"></div>

          {/* DOCUMENT INFO */}
          <div className="doc-header">
            <div className="doc-type">Albarán de Entrega</div>
            <div className="doc-number-blank">ALB-__________</div>
            <div className="doc-number-blank" style={{ fontSize: '9px' }}>Fecha: ___/___/_____</div>
          </div>

          <div className="separator"></div>

          {/* CLIENT */}
          <div className="section-title">ENTREGAR A</div>
          {cliente ? (
            <>
              <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '1mm' }}>
                {cliente.nombre}
              </div>
              {cliente.cif && (
                <div style={{ fontSize: '9px', color: '#666', marginBottom: '1mm' }}>
                  CIF: {cliente.cif}
                </div>
              )}
              <div style={{ fontSize: '9px', color: '#666', lineHeight: 1.3 }}>
                {cliente.direccion && <div>{cliente.direccion}</div>}
                {(cliente.ciudad || cliente.codigo_postal) && (
                  <div>{cliente.codigo_postal} {cliente.ciudad}</div>
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

          <div className="separator"></div>

          {/* ITEMS TABLE */}
          <div className="section-title">PRODUCTOS</div>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '60%' }}>Descripción</th>
                <th className="center" style={{ width: '40%' }}>Cant.</th>
              </tr>
            </thead>
            <tbody>
              {lineasVacias.map((num) => (
                <tr key={num}>
                  <td></td>
                  <td className="center"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="separator"></div>

          {/* TOTAL */}
          <div className="total-blank">
            <div className="total-label">Total Unidades</div>
            <div className="total-value-blank"></div>
          </div>

          <div className="thick-separator"></div>

          {/* SIGNATURES */}
          <div className="signature-section">
            <div className="section-title">FIRMA CLIENTE</div>
            <div className="signature-box">
              [Firme aquí]
            </div>
            <div className="signature-label">Recibido Conforme</div>
          </div>

          <div className="separator"></div>

          <div className="signature-section">
            <div className="section-title">FIRMA Y SELLO</div>
            <div className="signature-box">
              [Firme y selle aquí]
            </div>
            <div className="signature-label">Entregado por Pauleta Canaria</div>
          </div>

          <div className="thick-separator"></div>

          {/* FOOTER */}
          <div className="footer-message">
            ¡Gracias por confiar en nosotros!
          </div>

          <div className="footer-company">
            {empresa?.nombre || "Pauleta Canaria SL"}<br />
            Helados Artesanales Canarios
          </div>
        </div>
      ))}

      <div className="print-button-container print:hidden">
        <PrintButton color={color} showFormatSelector={false} />
      </div>
    </div>
  )
}
