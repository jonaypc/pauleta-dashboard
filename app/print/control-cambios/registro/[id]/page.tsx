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
    month: "long",
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

export default async function ControlCambiosRegistroPrintPage({ params }: PageProps) {
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
  const logoWidth = empresa?.logo_width || 80
  const cliente = registro.cliente

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
          .control-cambios { box-shadow: none !important; }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f0f0f0;
        }

        .control-cambios {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm 18mm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 5mm;
        }

        .company-info { flex: 1; }
        .company-logo { margin-bottom: 8px; }
        .company-name { font-size: 22px; font-weight: 700; color: ${color}; margin-bottom: 4px; }
        .company-details { color: #64748b; font-size: 10px; line-height: 1.5; }

        .title-box {
          text-align: right;
          padding: 8px 16px;
          background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
          border-radius: 8px;
          color: white;
        }
        .title-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; }
        .title-text { font-size: 18px; font-weight: 800; margin: 4px 0; }
        .title-date { font-size: 11px; opacity: 0.9; }

        .parties-section {
          display: flex;
          gap: 15mm;
          margin-bottom: 5mm;
          padding: 8px 0;
          border-top: 2px solid #e2e8f0;
          border-bottom: 2px solid #e2e8f0;
        }
        .party-box { flex: 1; }
        .party-label {
          font-size: 9px; text-transform: uppercase; color: ${color};
          font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;
          display: flex; align-items: center; gap: 5px;
        }
        .party-label::before {
          content: ''; width: 3px; height: 12px;
          background: ${color}; border-radius: 2px;
        }
        .party-name { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
        .party-contact { font-size: 12px; font-weight: 600; color: ${color}; margin-bottom: 2px; }
        .party-cif { font-size: 11px; color: #64748b; font-family: monospace; margin-bottom: 4px; }
        .party-address { font-size: 10px; color: #64748b; line-height: 1.5; }

        .items-table { width: 100%; border-collapse: collapse; font-size: 11px; flex: 1; }
        .items-table thead th {
          padding: 6px 8px; text-align: left; font-weight: 700;
          font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
          color: white; background: ${color};
        }
        .items-table thead th:first-child { border-radius: 6px 0 0 0; }
        .items-table thead th:last-child { border-radius: 0 6px 0 0; }
        .items-table tbody td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
        .items-table tbody tr:nth-child(even) { background: #fefce8; }
        .items-table .center { text-align: center; }
        .items-table .code { font-family: monospace; font-size: 9px; color: #94a3b8; }

        .totals-row {
          display: flex; justify-content: flex-end; gap: 20px;
          margin-top: 3mm; padding: 8px 0;
          border-top: 2px solid ${color};
        }
        .total-item { text-align: center; }
        .total-label { font-size: 9px; text-transform: uppercase; color: ${color}; font-weight: 700; letter-spacing: 0.5px; }
        .total-value { font-size: 18px; font-weight: 800; color: #1e293b; min-width: 60px; padding: 2px 8px; margin-top: 2px; }

        .notes-section {
          margin-top: 4mm; padding: 6px 10px;
          border: 1px dashed #e2e8f0; border-radius: 6px; min-height: 12mm;
        }
        .notes-label { font-size: 9px; text-transform: uppercase; color: ${color}; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
        .notes-text { font-size: 10px; color: #475569; white-space: pre-wrap; }

        .signature-section { display: flex; gap: 20mm; margin-top: 5mm; }
        .signature-box { flex: 1; text-align: center; }
        .signature-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
        .signature-line { height: 18mm; border: 1px dashed #cbd5e1; border-radius: 6px; }

        .watermark {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 100px; font-weight: 900;
          color: rgba(217, 119, 6, 0.03);
          pointer-events: none; white-space: nowrap;
        }
      `}} />

      <div className="control-cambios">
        <div className="watermark">CONTROL CAMBIOS</div>

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
              {empresa?.direccion && <div>{empresa.direccion}</div>}
              {(empresa?.ciudad || empresa?.codigo_postal) && (
                <div>{empresa.ciudad}{empresa?.provincia ? `, ${empresa.provincia}` : ''} {empresa.codigo_postal}</div>
              )}
              {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
              {empresa?.cif && <div>CIF: {empresa.cif}</div>}
            </div>
          </div>

          <div className="title-box">
            <div className="title-label">Control de</div>
            <div className="title-text">Cambios</div>
            <div className="title-date">{formatFecha(registro.fecha)}</div>
          </div>
        </div>

        {/* PARTIES */}
        <div className="parties-section">
          <div className="party-box">
            <div className="party-label">Cliente</div>
            <div className="party-name">{cliente?.nombre}</div>
            {cliente?.persona_contacto && <div className="party-contact">{cliente.persona_contacto}</div>}
            {cliente?.cif && <div className="party-cif">{cliente.cif}</div>}
            <div className="party-address">
              {cliente?.direccion && <div>{cliente.direccion}</div>}
              {(cliente?.ciudad || cliente?.codigo_postal) && (
                <div>
                  {cliente.codigo_postal} {cliente.ciudad}
                  {cliente?.provincia && ` (${cliente.provincia})`}
                </div>
              )}
            </div>
          </div>

          {(cliente?.direccion_entrega || cliente?.ciudad_entrega) && (
            <div className="party-box">
              <div className="party-label">Establecimiento</div>
              <div className="party-name">{cliente?.persona_contacto || cliente?.nombre}</div>
              <div className="party-address">
                {cliente?.direccion_entrega && <div>{cliente.direccion_entrega}</div>}
                {(cliente?.ciudad_entrega || cliente?.cp_entrega) && (
                  <div>
                    {cliente.cp_entrega} {cliente.ciudad_entrega}
                    {cliente?.provincia_entrega && ` (${cliente.provincia_entrega})`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ITEMS TABLE */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Producto</th>
              <th className="center" style={{ width: '15%' }}>Retirado</th>
              <th style={{ width: '25%' }}>Motivo</th>
              <th className="center" style={{ width: '20%' }}>Entregado</th>
            </tr>
          </thead>
          <tbody>
            {registro.lineas?.map((linea: any) => (
              <tr key={linea.id}>
                <td>
                  <div>{linea.descripcion}</div>
                  {linea.producto?.codigo_barras && (
                    <div className="code">{linea.producto.codigo_barras}</div>
                  )}
                </td>
                <td className="center" style={{ fontWeight: 700 }}>{linea.cantidad_retirada}</td>
                <td>{linea.motivo || "—"}</td>
                <td className="center" style={{ fontWeight: 700 }}>{linea.cantidad_entregada}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="totals-row">
          <div className="total-item">
            <div className="total-label">Total retirado</div>
            <div className="total-value">{registro.total_retirado}</div>
          </div>
          <div className="total-item">
            <div className="total-label">Total entregado</div>
            <div className="total-value">{registro.total_entregado}</div>
          </div>
        </div>

        {/* NOTES */}
        {registro.observaciones && (
          <div className="notes-section">
            <div className="notes-label">Observaciones</div>
            <div className="notes-text">{registro.observaciones}</div>
          </div>
        )}

        {/* SIGNATURES */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-label">Firma del cliente</div>
            <div className="signature-line" />
          </div>
          <div className="signature-box">
            <div className="signature-label">Firma del repartidor</div>
            <div className="signature-line" />
          </div>
        </div>
      </div>

      {/* Print button */}
      <div className="print-button-container" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 100
      }}>
        <PrintButton />
      </div>
    </div>
  )
}
