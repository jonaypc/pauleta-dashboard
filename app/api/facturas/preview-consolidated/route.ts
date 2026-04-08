import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateConsolidatedEmailHTML } from "@/lib/email"

export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        const { facturaIds, format } = await request.json()

        if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
            return NextResponse.json(
                { error: "Se requiere un array de IDs de facturas" },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { data: facturas, error } = await supabase
            .from("facturas")
            .select(`
                *,
                cliente:clientes(*)
            `)
            .in("id", facturaIds)
            .order("fecha", { ascending: true })

        if (error || !facturas || facturas.length === 0) {
            return NextResponse.json(
                { error: "Error al obtener facturas" },
                { status: 500 }
            )
        }

        const emails = Array.from(new Set(
            facturas.map(f => f.cliente?.email).filter((e): e is string => !!e)
        ))
        if (emails.length === 0) {
            return NextResponse.json(
                { error: "Ningún cliente tiene email configurado" },
                { status: 400 }
            )
        }

        const cliente = facturas[0].cliente
        const totalGlobal = facturas.reduce((sum, f) => sum + f.total, 0)

        const { data: empresa } = await supabase
            .from("empresa")
            .select("*")
            .single()

        const empresaNombre = empresa?.nombre || "Pauleta Canaria S.L."

        // If format=pdf, generate the consolidated summary PDF
        if (format === "pdf") {
            const { generateConsolidatedPDF } = await import("@/lib/pdf-generator")
            const pdfBuffer = await generateConsolidatedPDF({
                facturas: facturas.map(f => ({
                    numero: f.numero,
                    fecha: f.fecha,
                    base_imponible: f.base_imponible,
                    igic: f.igic,
                    total: f.total,
                })),
                cliente,
                empresa: empresa || ({ nombre: empresaNombre } as any),
            })

            return new NextResponse(new Uint8Array(pdfBuffer), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": "inline; filename=Resumen-Preview.pdf",
                },
            })
        }

        // Default: return email HTML preview
        const { html, subject } = generateConsolidatedEmailHTML({
            clienteNombre: cliente!.nombre,
            empresaNombre,
            facturas: facturas.map(f => ({
                numero: f.numero,
                fecha: f.fecha,
                total: f.total,
            })),
            totalGlobal,
        })

        // Wrap in a preview frame with subject line shown at top
        const previewHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Preview: ${subject}</title>
    <style>
        .preview-bar {
            background: #1e293b;
            color: white;
            padding: 12px 20px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .preview-bar strong { color: #93c5fd; }
        .preview-bar .label { color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body style="margin:0; padding:0;">
    <div class="preview-bar">
        <div>
            <span class="label">Asunto:</span>
            <strong>${subject}</strong>
        </div>
        <div>
            <span class="label">Para:</span>
            <strong>${emails[0]}</strong>
        </div>
    </div>
    ${html}
</body>
</html>`

        return new NextResponse(previewHtml, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        })
    } catch (error) {
        console.error("[PREVIEW-CONSOLIDATED] Error:", error)
        const msg = error instanceof Error ? error.message : "Error desconocido"
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
