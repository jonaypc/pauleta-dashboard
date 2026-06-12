import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/facturas/PrintButton"
import NextImage from "next/image"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
  searchParams: { copia?: string }
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

export default async function FacturaThermalPage({ params, searchParams }: PageProps) {
  const supabase = await createAdminClient()
  const isCopia = searchParams.copia === 'true'

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

  const color = empresa?.color_primario || "#1e40af"
  const mostrarLogo = empresa?.mostrar_logo ?? true
  const saldoPendiente = factura.estado !== 'cobrada' ? factura.total : 0

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

        /* === HEADER === */
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

        /* === DOCUMENT INFO === */
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

        .copy-label {
          font-size: 12px;
          font-weight: 700;
          color: #000;
          border: 2px solid #000;
          padding: 1mm 3mm;
          display: inline-block;
          margin-bottom: 1mm;
        }

        .doc-number {
          font-size: 12px;
          font-weight: 700;
        }

        .doc-date {
          font-size: 10px;
        }

        /* === CLIENT INFO === */
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

        /* === ITEMS TABLE === */
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
          color: #444;
        }

        .item-desc {
          font-size: 9px;
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

        /* === TOTALS === */
        .totals {
          margin-top: 3mm;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin: 1mm 0;
        }

        .total-row.final {
          font-size: 13px;
          font-weight: 700;
          margin-top: 2mm;
          padding-top: 2mm;
          border-top: 2px solid #000;
        }

        /* === STATUS === */
        .status-section {
          text-align: center;
          margin: 3mm 0;
          font-size: 11px;
          font-weight: 700;
        }

        .status-pending {
          border: 2px solid #000;
          padding: 2mm;
        }

        .status-paid {
          background: #000;
          color: #fff;
          padding: 2mm;
        }

        /* === FOOTER === */
        .bank-info {
          text-align: center;
          margin: 3mm 0;
          font-size: 9px;
        }

        .bank-label {
          font-weight: 700;
          margin-bottom: 1mm;
        }

        .bank-number {
          font-family: 'Courier New', monospace;
          font-size: 9px;
          letter-spacing: 0.5px;
        }

        .thank-you {
          text-align: center;
          font-size: 10px;
          margin: 2mm 0;
          font-weight: 700;
        }

        .legal-text {
          font-size: 7px;
          text-align: center;
          line-height: 1.3;
          margin-top: 2mm;
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
          {isCopia && (
            <div className="copy-label">★ COPIA ★</div>
          )}
          <div className="doc-type">Factura</div>
          <div className="doc-number">N.º {factura.numero}</div>
          <div className="doc-date">{formatFecha(factura.fecha)}</div>
        </div>

        <div className="separator"></div>

        {/* CLIENT */}
        <div className="section-title">CLIENTE</div>
        <div className="client-info">
          <div><strong>{factura.cliente?.nombre}</strong></div>
          {factura.cliente?.cif && <div>CIF: {factura.cliente.cif}</div>}
          {factura.cliente?.direccion && <div>{factura.cliente.direccion}</div>}
          {(factura.cliente?.ciudad || factura.cliente?.codigo_postal) && (
            <div>{factura.cliente.codigo_postal} {factura.cliente.ciudad}</div>
          )}
        </div>

        <div className="separator"></div>

        {/* ITEMS */}
        <div className="section-title">PRODUCTOS</div>
        <div className="items-list">
          {factura.lineas?.map((linea: any) => (
            <div key={linea.id} className="item-row">
              <div className="item-header">
                <span>{linea.descripcion}</span>
              </div>
              <div className="item-details">
                <span>
                  {linea.cantidad} x {formatPrecio(linea.precio_unitario)}
                  {linea.es_intercambio && <span className="intercambio-badge"> SE RETIRA </span>}
                </span>
                <span><strong>{formatPrecio(linea.subtotal)}</strong></span>
              </div>
              {linea.producto?.codigo_barras && (
                <div className="item-code">Cód: {linea.producto.codigo_barras}</div>
              )}
            </div>
          ))}
        </div>

        <div className="separator"></div>

        {/* TOTALS */}
        <div className="totals">
          <div className="total-row">
            <span>Subtotal</span>
            <span>{formatPrecio(factura.base_imponible)}</span>
          </div>

          {/* Desglose IGIC */}
          {(() => {
            const desglose = (factura.lineas || []).reduce((acc: any, linea: any) => {
              const tasa = linea.igic || 0;
              if (!acc[tasa]) acc[tasa] = { base: 0, cuota: 0 };
              const baseLinea = linea.cantidad * linea.precio_unitario;
              acc[tasa].base += baseLinea;
              acc[tasa].cuota += baseLinea * (tasa / 100);
              return acc;
            }, {});

            return Object.entries(desglose).map(([tasa, info]: [string, any]) => (
              <div className="total-row" key={tasa}>
                <span>IGIC ({tasa}%)</span>
                <span>{formatPrecio(info.cuota)}</span>
              </div>
            ));
          })()}

          <div className="total-row final">
            <span>TOTAL</span>
            <span>{formatPrecio(factura.total)}</span>
          </div>
        </div>

        <div className="thick-separator"></div>

        {/* STATUS */}
        {factura.estado === 'cobrada' ? (
          <div className="status-section status-paid">
            ✓ COBRADA
          </div>
        ) : (
          <div className="status-section status-pending">
            PENDIENTE DE PAGO
            {saldoPendiente > 0 && (
              <div style={{ fontSize: '10px', marginTop: '1mm' }}>
                Pendiente: {formatPrecio(saldoPendiente)}
              </div>
            )}
          </div>
        )}

        <div className="separator"></div>

        {/* BANK INFO */}
        {empresa?.cuenta_bancaria && (
          <div className="bank-info">
            <div className="bank-label">CUENTA BANCARIA</div>
            <div className="bank-number">{empresa.cuenta_bancaria}</div>
          </div>
        )}

        <div className="separator"></div>

        <div className="thank-you">
          ¡Gracias por su compra!
        </div>

        <div className="legal-text">
          Documento generado por {empresa?.nombre || 'Pauleta Canaria SL'}.
          Para cualquier consulta contacte con nosotros.
        </div>
      </div>

      <div className="print-button-container print:hidden">
        <PrintButton color={color} showFormatSelector={false} />
      </div>
    </div>
  )
}
