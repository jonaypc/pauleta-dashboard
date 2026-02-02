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

export async function generateMetadata() {
  return {
    title: {
      absolute: " " // Espacio para Safari
    }
  }
}

export default async function AlbaranPrintPage({ params }: PageProps) {
  const supabase = await createClient()

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

  const { data: empresa } = await supabase
    .from("empresa")
    .select("*")
    .single()

  const numeroAlbaran = factura.numero.replace("F", "A")
  const footerFixed = empresa?.footer_bottom_fixed ?? true

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{
        __html: `
                @page {
                    size: A4;
                    margin: 0 !important;
                }
                
                @media print {
                    @page {
                        margin: 0 !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: 100% !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-button-container {
                        display: none !important;
                    }
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                .albaran {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 2.5cm;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    background: white;
                    position: relative;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2cm;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #10b981;
                }

                .logo-section h1 {
                    font-size: 24px;
                    color: #10b981;
                    margin-bottom: 5px;
                }

                .logo-section p {
                    color: #64748b;
                    font-size: 11px;
                    margin-bottom: 2px;
                }

                .albaran-number {
                    text-align: right;
                }

                .albaran-number h2 {
                    font-size: 28px;
                    color: #1e293b;
                }

                .albaran-number .label {
                    background: #10b981;
                    color: white;
                    padding: 3px 10px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                    display: inline-block;
                }

                .parties {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2cm;
                }

                .party { width: 48%; }
                .party-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 5px; }
                .party-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
                .party-details { color: #64748b; font-size: 11px; line-height: 1.4; }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 1.5cm;
                }

                th {
                    text-align: left;
                    padding: 10px;
                    font-size: 10px;
                    text-transform: uppercase;
                    color: #10b981;
                    border-bottom: 2px solid #10b981;
                    background: #ecfdf5;
                }

                td {
                    padding: 10px;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 11px;
                }

                .signature-section {
                    margin-top: 2cm;
                    display: flex;
                    justify-content: space-between;
                }

                .signature-box {
                    width: 45%;
                    border-top: 1px solid #cbd5e1;
                    padding-top: 10px;
                }

                .signature-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
                .signature-space { height: 2cm; }

                .footer {
                    ${footerFixed ? `
                        position: absolute;
                        bottom: 2cm;
                        left: 2.5cm;
                        right: 2.5cm;
                    ` : `
                        margin-top: auto;
                        padding-top: 1cm;
                    `}
                    border-top: 1px solid #e2e8f0;
                    text-align: center;
                    padding-top: 10px;
                }

                .factura-ref { font-size: 9px; color: #94a3b8; }
                .footer-msg { font-size: 10px; color: #64748b; margin-top: 5px; }
            `}} />

      <div className="albaran">
        <div className="header">
          <div className="logo-section">
            <h1>{empresa?.nombre || "Pauleta Canaria"}</h1>
            <p>CIF: {empresa?.cif || "B70853163"}</p>
            {empresa?.direccion && <p>{empresa.direccion}</p>}
            {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
            {empresa?.email && <p>Email: {empresa.email}</p>}
          </div>
          <div className="albaran-number">
            <div className="label">Albarán de entrega</div>
            <h2>{numeroAlbaran}</h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
              Fecha: {formatFecha(factura.fecha)}
            </p>
          </div>
        </div>

        <div className="parties">
          <div className="party">
            <div className="party-label">Entregar a:</div>
            <div className="party-name">{factura.cliente?.nombre || "Cliente"}</div>
            <div className="party-details">
              {factura.cliente?.direccion && <p>{factura.cliente.direccion}</p>}
              {factura.cliente?.ciudad && (
                <p>{factura.cliente.codigo_postal} {factura.cliente.ciudad}</p>
              )}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '80%' }}>Descripción</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Cantidad</th>
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

        <div className="footer">
          <div className="factura-ref">Ref. Factura: {factura.numero}</div>
          <div className="footer-msg">
            {empresa?.nombre || "Pauleta Canaria"} · Helados Artesanales
          </div>
        </div>
      </div>

      <div className="print-button-container print:hidden">
        <PrintButton color="#10b981" />
      </div>
    </div>
  )
}
