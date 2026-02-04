import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export interface ParsedInvoiceData {
    fecha: string | null
    importe: number | null
    numero: string | null
    cif_proveedor: string | null
    nombre_proveedor: string | null
    base_imponible: number | null
    iva: number | null
    iva_porcentaje: number | null
    concepto: string | null
    direccion_proveedor: string | null
    raw_text: string
    confidence: number
}

// Cliente OpenAI se crea bajo demanda para evitar errores en build
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY no configurada")
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        })
    }
    return openai
}

export async function POST(request: NextRequest) {
    try {
        // Verificar API key
        // getOpenAI() se llamará dentro de analyze... si no se llama, verificamos aquí
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                success: false,
                error: "OPENAI_API_KEY no configurada. Añádela en .env.local"
            }, { status: 500 })
        }

        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Determinar el tipo de archivo
        const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")
        const isImage = file.type.includes("image") ||
            file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)

        let imageBase64: string
        let mimeType: string

        if (isPdf) {
            console.log("Processing PDF file...")

            // PRIMERO: Intentar extraer texto (más barato y rápido)
            let extractedText = ""
            try {
                // Usar importación dinámica para unpdf
                const { extractText } = await import("unpdf")
                const result = await extractText(buffer)
                extractedText = Array.isArray(result.text) ? result.text.join('\n') : (result.text || "")
                console.log("Extracted text length:", extractedText.length)
            } catch (e) {
                console.error("Error extracting text:", e)
            }

            // Si el texto es suficiente, analizarlo como texto
            // (Umbral de 50 caracteres para evitar 'scanned headers' falsos)
            if (extractedText.trim().length > 50) {
                console.log("Using text analysis (text found)")
                try {
                    const parsed = await analyzeTextWithGPT(extractedText)
                    return NextResponse.json({
                        success: true,
                        text: extractedText,
                        parsed,
                        method: "text-analysis"
                    })
                } catch (e: any) {
                    console.error("GPT text analysis failed:", e)
                    // Si falla el análisis de texto, intentamos visión como fallback
                }
            } else {
                console.log("Not enough text found (likely scanned), trying Vision...")
            }

            // SI FALLA TEXTO O ES ESCANEADO: Convertir PDF a imagen y usar Vision
            // Usamos pdf-to-img para renderizar la primera página como imagen
            try {
                const pdfToImg = await import("pdf-to-img")

                // Renderizar PDF a imágenes (Buffer de Node)
                // Usamos scale 2 para mejor resolución OCR
                const document = await pdfToImg.pdf(buffer, { scale: 2.0 })

                let firstPageImage: Buffer | null = null

                // Iterar para encontrar la primera página (es un generador async)
                for await (const image of document) {
                    firstPageImage = image
                    break // Solo necesitamos la primera página para la factura
                }

                if (firstPageImage) {
                    const imageBase64 = firstPageImage.toString('base64')
                    // pdf-to-img devuelve PNG por defecto
                    const parsed = await analyzeImageWithGPT(imageBase64, 'image/png')

                    return NextResponse.json({
                        success: true,
                        text: "[PDF escaneado - Convertido a imagen]",
                        parsed,
                        method: "pdf-to-image-vision"
                    })
                } else {
                    throw new Error("No se pudo generar imagen del PDF")
                }
            } catch (e: any) {
                console.error("PDF to image failed:", e)

                // Si también falla la conversión a imagen y teníamos algo de texto...
                if (extractedText.length > 20) {
                    const parsed = await analyzeTextWithGPT(extractedText)
                    return NextResponse.json({
                        success: true,
                        text: extractedText,
                        parsed,
                        method: "text-fallback-low-quality"
                    })
                }

                return NextResponse.json({
                    success: false,
                    error: "No se pudo procesar este PDF escaneado. Asegúrate de que no esté protegido. Error: " + (e.message || "Conversión fallida")
                }, { status: 400 })
            }

        } else if (isImage) {
            // IMAGEN DIRECTA
            imageBase64 = buffer.toString('base64')
            mimeType = file.type || 'image/jpeg'

            const parsed = await analyzeImageWithGPT(imageBase64, mimeType)

            return NextResponse.json({
                success: true,
                text: "[Imagen analizada con IA]",
                parsed,
                method: "vision-analysis"
            })
        } else {
            return NextResponse.json({
                success: false,
                error: "Tipo de archivo no soportado. Solo PDF o imágenes."
            }, { status: 400 })
        }

    } catch (error: any) {
        console.error("Invoice Parse Error:", error)
        return NextResponse.json({
            success: false,
            error: error.message || "Error interno al analizar la factura."
        }, { status: 500 })
    }
}

async function analyzeTextWithGPT(text: string): Promise<ParsedInvoiceData> {
    const prompt = `Analiza el siguiente texto extraído de una factura española y extrae la información estructurada.

TEXTO DE LA FACTURA:
${text}

Extrae la siguiente información en formato JSON. Si no encuentras algún dato, usa null.
Responde SOLO con el JSON, sin explicaciones adicionales.

{
    "nombre_proveedor": "nombre completo de la empresa que emite la factura",
    "cif_proveedor": "CIF/NIF del proveedor (formato español, ej: B12345678)",
    "direccion_proveedor": "dirección completa del proveedor",
    "fecha": "fecha de emisión en formato YYYY-MM-DD",
    "numero": "número de factura completo",
    "concepto": "descripción breve de los productos/servicios facturados",
    "base_imponible": número decimal (sin símbolo €),
    "iva_porcentaje": número del porcentaje de IVA aplicado (ej: 21),
    "iva": número decimal del importe del IVA,
    "importe": número decimal del total a pagar,
    "confidence": número de 0 a 100 indicando tu confianza en la extracción
}`

    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en análisis de facturas españolas. Extraes información con máxima precisión. Los importes deben ser números decimales sin símbolos de moneda. Las fechas en formato YYYY-MM-DD."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 1000
        })

        const content = response.choices[0]?.message?.content || "{}"

        // Limpiar el JSON (quitar ```json si existe)
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        const parsed = JSON.parse(jsonStr)

        return {
            fecha: parsed.fecha || null,
            importe: typeof parsed.importe === 'number' ? parsed.importe : parseFloat(parsed.importe) || null,
            numero: parsed.numero || null,
            cif_proveedor: parsed.cif_proveedor || null,
            nombre_proveedor: parsed.nombre_proveedor || null,
            base_imponible: typeof parsed.base_imponible === 'number' ? parsed.base_imponible : parseFloat(parsed.base_imponible) || null,
            iva: typeof parsed.iva === 'number' ? parsed.iva : parseFloat(parsed.iva) || null,
            iva_porcentaje: parsed.iva_porcentaje || null,
            concepto: parsed.concepto || null,
            direccion_proveedor: parsed.direccion_proveedor || null,
            raw_text: text,
            confidence: parsed.confidence || 0
        }
    } catch (error: any) {
        console.error("GPT Analysis Error:", error)
        throw new Error("Error al analizar con IA: " + error.message)
    }
}

async function analyzeImageWithGPT(imageBase64: string, mimeType: string): Promise<ParsedInvoiceData> {
    const prompt = `Analiza esta imagen de una factura española y extrae toda la información relevante.

Extrae la siguiente información en formato JSON. Si no encuentras algún dato, usa null.
Responde SOLO con el JSON, sin explicaciones adicionales.

{
    "nombre_proveedor": "nombre completo de la empresa que emite la factura",
    "cif_proveedor": "CIF/NIF del proveedor (formato español, ej: B12345678)",
    "direccion_proveedor": "dirección completa del proveedor",
    "fecha": "fecha de emisión en formato YYYY-MM-DD",
    "numero": "número de factura completo",
    "concepto": "descripción breve de los productos/servicios facturados",
    "base_imponible": número decimal (sin símbolo €),
    "iva_porcentaje": número del porcentaje de IVA aplicado (ej: 21),
    "iva": número decimal del importe del IVA,
    "importe": número decimal del total a pagar,
    "confidence": número de 0 a 100 indicando tu confianza en la extracción
}`

    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en análisis de facturas españolas. Extraes información con máxima precisión de imágenes de facturas, tickets y recibos. Los importes deben ser números decimales sin símbolos de moneda. Las fechas en formato YYYY-MM-DD."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 1000
        })

        const content = response.choices[0]?.message?.content || "{}"

        // Limpiar el JSON
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        const parsed = JSON.parse(jsonStr)

        return {
            fecha: parsed.fecha || null,
            importe: typeof parsed.importe === 'number' ? parsed.importe : parseFloat(parsed.importe) || null,
            numero: parsed.numero || null,
            cif_proveedor: parsed.cif_proveedor || null,
            nombre_proveedor: parsed.nombre_proveedor || null,
            base_imponible: typeof parsed.base_imponible === 'number' ? parsed.base_imponible : parseFloat(parsed.base_imponible) || null,
            iva: typeof parsed.iva === 'number' ? parsed.iva : parseFloat(parsed.iva) || null,
            iva_porcentaje: parsed.iva_porcentaje || null,
            concepto: parsed.concepto || null,
            direccion_proveedor: parsed.direccion_proveedor || null,
            raw_text: "[Imagen analizada con GPT-4 Vision]",
            confidence: parsed.confidence || 0
        }
    } catch (error: any) {
        console.error("GPT Vision Error:", error)
        throw new Error("Error al analizar imagen con IA: " + error.message)
    }
}
