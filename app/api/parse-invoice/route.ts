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

// @ts-ignore
const pdf = require("pdf-parse")

export async function POST(request: NextRequest) {
    try {
        // Verificar API key
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

        console.log("File received:", { name: file.name, type: file.type, size: file.size })

        const isImage = file.type.includes("image") ||
            file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)

        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

        if (isImage) {
            console.log("Processing Image file...")
            const imageBase64 = buffer.toString('base64')
            const mimeType = file.type || 'image/jpeg'

            const parsed = await analyzeImageWithGPT(imageBase64, mimeType)

            return NextResponse.json({
                success: true,
                text: "[Imagen analizada con IA]",
                parsed,
                method: "vision-analysis"
            })
        } else if (isPdf) {
            console.log("Processing PDF file with pdf-parse (SERVER SIDE)...")
            try {
                const pdfData = await pdf(buffer)
                const text = pdfData.text.trim()

                console.log(`PDF Text extracted length: ${text.length} chars`)

                // Si hay muy poco texto, probablemente sea una imagen escaneada
                if (text.length < 50) {
                    return NextResponse.json({
                        success: false,
                        error: "El PDF parece ser una imagen escaneada (sin texto seleccionable). Por favor, sube una foto (JPG/PNG) de la factura.",
                        debug: { reason: "insufficient_text", textLength: text.length }
                    }, { status: 422 })
                }

                // Analizar texto extraído
                const parsed = await analyzeTextWithGPT(text)

                return NextResponse.json({
                    success: true,
                    text: text.substring(0, 100) + "...",
                    parsed,
                    method: "pdf-text-analysis"
                })

            } catch (pdfError: any) {
                console.error("PDF Parse Error:", pdfError)
                return NextResponse.json({
                    success: false,
                    error: "Error al leer el archivo PDF. Intenta subirlo como imagen.",
                    debug: { error: pdfError.message }
                }, { status: 400 })
            }
        } else {
            return NextResponse.json({
                success: false,
                error: `Tipo de archivo no soportado. Recibido: ${file.name} (${file.type})`,
                debug: { name: file.name, type: file.type }
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
