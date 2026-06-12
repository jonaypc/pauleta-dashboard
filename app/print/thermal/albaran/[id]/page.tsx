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

export default async function AlbaranThermalPage({ params }: PageProps) {
  const supabase = await createAdminClient()

  const { data: factura, error } = await supabase
    .from("facturas")
    .select(`
      *,
      cliente:clientes(*),
      lineas:lineas_factura(*, producto:productos!lineas_factura_producto_id_fkey(codigo_barras, nombre, multiplicador_stock))
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

  const color = "#059669"
  const mostrarLogo = empresa?.mostrar_logo ?? true
  const numeroAlbaran = `ALB-${factura.numero}`

  const totalUnidades = factura.lineas?.reduce((acc: number, l: any) =>
    acc + (l.es_intercambio ? 0 : l.cantidad * (l.producto?.multiplicador_stock || 1)), 0) || 0

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
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 1mm;
        }

        .doc-number {
          font-size: 12px;
          font-weight: 700;
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
          margin-bottom: 2mm;
          font-size: 9px;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
        }

        .item-details {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5mm;
        }

        .item-code {
          font-size: 8px;
          color: #666;
        }

        .intercambio-badge {
          font-size: 7px;
          border: 1px solid #000;
          padding: 0.5mm 1mm;
          display: inline-block;
          margin-top: 0.5mm;
        }

        .total-unidades {
          text-align: center;
          margin: 3mm 0;
          padding: 2mm;
          border: 2px solid #000;
          font-size: 12px;
          font-weight: 700;
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

        .invoice-ref {
          text-align: center;
          margin: 2mm 0;
          font-size: 9px;
          padding: 2mm;
          border: 1px solid #000;
        }

        .footer-message {
          text-align: center;
          font-size: 10px;
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
          {(empresa?.ciudad || empresa?.codigo_postal) && (
            <div>{empresa.codigo_postal} {empresa.ciudad}</div>
          )}
          {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
        </div>

        <div className="thick-separator"></div>

        {/* DOCUMENT INFO */}
        <div className="doc-header">
          <div className="doc-type">Albarán de Entrega</div>
          <div className="doc-number">{numeroAlbaran}</div>
          <div className="doc-date">{formatFecha(factura.fecha)}</div>
        </div>

        <div className="separator"></div>

        {/* CLIENT */}
        <div className="section-title">ENTREGAR A</div>
        <div className="client-info">
          <div><strong>{factura.cliente?.nombre}</strong></div>
          {factura.cliente?.cif && <div>CIF: {factura.cliente.cif}</div>}
          {factura.cliente?.direccion && <div>{factura.cliente.direccion}</div>}
          {(factura.cliente?.ciudad || factura.cliente?.codigo_postal) && (
            <div>{factura.cliente.codigo_postal} {factura.cliente.ciudad}</div>
          )}
        </div>

        {/* Dirección de envío si es diferente */}
        {(factura.cliente?.direccion_entrega || factura.cliente?.ciudad_entrega) && (
          <>
            <div className="section-title">ENVIAR A</div>
            <div className="client-info">
              <div><strong>{factura.cliente?.persona_contacto || factura.cliente?.nombre}</strong></div>
              {factura.cliente?.direccion_entrega && <div>{factura.cliente.direccion_entrega}</div>}
              {(factura.cliente?.ciudad_entrega || factura.cliente?.cp_entrega) && (
                <div>{factura.cliente.cp_entrega} {factura.cliente.ciudad_entrega}</div>
              )}
            </div>
          </>
        )}

        <div className="separator"></div>

        {/* ITEMS */}
        <div className="section-title">PRODUCTOS</div>
        <div className="items-list">
          {factura.lineas?.map((linea: any) => (
            <div key={linea.id} className="item-row">
              <div className="item-header">
                <span>{linea.descripcion}</span>
                <span>{linea.cantidad} ud.</span>
              </div>
              {linea.producto?.codigo_barras && (
                <div className="item-code">Cód: {linea.producto.codigo_barras}</div>
              )}
              {linea.es_intercambio && (
                <div className="intercambio-badge">★ SE RETIRA ★</div>
              )}
              {linea.es_intercambio && linea.motivo_devolucion && (
                <div className="item-details">
                  <span style={{ fontSize: '8px', fontStyle: 'italic' }}>
                    Motivo: {linea.motivo_devolucion}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="separator"></div>

        {/* TOTAL UNIDADES */}
        <div className="total-unidades">
          TOTAL: {totalUnidades} UNIDADES
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
          <div className="section-title">FIRMA ENTREGA</div>
          <div className="signature-box">
            [Firme y selle aquí]
          </div>
          <div className="signature-label">Entregado por {empresa?.nombre || 'Pauleta Canaria'}</div>
        </div>

        <div className="thick-separator"></div>

        {/* FOOTER */}
        <div className="invoice-ref">
          Ref. Factura: <strong>{factura.numero}</strong>
        </div>

        <div className="footer-message">
          ¡Gracias por confiar en nosotros!
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
