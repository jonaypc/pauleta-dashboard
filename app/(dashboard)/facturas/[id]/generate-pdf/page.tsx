"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function GeneratePDFPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const id = params.id as string
    const action = searchParams.get("action") // "download" o "share"

    const [status, setStatus] = useState<"loading" | "generating" | "done" | "error">("loading")
    const [factura, setFactura] = useState<any>(null)
    const [empresa, setEmpresa] = useState<any>(null)
    const [errorMessage, setErrorMessage] = useState<string>("")
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadData = async () => {
            const supabase = createClient()

            // Cargar factura
            const { data: facturaData, error: facturaError } = await supabase
                .from("facturas")
                .select(`
                    *,
                    cliente:clientes(*),
                    lineas:lineas_factura(*, producto:productos!lineas_factura_producto_id_fkey(codigo_barras, nombre))
                `)
                .eq("id", id)
                .single()

            if (facturaError || !facturaData) {
                setStatus("error")
                return
            }

            setFactura(facturaData)

            // Cargar empresa
            const { data: empresaData } = await supabase
                .from("empresa")
                .select("*")
                .single()

            setEmpresa(empresaData)
            setStatus("generating")
        }

        loadData()
    }, [id])

    useEffect(() => {
        if (status !== "generating" || !factura || !containerRef.current) return

        const generatePDF = async () => {
            try {
                // Importar html2pdf dinámicamente
                const html2pdf = (await import("html2pdf.js")).default

                const element = containerRef.current
                const opt = {
                    margin: 0,
                    filename: `${factura.numero}.pdf`,
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
                }

                // Generar PDF
                const pdfBlob = await html2pdf().set(opt as any).from(element as HTMLElement).outputPdf("blob")
                const file = new File([pdfBlob], `${factura.numero}.pdf`, { type: "application/pdf" })

                try {
                    if (action === "share" && navigator.share && navigator.canShare?.({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: `Factura ${factura.numero}`,
                            text: `Factura ${factura.numero} de Pauleta Canaria`,
                        })
                    } else {
                        // Descargar
                        const url = URL.createObjectURL(pdfBlob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `${factura.numero}.pdf`
                        a.click()
                        URL.revokeObjectURL(url)
                    }
                } catch (shareError: any) {
                    console.log("Error sharing/downloading:", shareError)
                    // Ignorar errores de usuario cancelando share
                    if (shareError.name !== "AbortError") {
                        // Si falla share, intentar descarga manual
                        const url = URL.createObjectURL(pdfBlob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `${factura.numero}.pdf`
                        a.click()
                        URL.revokeObjectURL(url)
                    }
                }

                setStatus("done")

                // Cerrar ventana después de un momento
                setTimeout(() => {
                    window.close()
                }, 3000)

            } catch (err: any) {
                console.error("Error generating PDF:", err)
                setErrorMessage(err.message || String(err))
                setStatus("error")
            }
        }

        // Dar tiempo a que se renderice el HTML
        setTimeout(generatePDF, 500)
    }, [status, factura, action])

    const formatPrecio = (precio: number): string => {
        return new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
        }).format(precio)
    }

    const formatFecha = (fecha: string): string => {
        return new Date(fecha).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        })
    }

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando factura...</p>
                </div>
            </div>
        )
    }

    if (status === "error") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="text-center text-red-600 bg-white p-6 rounded shadow-lg max-w-md">
                    <p className="text-xl font-bold mb-2">Error generando PDF</p>
                    <p className="mb-4">No se pudo generar el documento.</p>
                    <p className="text-sm bg-gray-100 p-2 rounded overflow-auto mb-4 font-mono text-left max-h-32 text-gray-800">
                        {errorMessage || "Error desconocido"}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

    if (status === "done") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center text-green-600">
                    <p className="text-xl font-bold">✓ PDF generado</p>
                    <p>Puedes cerrar esta ventana</p>
                </div>
            </div>
        )
    }

    const color = empresa?.color_primario || "#1e40af"

    return (
        <div className="bg-gray-100 min-h-screen p-4">
            {/* Mensaje de estado */}
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                Generando PDF...
            </div>

            {/* Contenido de la factura para convertir a PDF */}
            <div
                ref={containerRef}
                style={{
                    width: "210mm",
                    minHeight: "296mm", // Un poco menos de A4 para evitar página extra
                    padding: "15mm 20mm",
                    margin: "0 auto",
                    background: "white",
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    boxSizing: "border-box",
                }}
            >
                {/* HEADER */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm" }}>
                    <div>
                        {empresa?.logo_url && (
                            <img
                                src={empresa.logo_url}
                                alt="Logo"
                                style={{ height: `${empresa.logo_width || 80}px`, marginBottom: "8px" }}
                            />
                        )}
                        <div style={{ fontSize: "22px", fontWeight: "700", color, marginBottom: "4px" }}>
                            {empresa?.nombre || "Pauleta Canaria SL"}
                        </div>
                        <div style={{ color: "#64748b", fontSize: "10px", lineHeight: "1.5" }}>
                            {empresa?.cif && <div>CIF: {empresa.cif}</div>}
                            {empresa?.direccion && <div>{empresa.direccion}</div>}
                            {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
                            {empresa?.email && <div>{empresa.email}</div>}
                        </div>
                    </div>
                    <div style={{
                        textAlign: "right",
                        padding: "12px 20px",
                        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                        borderRadius: "8px",
                        color: "white",
                        minWidth: "200px",
                    }}>
                        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.9 }}>
                            Factura
                        </div>
                        <div style={{ fontSize: "28px", fontWeight: "800", margin: "4px 0" }}>
                            N.º {factura.numero}
                        </div>
                        <div style={{ fontSize: "14px", opacity: 0.9 }}>
                            {formatFecha(factura.fecha)}
                        </div>
                    </div>
                </div>

                {/* DATOS CLIENTE */}
                <div style={{
                    display: "flex",
                    gap: "15mm",
                    marginBottom: "10mm",
                    padding: "15px 0",
                    borderTop: "2px solid #e2e8f0",
                    borderBottom: "2px solid #e2e8f0",
                }}>
                    <div>
                        <div style={{
                            fontSize: "11px",
                            textTransform: "uppercase",
                            color,
                            fontWeight: "700",
                            letterSpacing: "1px",
                            marginBottom: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                        }}>
                            <span style={{ width: "3px", height: "12px", background: color, borderRadius: "2px" }}></span>
                            Facturar a
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "2px" }}>
                            {factura.cliente?.nombre}
                        </div>
                        {factura.cliente?.cif && (
                            <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace", marginBottom: "4px" }}>
                                {factura.cliente.cif}
                            </div>
                        )}
                        {factura.cliente?.direccion && (
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                                {factura.cliente.direccion}
                            </div>
                        )}
                    </div>
                </div>

                {/* TABLA DE PRODUCTOS */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm" }}>
                    <thead>
                        <tr style={{ background: "#f8fafc" }}>
                            <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", color: "#64748b", fontWeight: "700", borderBottom: `2px solid ${color}40` }}>
                                Código
                            </th>
                            <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "10px", textTransform: "uppercase", color: "#64748b", fontWeight: "700", borderBottom: `2px solid ${color}40` }}>
                                Descripción
                            </th>
                            <th style={{ padding: "12px 10px", textAlign: "center", fontSize: "10px", textTransform: "uppercase", color: "#64748b", fontWeight: "700", borderBottom: `2px solid ${color}40` }}>
                                Cant.
                            </th>
                            <th style={{ padding: "12px 10px", textAlign: "right", fontSize: "10px", textTransform: "uppercase", color: "#64748b", fontWeight: "700", borderBottom: `2px solid ${color}40` }}>
                                Precio
                            </th>
                            <th style={{ padding: "12px 10px", textAlign: "right", fontSize: "10px", textTransform: "uppercase", color: "#64748b", fontWeight: "700", borderBottom: `2px solid ${color}40` }}>
                                Importe
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {factura.lineas?.map((linea: any) => (
                            <tr key={linea.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "12px 10px", fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                                    {linea.producto?.codigo_barras || "-"}
                                </td>
                                <td style={{ padding: "12px 10px", fontSize: "12px", color: "#334155", fontWeight: "500" }}>
                                    {linea.descripcion}
                                </td>
                                <td style={{ padding: "12px 10px", fontSize: "12px", color: "#334155", textAlign: "center" }}>
                                    {linea.cantidad}
                                </td>
                                <td style={{ padding: "12px 10px", fontSize: "12px", color: "#334155", textAlign: "right", fontFamily: "monospace" }}>
                                    {formatPrecio(linea.precio_unitario)}
                                </td>
                                <td style={{ padding: "12px 10px", fontSize: "12px", color: "#334155", textAlign: "right", fontFamily: "monospace" }}>
                                    {formatPrecio(linea.subtotal)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* TOTALES */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", paddingTop: "5mm" }}>
                    <div style={{
                        width: "70mm",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        padding: "12px 15px",
                        border: "1px solid #e2e8f0",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "12px", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ color: "#64748b" }}>Subtotal</span>
                            <span style={{ fontWeight: "600", fontFamily: "monospace" }}>{formatPrecio(factura.base_imponible)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "12px", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ color: "#64748b" }}>IGIC</span>
                            <span style={{ fontWeight: "600", fontFamily: "monospace" }}>{formatPrecio(factura.igic)}</span>
                        </div>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "8px",
                            paddingTop: "10px",
                            borderTop: `2px solid ${color}`,
                        }}>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>Total</span>
                            <span style={{ fontSize: "18px", fontWeight: "800", color, fontFamily: "monospace" }}>{formatPrecio(factura.total)}</span>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div style={{ marginTop: "auto", paddingTop: "10mm", borderTop: "1px solid #e2e8f0" }}>
                    {empresa?.cuenta_bancaria && (
                        <div style={{ textAlign: "center", marginBottom: "8px" }}>
                            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
                                Cuenta bancaria
                            </div>
                            <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "monospace", color: "#1e293b", letterSpacing: "2px" }}>
                                {empresa.cuenta_bancaria}
                            </div>
                        </div>
                    )}
                    <div style={{ textAlign: "center", fontSize: "12px", color, fontWeight: "500", margin: "10px 0" }}>
                        Gracias por su compra. Para cualquier consulta sobre esta factura, no dude en contactarnos.
                    </div>
                </div>
            </div>
        </div>
    )
}
