import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/facturas/PrintButton"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: { id: string }
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
        title: `Albarán ${factura?.numero?.replace("F", "A") || ""}`,
    }
}

export default async function AlbaranPrintPage({ params }: PageProps) {
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

    const numeroAlbaran = factura.numero.replace("F", "A")
    const footerFixed = empresa?.footer_bottom_fixed ?? true

    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <title>Albarán {numeroAlbaran}</title>
                <style dangerouslySetInnerHTML={{
                    __html: `
          @page {
            size: A4;
            margin: 0mm !important;
          }

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
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .albaran {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            background: white;
            position: relative;
            box-sizing: border-box;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #10b981;
          }
          
          .logo-section h1 {
            font-size: 24px;
            font-weight: 700;
            color: #10b981;
            margin-bottom: 4px;
          }
          
          .logo-section p {
            color: #64748b;
            font-size: 11px;
          }
          
          .albaran-number {
            text-align: right;
          }
          
          .albaran-number h2 {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
          }
          
          .albaran-number .label {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          
          .albaran-number p {
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
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          
          thead {
            background-color: #ecfdf5;
          }
          
          th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #10b981;
            border-bottom: 2px solid #10b981;
          }
          
          td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
          }
          
          .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
          }
          
          .signature-box {
            width: 45%;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
          }
          
          .signature-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .signature-space {
            height: 80px;
          }
          
          .footer {
            ${footerFixed ? `
              position: absolute;
              bottom: 20mm;
              left: 20mm;
              right: 20mm;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
              text-align: center;
              background: white;
            ` : `
              margin-top: auto;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
            `}
          }
          
          .factura-ref {
            margin-top: 16px;
            padding: 8px;
            background: #f8fafc;
            border-radius: 6px;
            font-size: 10px;
            color: #64748b;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              margin: 0 !important;
              background: white;
            }
            
            .print-button {
              display: none !important;
            }
            
            /* Evitar cortes feos */
            tr {
              page-break-inside: avoid;
            }
            .header, .parties, .signature-section {
              page-break-inside: avoid;
            }
          }
        `}} />
            </head>
            <body>
                <div className="albaran">
                    {/* Header */}
                    <div className="header">
                        <div className="logo-section">
                            <h1>{empresa?.nombre || "Pauleta Canaria S.L."}</h1>
                            <p>CIF: {empresa?.cif || "B70853163"}</p>
                            {empresa?.direccion && <p>{empresa.direccion}</p>}
                            {empresa?.ciudad && <p>{empresa.ciudad}, {empresa?.provincia}</p>}
                        </div>
                        <div className="albaran-number">
                            <div className="label">Albarán de entrega</div>
                            <h2>{numeroAlbaran}</h2>
                            <p>Fecha: {formatFecha(factura.fecha)}</p>
                        </div>
                    </div>

                    {/* Parties */}
                    <div className="parties">
                        <div className="party">
                            <div className="party-label">Entregar a:</div>
                            <div className="party-name">{factura.cliente?.nombre || "Cliente"}</div>
                            <div className="party-details">
                                {factura.cliente?.direccion && <p>{factura.cliente.direccion}</p>}
                                {factura.cliente?.ciudad && (
                                    <p>
                                        {factura.cliente.codigo_postal} {factura.cliente.ciudad}
                                        {factura.cliente.provincia && `, ${factura.cliente.provincia}`}
                                    </p>
                                )}
                                {factura.cliente?.telefono && <p>Tel: {factura.cliente.telefono}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: "80%" }}>Descripción</th>
                                <th style={{ width: "20%", textAlign: 'center' }}>Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {factura.lineas?.map((linea: any) => (
                                <tr key={linea.id}>
                                    <td>{linea.descripcion}</td>
                                    <td style={{ textAlign: 'center' }}>{linea.cantidad}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Signature Section */}
                    <div className="signature-section">
                        <div className="signature-box">
                            <div className="signature-space"></div>
                            <div className="signature-label">Firma del cliente</div>
                        </div>
                        <div className="signature-box">
                            <div className="signature-space"></div>
                            <div className="signature-label">Entregado por</div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="footer">
                        <div className="factura-ref">
                            Referencia factura: {factura.numero}
                        </div>
                        <div className="footer-message" style={{ marginTop: "12px", fontSize: '10px', color: '#64748b' }}>
                            {empresa?.nombre || "Pauleta Canaria"} · Helados artesanales de fruta
                        </div>
                    </div>
                </div>

                <div className="print-button print:hidden">
                    <PrintButton color="#10b981" />
                </div>
            </body>
        </html>
    )
}
