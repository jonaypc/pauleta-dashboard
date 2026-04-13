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

        // Fetch all matching invoices with client data (no line items needed for Excel)
        let query = supabase
            .from("facturas")
            .select("*, cliente:clientes(nombre, cif)")
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

        // Get empresa data
        const { data: empresa } = await supabase
            .from("empresa")
            .select("*")
            .single()

        const zip = new JSZip()

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
        ws["!cols"] = [
            { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 14 },
            { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        ]
        XLSX.utils.book_append_sheet(wb, ws, "Facturas")
        const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
        zip.file("facturas.xlsx", excelBuffer)

        // --- Generate Quarterly Report PDF ---
        try {
            const { generateQuarterlyReportPDF } = await import("@/lib/pdf-generator")
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

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

        // Return ZIP + invoice IDs for client-side PDF fetching
        return NextResponse.json({
            zipBase64: Buffer.from(zipBuffer).toString("base64"),
            facturas: facturas.map((f: any) => ({
                id: f.id,
                numero: f.numero,
            })),
        })
    } catch (error: any) {
        console.error("Export error:", error)
        return NextResponse.json(
            { error: error.message || "Error al exportar" },
            { status: 500 }
        )
    }
}
