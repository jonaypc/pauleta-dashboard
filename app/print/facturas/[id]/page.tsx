import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/facturas/PrintButton"

interface PageProps {
    params: { id: string }
}

// Formatea precio
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

// Formatea fecha
function formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })
}

export async function generateMetadata({ params }: PageProps) {
    const supabase = await createClient()
    const { data: factura } = await supabase
        .from("facturas")
        .select("numero")
        .eq("id", params.id)
        .single()

    return {
        title: `Factura ${factura?.numero || ""}`,
    }
}

export default async function FacturaPrintPage({ params }: PageProps) {
    const supabase = await createClient()

    // Obtener factura con cliente y líneas
    const { data: factura, error } = await supabase
        .from("facturas")
        .select(`
      *,
      cliente:clientes(*),
      lineas:lineas_factura(*)
    `)
        .eq("id", params.id)
        .single()

    if (error || !factura) {
        notFound()
    }

    // Obtener datos de la empresa
    const { data: empresa } = await supabase
        .from("empresa")
        .select("*")
        .single()

    const color = empresa?.color_primario || "#2563EB"
    const mostrarLogo = empresa?.mostrar_logo ?? true
    const textoPie = empresa?.texto_pie || `Gracias por confiar en ${empresa?.nombre || "Pauleta Canaria"}.`
    const logoWidth = empresa?.logo_width || 60
    const tituloFontSize = empresa?.titulo_font_size || 28

    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <title>Factura {factura.numero}</title>
                <style dangerouslySetInnerHTML={{
                    __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            color: #1e293b;
            line-height: 1.5;
            background: white;
          }
          
          .invoice {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .logo-section h1 {
            font-size: 24px;
            font-weight: 700;
            color: ${color};
            margin-bottom: 4px;
          }
          
          .logo-section p {
            color: #64748b;
            font-size: 11px;
          }
          
          .invoice-number {
            text-align: right;
          }
          
          .invoice-number h2 {
            font-size: ${tituloFontSize}px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
          }
          
          .invoice-number p {
            color: #64748b;
            font-size: 12px;
          }
          
          .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          
          .party {
            width: 48%;
          }
          
          .party-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 8px;
            font-weight: 600;
          }
          
          .party-name {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          
          .party-details {
            color: #64748b;
            font-size: 11px;
          }
          
          .party-details p {
            margin-bottom: 2px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          
          thead {
            background-color: #f8fafc;
          }
          
          th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            border-bottom: 2px solid #e2e8f0;
          }
          
          th.right {
            text-align: right;
          }
          
          th.center {
            text-align: center;
          }
          
          td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
          }
          
          td.right {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }
          
          td.center {
            text-align: center;
          }
          
          .totals {
            display: flex;
            justify-content: flex-end;
          }
          
          .totals-table {
            width: 280px;
          }
          
          .totals-table .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .totals-table .row.total {
            border-bottom: none;
            border-top: 2px solid #e2e8f0;
            padding-top: 12px;
            margin-top: 4px;
          }
          
          .totals-table .label {
            color: #64748b;
          }
          
          .totals-table .value {
            font-weight: 600;
            font-variant-numeric: tabular-nums;
          }
          
          .totals-table .row.total .label {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
          }
          
          .totals-table .row.total .value {
            font-size: 18px;
            color: ${color};
          }
          
          .footer {
            margin-top: auto;
            padding-top: 40px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            page-break-inside: avoid;
          }
          
          .footer-bank {
            margin-bottom: 16px;
          }
          
          .footer-bank-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 4px;
          }
          
          .footer-bank-number {
            font-size: 14px;
            font-weight: 600;
            font-family: 'Consolas', monospace;
            letter-spacing: 1px;
          }
          
          .footer-message {
            color: #64748b;
            font-size: 11px;
            white-space: pre-wrap;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              margin: 0;
            }
            .invoice {
              padding: 20px 40px;
              max-width: 100%;
              min-height: auto;
            }
            @page {
              margin: 10mm;
              size: auto; 
            }
          }
        `}} />
            </head>
            <body>
                <div className="invoice">
                    {/* Header */}
                    <div className="header">
                        <div className="logo-section">
                            {mostrarLogo && (
                                <>
                                    {empresa?.logo_url ? (
                                        <img
                                            src={empresa.logo_url}
                                            alt="Logo"
                                            style={{ height: `${logoWidth}px`, marginBottom: '10px', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <img
                                            src="/logo-pauleta.png"
                                            alt="Logo Pauleta"
                                            style={{ height: `${logoWidth}px`, marginBottom: '10px', objectFit: 'contain' }}
                                            onError={(e: any) => {
                                                // Fallback si no existe la imagen
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    )}
                                </>
                            )}
                            <h1>{empresa?.nombre || "Pauleta Canaria S.L."}</h1>
                            <p>CIF: {empresa?.cif || "B70853163"}</p>
                            {empresa?.direccion && <p>{empresa.direccion}</p>}
                            {empresa?.ciudad && <p>{empresa.ciudad}, {empresa?.provincia}</p>}
                        </div>
                        <div className="invoice-number">
                            <h2>{factura.numero}</h2>
                            <p>Fecha: {formatFecha(factura.fecha)}</p>
                            {factura.fecha_vencimiento && (
                                <p>Vencimiento: {formatFecha(factura.fecha_vencimiento)}</p>
                            )}
                        </div>
                    </div>

                    {/* Parties */}
                    <div className="parties">
                        <div className="party">
                            <div className="party-label">Facturar a:</div>
                            <div className="party-name">{factura.cliente?.nombre || "Cliente"}</div>
                            <div className="party-details">
                                {factura.cliente?.cif && <p>CIF: {factura.cliente.cif}</p>}
                                {factura.cliente?.direccion && <p>{factura.cliente.direccion}</p>}
                                {factura.cliente?.ciudad && (
                                    <p>
                                        {factura.cliente.codigo_postal} {factura.cliente.ciudad}
                                        {factura.cliente.provincia && `, ${factura.cliente.provincia}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: "50%" }}>Descripción</th>
                                <th className="center" style={{ width: "10%" }}>Cantidad</th>
                                <th className="right" style={{ width: "15%" }}>Precio</th>
                                <th className="center" style={{ width: "10%" }}>IGIC</th>
                                <th className="right" style={{ width: "15%" }}>Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {factura.lineas?.map((linea: {
                                id: string;
                                descripcion: string;
                                cantidad: number;
                                precio_unitario: number;
                                igic: number;
                                subtotal: number;
                            }) => (
                                <tr key={linea.id}>
                                    <td>{linea.descripcion}</td>
                                    <td className="center">{linea.cantidad}</td>
                                    <td className="right">{formatPrecio(linea.precio_unitario)}</td>
                                    <td className="center">{linea.igic}%</td>
                                    <td className="right">{formatPrecio(linea.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="totals">
                        <div className="totals-table">
                            <div className="row">
                                <span className="label">Base imponible</span>
                                <span className="value">{formatPrecio(factura.base_imponible)}</span>
                            </div>
                            <div className="row">
                                <span className="label">IGIC</span>
                                <span className="value">{formatPrecio(factura.igic)}</span>
                            </div>
                            <div className="row total">
                                <span className="label">Total</span>
                                <span className="value">{formatPrecio(factura.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="footer">
                        {empresa?.cuenta_bancaria && (
                            <div className="footer-bank">
                                <div className="footer-bank-label">Cuenta bancaria</div>
                                <div className="footer-bank-number">{empresa.cuenta_bancaria}</div>
                            </div>
                        )}
                        <div className="footer-message">
                            {textoPie}
                        </div>
                    </div>
                </div>

                <PrintButton color={color} />
            </body>
        </html>
    )
}
