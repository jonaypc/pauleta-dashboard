import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/facturas/PrintButton"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
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

export async function generateMetadata() {
  return {
    title: {
      absolute: " " // Espacio para intentar engañar a Safari
    }
  }
}

export default async function FacturaPrintPage({ params }: PageProps) {
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

  const color = empresa?.color_primario || "#2563EB"
  const mostrarLogo = empresa?.mostrar_logo ?? true
  const textoPie = empresa?.texto_pie || `Gracias por confiar en ${empresa?.nombre || "Pauleta Canaria"}.`
  const logoWidth = empresa?.logo_width || 60
  const tituloFontSize = empresa?.titulo_font_size || 28
  const bankFontSize = empresa?.bank_font_size || 14
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
        
        .invoice {
          width: 210mm;
          min-height: 297mm;
          padding: 2.5cm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5cm;
          padding-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .logo-section h1 {
          font-size: 24px;
          font-weight: 700;
          color: ${color};
          margin-bottom: 4px;
        }
        
        .logo-section p { color: #64748b; font-size: 11px; margin-bottom: 2px; }
        .invoice-number { text-align: right; }
        .invoice-number h2 { font-size: ${tituloFontSize}px; font-weight: 700; }
        
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5cm;
        }
        
        .party { width: 48%; }
        .party-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 5px; }
        .party-name { font-size: 14px; font-weight: 700; }
        .party-details { color: #64748b; font-size: 11px; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1cm;
        }
        
        th {
          padding: 10px;
          text-align: left;
          font-size: 9px;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 2px solid #e2e8f0;
          background: #f8fafc;
        }
        
        td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
        .right { text-align: right; }
        .center { text-align: center; }
        
        .totals { display: flex; justify-content: flex-end; margin-top: 10px; }
        .totals-table { width: 220px; }
        .totals-table .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
        .totals-table .row.total { border-bottom: none; border-top: 2px solid #e2e8f0; margin-top: 5px; padding-top: 8px; }
        .totals-table .value { font-weight: 700; }
        .totals-table .row.total .value { font-size: 16px; color: ${color}; }
        
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
          text-align: center;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
        }
        
        .bank-info { font-size: ${bankFontSize}px; font-weight: 700; margin-bottom: 5px; font-family: monospace; }
        .footer-msg { color: #64748b; font-size: 10px; }
      `}} />

      <div className="invoice">
        <div className="header">
          <div className="logo-section">
            {mostrarLogo && (
              <img
                src={empresa?.logo_url || "/logo-pauleta.png"}
                alt="Logo"
                style={{ height: `${logoWidth}px`, marginBottom: '10px' }}
              />
            )}
            <h1>{empresa?.nombre || "Pauleta Canaria"}</h1>
            <p>CIF: {empresa?.cif || "B70853163"}</p>
            {empresa?.direccion && <p>{empresa.direccion}</p>}
            {(empresa?.codigo_postal || empresa?.ciudad) && (
              <p>{empresa.codigo_postal} {empresa.ciudad} {empresa.provincia ? `(${empresa.provincia})` : ''}</p>
            )}
            {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
            {empresa?.email && <p>Email: {empresa.email}</p>}
          </div>
          <div className="invoice-number">
            <h2>{factura.numero}</h2>
            <p style={{ fontSize: '12px', color: '#64748b' }}>{formatFecha(factura.fecha)}</p>
          </div>
        </div>

        <div className="parties">
          <div className="party">
            <div className="party-label">Facturar a:</div>
            <div className="party-name">{factura.cliente?.nombre}</div>
            <div className="party-details">
              <p>{factura.cliente?.cif}</p>
              <p>{factura.cliente?.direccion}</p>
              <p>{factura.cliente?.codigo_postal} {factura.cliente?.ciudad}</p>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Descripción</th>
              <th className="center">Cant.</th>
              <th className="right">Precio</th>
              <th className="center">IVA</th>
              <th className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {factura.lineas?.map((linea: any) => (
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

        <div className="totals">
          <div className="totals-table">
            <div className="row">
              <span>Base Imponible</span>
              <span className="value">{formatPrecio(factura.base_imponible)}</span>
            </div>
            <div className="row">
              <span>IGIC (7%)</span>
              <span className="value">{formatPrecio(factura.igic)}</span>
            </div>
            <div className="row total">
              <span>Total</span>
              <span className="value">{formatPrecio(factura.total)}</span>
            </div>
          </div>
        </div>

        <div className="footer">
          {empresa?.cuenta_bancaria && (
            <div className="bank-info">{empresa.cuenta_bancaria}</div>
          )}
          <div className="footer-msg">{textoPie}</div>
        </div>
      </div>

      <div className="print-button-container print:hidden">
        <PrintButton color={color} />
      </div>
    </div>
  )
}
