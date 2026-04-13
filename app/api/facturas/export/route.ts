import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import * as XLSX from "xlsx"
import JSZip from "jszip"

export const maxDuration = 60

export async function GET(request: NextRequest) {
    const from = request.nextUrl.searchParams.get("from")
    const to = request.nextUrl.searchParams.get("to")
    const estado = request.nextUrl.searchParams.get("estado")

    if (!from || !to) {
        return NextResponse.json(
            { error: "Selecciona un rango de fechas para exportar" },
            { status: 400 }
        )
    }

    try {
        const supabase = await createClient()

        // Fetch all matching invoices with client data and line items
        let query = supabase
            .from("facturas")
            .select(`
                *,
                cliente:clientes(*),
                lineas:lineas_factura(*, producto:productos!lineas_factura_producto_id_fkey(codigo_barras, nombre))
            `)
            .gte("fecha", from)
            .lte("fecha", to)
            .order("fecha", { ascending: true })
            .order("numero", { ascending: true })

        if (estado) {
            query = query.eq("estado", estado)
        }

        const { data: facturas, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!facturas || facturas.length === 0) {
            return NextResponse.json(
                { error: "No se encontraron facturas en el rango seleccionado" },
                { status: 404 }
            )
        }

        // Get empresa data for PDF generation
        const { data: empresa } = await supabase
            .from("empresa")
            .select("*")
            .single()

        // --- Generate Excel ---
        const excelRows = facturas.map((f: any) => ({
            "Nº Factura": f.numero,
            "Fecha": f.fecha,
            "Cliente": f.cliente?.nombre || "Sin cliente",
            "CIF Cliente": f.cliente?.cif || "",
            "Base Imponible": f.base_imponible || 0,
            "% IGIC": empresa?.igic_default || 7,
            "IGIC": f.igic || 0,
            "Total": f.total || 0,
            "Estado": f.estado,
        }))

        // Add totals row
        const totals = facturas.reduce(
            (acc: any, f: any) => ({
                base: acc.base + (f.base_imponible || 0),
                igic: acc.igic + (f.igic || 0),
                total: acc.total + (f.total || 0),
            }),
            { base: 0, igic: 0, total: 0 }
        )

        excelRows.push({
            "Nº Factura": "",
            "Fecha": "",
            "Cliente": "",
            "CIF Cliente": `TOTALES (${facturas.length} facturas)`,
            "Base Imponible": Math.round(totals.base * 100) / 100,
            "% IGIC": "",
            "IGIC": Math.round(totals.igic * 100) / 100,
            "Total": Math.round(totals.total * 100) / 100,
            "Estado": "",
        } as any)

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(excelRows)

        // Set column widths
        ws["!cols"] = [
            { wch: 15 }, // Nº Factura
            { wch: 12 }, // Fecha
            { wch: 30 }, // Cliente
            { wch: 14 }, // CIF
            { wch: 15 }, // Base
            { wch: 8 },  // % IGIC
            { wch: 12 }, // IGIC
            { wch: 12 }, // Total
            { wch: 12 }, // Estado
        ]

        XLSX.utils.book_append_sheet(wb, ws, "Facturas")
        const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

        // --- Generate PDFs ---
        const { generateInvoicePDF, generateQuarterlyReportPDF } = await import("@/lib/pdf-generator")
        const zip = new JSZip()
        const pdfsFolder = zip.folder("PDFs")!

        // Generate quarterly summary report PDF
        try {
            const reportBuffer = await generateQuarterlyReportPDF({
                facturas: facturas.map((f: any) => ({
                    numero: f.numero,
                    fecha: f.fecha,
                    base_imponible: f.base_imponible || 0,
                    igic: f.igic || 0,
                    total: f.total || 0,
                    estado: f.estado,
                })),
                empresa: empresa || { nombre: "Pauleta Canaria S.L." } as any,
                dateFrom: from,
                dateTo: to,
            })
            zip.file("resumen-trimestral.pdf", reportBuffer)
        } catch (reportErr) {
            console.error("Error generating quarterly report PDF:", reportErr)
        }

        zip.file("facturas.xlsx", excelBuffer)

        for (const factura of facturas) {
            try {
                const pdfBuffer = await generateInvoicePDF({
                    factura: {
                        ...factura,
                        lineas: factura.lineas || [],
                    },
                    cliente: factura.cliente || { nombre: "Sin cliente" } as any,
                    empresa: empresa || { nombre: "Pauleta Canaria S.L." } as any,
                })

                const safeName = (factura.numero || factura.id).replace(/[/\\?%*:|"<>]/g, "-")
                pdfsFolder.file(`${safeName}.pdf`, pdfBuffer)
            } catch (pdfErr) {
                console.error(`Error generating PDF for ${factura.numero}:`, pdfErr)
            }
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

        // Build filename
        const fileName = `facturas-${from}-a-${to}.zip`

        return new NextResponse(zipBuffer, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        })
    } catch (error: any) {
        console.error("Export error:", error)
        return NextResponse.json(
            { error: error.message || "Error al exportar" },
            { status: 500 }
        )
    }
}
