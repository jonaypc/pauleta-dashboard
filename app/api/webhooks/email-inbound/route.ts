
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { analyzeTextWithGPT, analyzeImageWithGPT } from "@/lib/ai/invoice-parser"

// Configurar tiempo máximo - proceso largo
export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        // 1. Validar API Key (Seguridad básica)
        const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key")
        if (apiKey !== process.env.EMAIL_INBOUND_API_KEY) {
            console.error(`[Webhook Auth Error] Received: '${apiKey}', Expected: '${process.env.EMAIL_INBOUND_API_KEY}'`)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // 2. Parsear el body (Asumimos formato multipart/form-data típico de CloudMailin/Mailgun)
        // Ojo: CloudMailin envía fields: plain, html, reply_plain, etc. y attachments[x]
        const formData = await request.formData()

        const subject = formData.get("subject") as string || "Sin asunto"
        const from = formData.get("from") as string || "Desconocido"

        // Buscar adjuntos
        // CloudMailin envía 'attachments[]' o 'attachment1', varia según config.
        // Vamos a iterar sobre todas las entries buscando Files
        const files: File[] = []
        const entries = Array.from(formData.entries())
        for (const [key, value] of entries) {
            if (value instanceof File) {
                // Filtrar solo PDFs e Imágenes
                if (value.type === "application/pdf" || value.type.startsWith("image/")) {
                    files.push(value)
                }
            }
        }

        if (files.length === 0) {
            return NextResponse.json({ message: "No attachments found to process" }, { status: 200 })
        }

        const supabase = await createClient()
        const results = []

        // 3. Procesar cada archivo
        for (const file of files) {
            try {
                // A. Subir a Storage
                const fileExt = file.name.split('.').pop()
                const fileName = `email_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `facturas_gastos/${fileName}`

                // Necesitamos ArrayBuffer para upload y analisis
                const arrayBuffer = await file.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)

                const { error: uploadError } = await supabase.storage
                    .from('gastos')
                    .upload(filePath, file, {
                        contentType: file.type,
                        upsert: false
                    })

                let publicUrl = null
                if (!uploadError) {
                    const { data } = supabase.storage.from('gastos').getPublicUrl(filePath)
                    publicUrl = data.publicUrl
                } else {
                    console.error("Storage Error:", uploadError)
                }

                // B. Analizar con IA
                let parsedData = null

                const isImage = file.type.startsWith("image/")
                const isPdf = file.type === "application/pdf"

                if (isImage) {
                    const base64 = buffer.toString('base64')
                    parsedData = await analyzeImageWithGPT(base64, file.type)
                } else if (isPdf) {
                    // Lazy load pdf-parse
                    // @ts-ignore
                    const pdfParser = require("pdf-parse");
                    const pdfData = await pdfParser(buffer)
                    const text = pdfData.text.trim()
                    // Si hay texto, usar GPT texto. Si es escaneo, fallará (o podríamos implementar PDF->Img->GPT Vision aqui también)
                    // Por simplicidad en webhook, si falla texto, lo marcamos como revisión manual
                    if (text.length > 50) {
                        parsedData = await analyzeTextWithGPT(text)
                    }
                }

                // C. Insertar en BD como "Pendiente / Borrador"
                // Usamos la tabla 'gastos' pero con estado 'borrador' si existe ese estado?
                // El usuario quiere "Inbox".
                // Estado actual: 'pendiente' significa pendiente de PAGO.
                // Podríamos usar un flag `is_draft` o estado `revision`.
                // Dado que no tenemos columna `is_draft` aun, vamos a usar `estado: 'pendiente'` 
                // PERO con nota "IMPORTADO POR EMAIL - REVISAR"

                // Gestionar proveedor (intentar buscar)
                let proveedor_id = null
                if (parsedData?.nombre_proveedor) {
                    const { data: prov } = await supabase.from("proveedores")
                        .select("id")
                        .ilike("nombre", parsedData.nombre_proveedor)
                        .maybeSingle()
                    if (prov) proveedor_id = prov.id
                }

                const { error: insertError } = await supabase.from("gastos").insert({
                    fecha: parsedData?.fecha || new Date().toISOString(),
                    importe: parsedData?.importe || 0,
                    numero: parsedData?.numero || `EMAIL-${Date.now()}`,
                    concepto: parsedData?.concepto || `Factura recibida por email: ${subject}`,
                    proveedor_id,
                    estado: 'pendiente', // Pendiente de pago
                    notas: `Importado automáticamente desde email de: ${from}. \nTexto extraído: ${parsedData ? 'SI' : 'NO'}. \nConfianza IA: ${parsedData?.confidence || 0}%`,
                    archivo_url: publicUrl,
                    base_imponible: parsedData?.base_imponible,
                    iva: parsedData?.iva
                })

                if (insertError) {
                    console.error("DB Insert Error:", insertError)
                    results.push({ file: file.name, status: "error_db", error: insertError.message })
                } else {
                    results.push({ file: file.name, status: "success" })
                }

            } catch (err: any) {
                console.error(`Error processing file ${file.name}:`, err)
                results.push({ file: file.name, status: "error_process", error: err.message })
            }
        }

        return NextResponse.json({ success: true, results })

    } catch (error: any) {
        console.error("Webhook Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
