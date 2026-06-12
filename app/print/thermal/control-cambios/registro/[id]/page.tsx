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

export default async function ControlCambiosRegistroThermalPage({ params }: PageProps) {
  const supabase = await createAdminClient()

  const { data: registro, error } = await supabase
    .from("control_cambios")
    .select(`
      *,
      cliente:clientes(*),
      lineas:lineas_control_cambios(*, producto:productos(nombre, codigo_barras))
    `)
    .eq("id", params.id)
    .single()

  if (error || !registro) {
    notFound()
  }

  const { data: empresa } = await supabase
    .from("empresa")
    .select("*")
    .single()

  const color = "#d97706"
  const mostrarLogo = empresa?.mostrar_logo ?? true
  const cliente = registro.cliente

  const totalEntrega = registro.lineas?.reduce((sum: number, l: any) => sum + (l.cantidad_entrega || 0), 0) || 0
  const totalRecibe = registro.lineas?.reduce((sum: number, l: any) => sum + (l.cantidad_recibe || 0), 0) || 0

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

        .doc-date {
          font-size: 10px;
        }

        .section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 1mm;
        }

        .client-info {
          font-size: 9px;
          line-height: 1.4;
          margin-bottom: 3mm;
        }

        .items-list {
          margin: 2mm 0;
        }

        .item-row {
          margin-bottom: 3mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #ddd;
        }

        .item-name {
          font-size: 9px;
          font-weight: 700;
          margin-bottom: 1mm;
        }

        .item-code {
          font-size: 8px;
          color: #666;
          margin-bottom: 1mm;
        }

        .item-quantities {
          font-size: 9px;
          display: flex;
          justify-content: space-between;
          margin-top: 1mm;
        }

        .qty-badge {
          padding: 1mm 2mm;
          background: #000;
          color: #fff;
          font-weight: 700;
          border-radius: 2mm;
        }

        .qty-badge.entrega {
          background: #dc2626;
        }

        .qty-badge.recibe {
          background: #16a34a;
        }

        .total-section {
          margin: 3mm 0;
          padding: 2mm;
          border: 2px solid #000;
          text-align: center;
        }

        .total-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .total-value {
          font-size: 14px;
          font-weight: 700;
          margin-top: 1mm;
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
      `}} />

      <div className="thermal-receipt">
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
          {empresa?.cif && <div>CIF: {empresa.cif}</div>}
          {empresa?.direccion && <div>{empresa.direccion}</div>}
          {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
        </div>

        <div className="thick-separator"></div>

        {/* DOCUMENT INFO */}
        <div className="doc-header">
          <div className="doc-type">Control de Cambios</div>
          <div className="doc-date">{formatFecha(registro.fecha)}</div>
        </div>

        <div className="separator"></div>

        {/* CLIENT */}
        <div className="section-title">CLIENTE</div>
        <div className="client-info">
          <div><strong>{cliente?.nombre}</strong></div>
          {cliente?.cif && <div>CIF: {cliente.cif}</div>}
          {cliente?.direccion && <div>{cliente.direccion}</div>}
          {(cliente?.ciudad || cliente?.codigo_postal) && (
            <div>{cliente.codigo_postal} {cliente.ciudad}</div>
          )}
        </div>

        <div className="separator"></div>

        {/* ITEMS */}
        <div className="section-title">PRODUCTOS</div>
        <div className="items-list">
          {registro.lineas?.map((linea: any) => (
            <div key={linea.id} className="item-row">
              <div className="item-name">{linea.producto?.nombre}</div>
              {linea.producto?.codigo_barras && (
                <div className="item-code">Cód: {linea.producto.codigo_barras}</div>
              )}
              <div className="item-quantities">
                <div>
                  <span style={{ fontSize: '8px', color: '#666' }}>Entrega: </span>
                  <span className="qty-badge entrega">{linea.cantidad_entrega || 0} ud.</span>
                </div>
                <div>
                  <span style={{ fontSize: '8px', color: '#666' }}>Recibe: </span>
                  <span className="qty-badge recibe">{linea.cantidad_recibe || 0} ud.</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="separator"></div>

        {/* TOTALS */}
        <div className="total-section">
          <div className="total-label">Total Entrega</div>
          <div className="total-value">{totalEntrega} uds.</div>
        </div>

        <div className="total-section">
          <div className="total-label">Total Recibe</div>
          <div className="total-value">{totalRecibe} uds.</div>
        </div>

        <div className="thick-separator"></div>

        {/* SIGNATURES */}
        <div className="signature-section">
          <div className="section-title">FIRMA CLIENTE</div>
          <div className="signature-box">
            [Firme aquí]
          </div>
          <div className="signature-label">Conforme con el cambio</div>
        </div>

        <div className="separator"></div>

        <div className="signature-section">
          <div className="section-title">FIRMA ENTREGA</div>
          <div className="signature-box">
            [Firme aquí]
          </div>
          <div className="signature-label">Realizado por {empresa?.nombre || 'Pauleta Canaria'}</div>
        </div>

        <div className="thick-separator"></div>

        {/* FOOTER */}
        <div className="footer-message">
          Gracias por su confianza
        </div>

        <div className="footer-company">
          {empresa?.nombre || "Pauleta Canaria SL"}<br />
          Helados Artesanales Canarios
        </div>
      </div>

      <div className="print-button-container print:hidden">
        <PrintButton color={color} showFormatSelector={false} />
      </div>
    </div>
  )
}
