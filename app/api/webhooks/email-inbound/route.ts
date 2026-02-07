
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { analyzeTextWithGPT, analyzeImageWithGPT } from "@/lib/ai/invoice-parser"

// Configurar tiempo máximo - proceso largo
export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        // 0. Parsear body & Logging (Para debug total)
        let formData: FormData | null = null
        try {
            formData = await request.formData()
        } catch (e) {
            console.error("Error parsing form data:", e)
        }

        const supabase = await createAdminClient()
        const { data: logEntry, error: logError } = await supabase.from('webhook_logs').insert({
            source: 'email-inbound',
            status: 'received',
            metadata: {
                headers: Object.fromEntries(request.headers.entries()),
                url: request.url,
                form_keys: formData ? Array.from(formData.keys()) : []
            }
        }).select().single()

        const logId = logEntry?.id

        // 1. Validar API Key (Seguridad básica)
        const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key")
        if (apiKey !== process.env.EMAIL_INBOUND_API_KEY) {
            console.error(`[Webhook Auth Error] Received: '${apiKey}'`)
            if (logId) await supabase.from('webhook_logs').update({ status: 'error', error: 'Unauthorized: Invalid API Key' }).eq('id', logId)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!formData) {
            if (logId) await supabase.from('webhook_logs').update({ status: 'error', error: 'No Form Data' }).eq('id', logId)
            return NextResponse.json({ error: "No Form Data" }, { status: 400 })
        }

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
            if (logId) await supabase.from('webhook_logs').update({ status: 'no_attachments', error: 'No PDF/Image found' }).eq('id', logId)
            return NextResponse.json({ message: "No attachments found to process" }, { status: 200 })
        }

        // const supabase = await createAdminClient() // Already created above
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
                    throw new Error("Storage upload failed: " + uploadError.message)
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
                    } else {
                        // Fallback simple si no hay texto (escan)
                        parsedData = {
                            concepto: "PDF Escaneado (Sin OCR)",
                            confidence: 0,
                            // resto null
                        }
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
                    proveedor_id,
                    estado: 'pendiente', // Pendiente de pago
                    notas: `Importado automáticamente desde email de: ${from}. \nConcepto: ${parsedData?.concepto || subject}\nTexto extraído: ${parsedData ? 'SI' : 'NO'}. \nConfianza IA: ${parsedData?.confidence || 0}%`,
                    archivo_url: publicUrl,
                    base_imponible: parsedData?.base_imponible,
                    impuestos: parsedData?.iva
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

        if (logId) await supabase.from('webhook_logs').update({ status: 'success', metadata: { results } }).eq('id', logId)

        console.log(`[Webhook Success] Processed ${results.length} files successfully.`)
        return NextResponse.json({ success: true, results })

    } catch (error: any) {
        console.error("Webhook Error:", error)
        // Try to log error to DB if possible
        try {
            const supabase = await createAdminClient()
            // We might not have logId here easily if it failed before, but let's try to insert a new error log
            await supabase.from('webhook_logs').insert({
                source: 'email-inbound',
                status: 'error',
                error: error.message,
                metadata: { stage: 'catch-all' }
            })
        } catch (e) { }

        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
