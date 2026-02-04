import { createClient } from "@/lib/supabase/server"
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

export default async function FacturaPrintPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const isCopia = searchParams.copia === 'true'

  const { data: factura, error } = await supabase
    .from("facturas")
    .select(`
      *,
      cliente:clientes(*),
      lineas:lineas_factura(*, producto:productos(codigo_barras, nombre))
    `)
    .eq("id", params.id)
    .single()

  if (error) {
    console.error("Error fetching invoice in print page:", error)
  }

  if (error || !factura) {
    if (!factura) console.error("Invoice not found (null data) for ID:", params.id)
    notFound()
  }

  const { data: empresa } = await supabase
    .from("empresa")
    .select("*")
    .single()

  const color = empresa?.color_primario || "#1e40af"
  const mostrarLogo = empresa?.mostrar_logo ?? true
  const logoWidth = empresa?.logo_width || 80
  const saldoPendiente = factura.estado !== 'cobrada' ? factura.total : 0

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
          .invoice { box-shadow: none !important; }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f0f0f0;
        }
        
        .invoice {
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
        
        /* === COPY LABEL === */
        .copy-label {
          position: absolute;
          top: 15mm;
          left: 50%;
          transform: translateX(-50%) rotate(-5deg);
          font-size: 24px;
          font-weight: 700;
          color: #dc2626;
          border: 3px solid #dc2626;
          padding: 8px 24px;
          border-radius: 8px;
          opacity: 0.8;
          letter-spacing: 2px;
          background: rgba(255,255,255,0.9);
          z-index: 10;
        }

        /* === HEADER === */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8mm;
          position: relative;
          z-index: 1;
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
        
        .invoice-title-box {
          text-align: right;
          padding: 12px 20px;
          background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
          border-radius: 8px;
          color: white;
          min-width: 200px;
        }
        
        .invoice-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.9;
        }
        
        .invoice-number {
          font-size: 28px;
          font-weight: 800;
          margin: 4px 0;
        }
        
        .invoice-date {
          font-size: 14px;
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
          position: relative;
          z-index: 1;
        }
        
        .party-box {
          flex: 1;
        }
        
        .party-label {
          font-size: 11px;
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
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }
        
        .party-cif {
          font-size: 12px;
          color: #64748b;
          font-family: monospace;
          margin-bottom: 4px;
        }
        
        .party-address {
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
        }
        
        /* === TABLE === */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8mm;
        }
        
        .items-table thead {
          background: #f8fafc;
        }
        
        .items-table th {
          padding: 12px 10px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.5px;
          border-bottom: 2px solid ${color}40;
        }
        
        .items-table th.center { text-align: center; }
        .items-table th.right { text-align: right; }
        
        .items-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
        }
        
        .items-table tbody tr:hover {
          background: #fafbfc;
        }
        
        .items-table td {
          padding: 12px 10px;
          font-size: 12px;
          color: #334155;
        }
        
        .items-table td.center { text-align: center; }
        .items-table td.right { text-align: right; font-family: monospace; }
        
        .item-code {
          font-size: 11px;
          color: #64748b;
          font-family: monospace;
          font-weight: 600;
        }
        
        .item-description {
          font-weight: 500;
        }
        
        /* === TOTALS === */
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-top: auto;
          padding-top: 5mm;
        }
        
        .totals-box {
          width: 70mm;
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px 15px;
          border: 1px solid #e2e8f0;
        }
        
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .totals-row:last-child {
          border-bottom: none;
        }
        
        .totals-row.total {
          border-top: 2px solid ${color};
          border-bottom: none;
          margin-top: 8px;
          padding-top: 10px;
        }
        
        .totals-row .label {
          color: #64748b;
        }
        
        .totals-row .value {
          font-weight: 600;
          font-family: monospace;
        }
        
        .totals-row.total .label {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .totals-row.total .value {
          font-size: 18px;
          font-weight: 800;
          color: ${color};
        }
        
        /* === PAYMENT STATUS === */
        .payment-status {
          margin-top: 8mm;
          display: flex;
          justify-content: flex-end;
        }
        
        .status-badge {
          padding: 8px 20px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        
        .status-badge.paid {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }
        
        .saldo-pendiente {
          margin-top: 8mm;
          text-align: right;
        }
        
        .saldo-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
        }
        
        .saldo-value {
          font-size: 22px;
          font-weight: 800;
          font-family: monospace;
          color: ${saldoPendiente > 0 ? '#dc2626' : '#059669'};
        }
        
        /* === FOOTER === */
        .footer {
          margin-top: auto;
          padding-top: 10mm;
          border-top: 1px solid #e2e8f0;
        }
        
        .bank-info {
          text-align: center;
          margin-bottom: 8px;
        }
        
        .bank-label {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .bank-number {
          font-size: 15px;
          font-weight: 700;
          font-family: monospace;
          color: #1e293b;
          letter-spacing: 2px;
        }
        
        .thank-you {
          text-align: center;
          font-size: 12px;
          color: ${color};
          font-weight: 500;
          margin: 10px 0;
        }
        
        .legal-text {
          font-size: 9px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.4;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px dashed #e2e8f0;
        }
        
        .print-button-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 100;
        }
      `}} />

      <div className="invoice">
        {isCopia && (
          <div className="copy-label">COPIA</div>
        )}

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
              {empresa?.cif && <div>CIF: {empresa.cif}</div>}
              {empresa?.direccion && <div>{empresa.direccion}</div>}
              {(empresa?.ciudad || empresa?.codigo_postal) && (
                <div>{empresa.ciudad}{empresa?.provincia ? `, ${empresa.provincia}` : ''} {empresa.codigo_postal}</div>
              )}
              {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
              {empresa?.email && <div><a href={`mailto:${empresa.email}`}>{empresa.email}</a></div>}
            </div>
          </div>

          <div className="invoice-title-box">
            <div className="invoice-label">{isCopia ? 'Factura (COPIA)' : 'Factura'}</div>
            <div className="invoice-number">N.º {factura.numero}</div>
            <div className="invoice-date">{formatFecha(factura.fecha)}</div>
          </div>
        </div>

        {/* PARTIES */}
        <div className="parties-section">
          <div className="party-box">
            <div className="party-label">Facturar a</div>
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
              {factura.cliente?.pais && <div>{factura.cliente.pais}</div>}
            </div>
          </div>

          {factura.cliente?.direccion_envio && (
            <div className="party-box">
              <div className="party-label">Enviar a</div>
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
              <th style={{ width: '40%' }}>Descripción</th>
              <th className="center" style={{ width: '10%' }}>Cant.</th>
              <th className="right" style={{ width: '15%' }}>Precio</th>
              <th className="right" style={{ width: '20%' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {factura.lineas?.map((linea: any) => (
              <tr key={linea.id} className={linea.es_intercambio ? "bg-orange-50/10" : ""}>
                <td>
                  <span className="item-code">
                    {linea.producto?.codigo_barras || '-'}
                  </span>
                </td>
                <td>
                  <div className="flex flex-col">
                    <span className="item-description flex items-center gap-2">
                      {linea.descripcion}
                      {linea.es_intercambio && (
                        <span className="text-[9px] border border-orange-500 text-orange-600 px-1 rounded uppercase font-bold tracking-wider">
                          CAMBIO / MERMA
                        </span>
                      )}
                    </span>
                    {linea.es_intercambio && linea.motivo_devolucion && (
                      <span className="text-[10px] text-gray-500 italic mt-0.5">
                        Motivo: {linea.motivo_devolucion}
                      </span>
                    )}
                  </div>
                </td>
                <td className="center">{linea.cantidad}</td>
                <td className="right">
                  {linea.es_intercambio ? (
                    <span className="text-gray-400 line-through mr-1 text-[10px]">
                      {linea.producto?.precio ? formatPrecio(linea.producto.precio) : ''}
                    </span>
                  ) : null}
                  {formatPrecio(linea.precio_unitario)}
                </td>
                <td className="right">{formatPrecio(linea.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="totals-section">
          <div className="totals-box">
            <div className="totals-row">
              <span className="label">Subtotal</span>
              <span className="value">{formatPrecio(factura.base_imponible)}</span>
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
                <div className="totals-row" key={tasa}>
                  <span className="label">IGIC ({tasa}%)</span>
                  <span className="value">{formatPrecio(info.cuota)}</span>
                </div>
              ));
            })()}

            <div className="totals-row total">
              <span className="label">Total</span>
              <span className="value">{formatPrecio(factura.total)}</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="footer">
          {empresa?.cuenta_bancaria && (
            <div className="bank-info">
              <div className="bank-label">Cuenta bancaria</div>
              <div className="bank-number">{empresa.cuenta_bancaria}</div>
            </div>
          )}

          <div className="thank-you">
            Gracias por su compra. Para cualquier consulta sobre esta factura, no dude en contactarnos.
          </div>

          <div className="legal-text">
            De conformidad con lo establecido en el Reglamento (UE) 2016/679, de Protección de Datos (RGPD) y en la Ley Orgánica 3/2018,
            de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), le informamos que sus datos personales
            forman parte de un fichero responsabilidad de {empresa?.nombre || 'Pauleta Canaria SL'}, con la finalidad de gestionar la relación comercial.
          </div>
        </div>
      </div>

      <div className="print-button-container print:hidden">
        <PrintButton color={color} />
      </div>
    </div>
  )
}
