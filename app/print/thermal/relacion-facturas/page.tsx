import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/facturas/PrintButton"

export const dynamic = 'force-dynamic'

interface SearchParams {
  cif?: string
  cifs?: string
  desde?: string
  hasta?: string
  periodo?: string
  mes?: string
  entregado?: string
  fecha?: string
}

export async function generateMetadata() {
  return {
    title: {
      absolute: "Relación de Facturas"
    }
  }
}

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatPrecio(precio: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(precio)
}

export default async function RelacionFacturasThermalPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const supabase = await createAdminClient()
  const { cif, cifs, desde, hasta, periodo, mes, entregado, fecha } = searchParams

  const cifList = cifs ? cifs.split(",").filter(Boolean) : cif ? [cif] : []

  if (cifList.length === 0 || !desde || !hasta) {
    notFound()
  }

  const { data: empresa } = await supabase
    .from("empresa")
    .select("*")
    .single()

  const { data: clientesConCIF } = await supabase
    .from("clientes")
    .select("id, nombre, cif, persona_contacto")
    .in("cif", cifList)

  if (!clientesConCIF || clientesConCIF.length === 0) {
    notFound()
  }

  const clienteIds = clientesConCIF.map(c => c.id)

  const empresasPorCIF = cifList.map(cifVal => {
    const clientesDeEmpresa = clientesConCIF.filter(c => c.cif === cifVal)
    return {
      cif: cifVal,
      nombre: clientesDeEmpresa[0]?.nombre || cifVal,
      clienteIds: clientesDeEmpresa.map(c => c.id)
    }
  })

  const { data: facturas } = await supabase
    .from("facturas")
    .select(`
      id, numero, fecha, total,
      cliente:clientes(nombre, persona_contacto, cif)
    `)
    .in("cliente_id", clienteIds)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .neq("estado", "anulada")
    .order("fecha", { ascending: true })

  const total = facturas?.reduce((sum, f) => sum + (f.total || 0), 0) || 0
  const periodoLabel = periodo === "mensual" ? "Mes completo" : periodo === "1" ? "1ª quincena" : "2ª quincena"

  const facturasPorEmpresa = empresasPorCIF.map(emp => ({
    ...emp,
    facturas: facturas?.filter(f => (f.cliente as any)?.cif === emp.cif) || [],
    total: (facturas?.filter(f => (f.cliente as any)?.cif === emp.cif) || []).reduce((sum, f) => sum + (f.total || 0), 0)
  })).filter(g => g.facturas.length > 0)

  const color = empresa?.color_primario || "#1e40af"

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

        .doc-info {
          font-size: 9px;
          line-height: 1.4;
        }

        .section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 2mm 0 1mm;
          padding: 1mm;
          background: #000;
          color: #fff;
          text-align: center;
        }

        .client-block {
          margin-bottom: 3mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #ddd;
        }

        .client-name {
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 1mm;
        }

        .client-cif {
          font-size: 8px;
          color: #666;
          margin-bottom: 1mm;
        }

        .invoice-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          margin: 0.5mm 0;
          padding-left: 2mm;
        }

        .invoice-number {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }

        .invoice-amount {
          font-weight: 700;
        }

        .subtotal-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 700;
          margin-top: 1mm;
          padding-top: 1mm;
          border-top: 1px solid #000;
        }

        .total-section {
          margin: 3mm 0;
          padding: 2mm;
          border: 2px solid #000;
          text-align: center;
        }

        .total-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .total-value {
          font-size: 16px;
          font-weight: 700;
          margin-top: 1mm;
        }

        .footer-info {
          font-size: 8px;
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
        <div className="company-name">{empresa?.nombre || "Pauleta Canaria SL"}</div>
        <div className="company-details">
          {empresa?.cif && <div>CIF: {empresa.cif}</div>}
        </div>

        <div className="thick-separator"></div>

        {/* DOCUMENT INFO */}
        <div className="doc-header">
          <div className="doc-type">Relación de Facturas</div>
          <div className="doc-info">
            <div>Período: {formatFecha(desde)} - {formatFecha(hasta)}</div>
            {mes && <div>Mes: {mes}</div>}
            {periodo && <div>{periodoLabel}</div>}
            {entregado === 'true' && <div>✓ Entregado</div>}
            {fecha && <div>Entrega: {formatFecha(fecha)}</div>}
          </div>
        </div>

        <div className="separator"></div>

        {/* FACTURAS POR EMPRESA */}
        {facturasPorEmpresa.map((grupo, idx) => (
          <div key={idx} className="client-block">
            <div className="section-title">
              {grupo.nombre.substring(0, 30)}
            </div>
            <div className="client-cif">CIF: {grupo.cif}</div>

            {grupo.facturas.map((factura: any) => (
              <div key={factura.id} className="invoice-row">
                <span className="invoice-number">{factura.numero}</span>
                <span className="invoice-amount">{formatPrecio(factura.total)}</span>
              </div>
            ))}

            <div className="subtotal-row">
              <span>Subtotal</span>
              <span>{formatPrecio(grupo.total)}</span>
            </div>
          </div>
        ))}

        <div className="thick-separator"></div>

        {/* TOTAL */}
        <div className="total-section">
          <div className="total-label">Total General</div>
          <div className="total-value">{formatPrecio(total)}</div>
          <div style={{ fontSize: '8px', marginTop: '1mm', color: '#666' }}>
            {facturas?.length || 0} facturas
          </div>
        </div>

        <div className="separator"></div>

        <div className="footer-info">
          Documento generado por {empresa?.nombre || 'Pauleta Canaria SL'}<br />
          Fecha: {formatFecha(new Date().toISOString())}
        </div>
      </div>

      <div className="print-button-container print:hidden">
        <PrintButton color={color} showFormatSelector={false} />
      </div>
    </div>
  )
}
