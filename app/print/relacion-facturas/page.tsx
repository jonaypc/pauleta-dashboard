import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/facturas/PrintButton"

export const dynamic = 'force-dynamic'

interface SearchParams {
    cif?: string
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

export default async function RelacionFacturasPrintPage({ 
    searchParams 
}: { 
    searchParams: SearchParams 
}) {
    const supabase = await createClient()
    const { cif, desde, hasta, periodo, mes, entregado, fecha } = searchParams

    if (!cif || !desde || !hasta) {
        notFound()
    }

    // Obtener datos de la empresa
    const { data: empresa } = await supabase
        .from("empresa")
        .select("*")
        .single()

    // Obtener clientes con este CIF
    const { data: clientesConCIF } = await supabase
        .from("clientes")
        .select("id, nombre, cif, persona_contacto")
        .eq("cif", cif)

    if (!clientesConCIF || clientesConCIF.length === 0) {
        notFound()
    }

    const clienteIds = clientesConCIF.map(c => c.id)
    const nombreGrupo = clientesConCIF[0].nombre

    // Obtener facturas del período
    const { data: facturas } = await supabase
        .from("facturas")
        .select(`
            id, numero, fecha, total,
            cliente:clientes(nombre, persona_contacto)
        `)
        .in("cliente_id", clienteIds)
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .neq("estado", "anulada")
        .order("fecha", { ascending: true })

    const total = facturas?.reduce((sum, f) => sum + (f.total || 0), 0) || 0
    const periodoLabel = periodo === "1" ? "1ª quincena" : "2ª quincena"

    const formatFecha = (f: string) => new Date(f).toLocaleDateString("es-ES")
    const formatFechaISO = (f: string) => f

    const color = empresa?.color_primario || "#1e40af"

    return (
        <div className="print-container">
            <style dangerouslySetInnerHTML={{
                __html: `
                @page {
                    size: A4;
                    margin: 15mm;
                }

                @media print {
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-button-container { display: none !important; }
                    .document { box-shadow: none !important; }
                }

                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #f0f0f0;
                    font-size: 11px;
                }
                
                .document {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 15mm;
                    margin: 0 auto;
                    background: white;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }

                .header-title {
                    text-align: center;
                    font-size: 16px;
                    font-weight: 700;
                    color: ${color};
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid ${color};
                }

                .company-info {
                    margin-bottom: 20px;
                    padding: 10px;
                    background: #f8fafc;
                    border-radius: 8px;
                }

                .company-name {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1e293b;
                }

                .company-details {
                    font-size: 10px;
                    color: #64748b;
                    margin-top: 4px;
                }

                .periodo-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    padding: 10px;
                    background: #f1f5f9;
                    border-radius: 6px;
                    font-size: 10px;
                }

                .periodo-info strong {
                    color: ${color};
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }

                th {
                    background: ${color};
                    color: white;
                    padding: 8px 6px;
                    text-align: left;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                th.right { text-align: right; }
                th.center { text-align: center; }

                td {
                    padding: 8px 6px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 10px;
                }

                td.right { text-align: right; font-family: monospace; }
                td.center { text-align: center; }
                td.mono { font-family: monospace; }

                tr:hover { background: #fafbfc; }

                .total-row {
                    background: #f1f5f9 !important;
                    font-weight: 700;
                }

                .total-row td {
                    border-top: 2px solid ${color};
                    font-size: 12px;
                }

                .signatures {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 40px;
                    padding-top: 20px;
                }

                .signature-box {
                    width: 45%;
                }

                .signature-label {
                    font-size: 9px;
                    color: #64748b;
                    margin-bottom: 40px;
                }

                .signature-line {
                    border-top: 1px solid #1e293b;
                    padding-top: 5px;
                    font-size: 10px;
                }

                .print-button-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 100;
                }
                `
            }} />

            <div className="document">
                {/* Título */}
                <div className="header-title">
                    RELACIÓN DE FACTURAS PRESENTADAS – {empresa?.nombre?.toUpperCase() || "PAULETA CANARIA S.L."}
                </div>

                {/* Datos de empresa */}
                <div className="company-info">
                    <div className="company-name">{empresa?.nombre || "PAULETA CANARIA S.L."}</div>
                    <div className="company-details">
                        CIF: {empresa?.cif || "B70853163"}<br />
                        {empresa?.direccion} {empresa?.codigo_postal} {empresa?.ciudad}<br />
                        Tel: {empresa?.telefono} &nbsp;&nbsp; Email: {empresa?.email}
                    </div>
                </div>

                {/* Información del período */}
                <div className="periodo-info">
                    <div>
                        <strong>PERIODO:</strong> {periodoLabel} &nbsp;&nbsp; 
                        {formatFecha(desde)} – {formatFecha(hasta)}
                    </div>
                    <div>
                        <strong>Fecha de presentación:</strong> {fecha ? formatFecha(fecha) : formatFecha(new Date().toISOString())}
                    </div>
                </div>
                <div className="periodo-info" style={{ marginTop: '-10px' }}>
                    <div><strong>Entregado por:</strong> {entregado || "-"}</div>
                    <div><strong>Cliente:</strong> {nombreGrupo}</div>
                </div>

                {/* Tabla de facturas */}
                <table>
                    <thead>
                        <tr>
                            <th>Nº Factura</th>
                            <th>Fecha</th>
                            <th>Tienda SPAR</th>
                            <th>Nº Albarán</th>
                            <th className="right">Importe (€)</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {facturas?.map(f => (
                            <tr key={f.id}>
                                <td className="mono">{f.numero}</td>
                                <td>{formatFechaISO(f.fecha)}</td>
                                <td>{(f.cliente as any)?.persona_contacto || (f.cliente as any)?.nombre}</td>
                                <td className="mono">{f.numero}</td>
                                <td className="right">{f.total.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        ))}
                        <tr className="total-row">
                            <td colSpan={4} style={{ textAlign: 'right' }}>TOTAL:</td>
                            <td className="right">{total.toFixed(2)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                {/* Firmas */}
                <div className="signatures">
                    <div className="signature-box">
                        <div className="signature-label">Firma de quien entrega:</div>
                        <div className="signature-line">________________________</div>
                    </div>
                    <div className="signature-box">
                        <div className="signature-label">Firma y sello de CENCOSU (Departamento de Pagos):</div>
                        <div className="signature-line">________________________</div>
                    </div>
                </div>
            </div>

            <div className="print-button-container print:hidden">
                <PrintButton color={color} />
            </div>
        </div>
    )
}
