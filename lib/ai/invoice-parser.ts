
import OpenAI from "openai"

export interface TaxBreakdown {
    base: number
    porcentaje: number
    cuota: number
}

export interface ParsedInvoiceData {
    fecha: string | null
    importe: number | null
    numero: string | null
    cif_proveedor: string | null
    nombre_proveedor: string | null
    base_imponible: number | null
    iva: number | null
    iva_porcentaje: number | null
    desglose_impuestos?: TaxBreakdown[]
    concepto: string | null
    // Provider Details
    direccion_proveedor: string | null
    codigo_postal_proveedor: string | null
    ciudad_proveedor: string | null
    provincia_proveedor: string | null
    telefono_proveedor: string | null
    email_proveedor: string | null
    web_proveedor: string | null
    raw_text?: string
    confidence: number
}

// Cliente OpenAI singleton
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
    if (!openai) {
        // En Edge Runtime o Serverless, process.env debería estar disponible
        // Si no, lanzar error claramente
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY no configurada")
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        })
    }
    return openai
}

export async function analyzeTextWithGPT(text: string): Promise<ParsedInvoiceData> {
    const prompt = `Analiza el siguiente texto extraído de una factura española y extrae la información estructurada.

TEXTO DE LA FACTURA:
${text}

Extrae la siguiente información en formato JSON. Si no encuentras algún dato, usa null.
Responde SOLO con el JSON, sin explicaciones adicionales.

{
    "nombre_proveedor": "nombre completo de la empresa que emite la factura",
    "cif_proveedor": "CIF/NIF del proveedor (formato español, ej: B12345678)",
    "direccion_proveedor": "solo la calle y número",
    "codigo_postal_proveedor": "Código Postal (5 dígitos)",
    "ciudad_proveedor": "Municipio/Localidad",
    "provincia_proveedor": "Provincia",
    "telefono_proveedor": "Teléfono de contacto si aparece",
    "email_proveedor": "Email de contacto si aparece",
    "web_proveedor": "Página web si aparece",
    "fecha": "fecha de emisión en formato YYYY-MM-DD",
    "numero": "número de factura completo",
    "concepto": "descripción breve de los productos/servicios facturados",
    "base_imponible": número decimal,
    "iva_porcentaje": número del porcentaje principal (ej: 7),
    "iva": número decimal del impuesto,
    "importe": número decimal del total,
    "desglose_impuestos": [
        { "base": 100.0, "porcentaje": 7, "cuota": 7.0 }
    ],
    "confidence": número de 0 a 100
}

NOTA: Si es factura de Makro, extrae detalladamente el desglose de IGIC.`

    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en análisis de facturas españolas. Extraes información con máxima precisión. Los importes deben ser números decimales. Si es ABONO, devuelve importes negativos. Las fechas en YYYY-MM-DD."
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
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(jsonStr)

        return {
            fecha: parsed.fecha || null,
            importe: ensureNumber(parsed.importe),
            numero: parsed.numero || null,
            cif_proveedor: parsed.cif_proveedor || null,
            nombre_proveedor: parsed.nombre_proveedor || null,
            base_imponible: ensureNumber(parsed.base_imponible),
            iva: ensureNumber(parsed.iva),
            iva_porcentaje: parsed.iva_porcentaje || null,
            desglose_impuestos: parsed.desglose_impuestos || [],
            concepto: parsed.concepto || null,
            // New fields
            direccion_proveedor: parsed.direccion_proveedor || null,
            codigo_postal_proveedor: parsed.codigo_postal_proveedor || null,
            ciudad_proveedor: parsed.ciudad_proveedor || null,
            provincia_proveedor: parsed.provincia_proveedor || null,
            telefono_proveedor: parsed.telefono_proveedor || null,
            email_proveedor: parsed.email_proveedor || null,
            web_proveedor: parsed.web_proveedor || null,

            raw_text: text,
            confidence: parsed.confidence || 0
        }
    } catch (error: any) {
        console.error("GPT Analysis Error:", error)
        throw new Error("Error al analizar con IA: " + error.message)
    }
}

export async function analyzeImageWithGPT(imageBase64: string, mimeType: string): Promise<ParsedInvoiceData> {
    const prompt = `Analiza esta imagen de una factura española y extrae toda la información relevante.

Extrae la siguiente información en formato JSON. Si no encuentras algún dato, usa null.
Responde SOLO con el JSON.

{
    "nombre_proveedor": "nombre completo de la empresa",
    "cif_proveedor": "CIF/NIF",
    "direccion_proveedor": "solo calle y número",
    "codigo_postal_proveedor": "CP",
    "ciudad_proveedor": "Ciudad",
    "provincia_proveedor": "Provincia",
    "telefono_proveedor": "Teléfono",
    "email_proveedor": "Email",
    "fecha": "YYYY-MM-DD",
    "numero": "Nº Factura",
    "concepto": "descripción breve",
    "base_imponible": número,
    "iva_porcentaje": número (ej: 7),
    "iva": número,
    "importe": número total,
    "desglose_impuestos": [
        { "base": 0.0, "porcentaje": 0, "cuota": 0.0 }
    ],
    "confidence": 0-100
}`

    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en análisis de facturas españolas (IGIC). Extraes datos de imágenes. Importes negativos si es ABONO."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
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
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(jsonStr)

        return {
            fecha: parsed.fecha || null,
            importe: ensureNumber(parsed.importe),
            numero: parsed.numero || null,
            cif_proveedor: parsed.cif_proveedor || null,
            nombre_proveedor: parsed.nombre_proveedor || null,
            base_imponible: ensureNumber(parsed.base_imponible),
            iva: ensureNumber(parsed.iva),
            iva_porcentaje: parsed.iva_porcentaje || null,
            desglose_impuestos: parsed.desglose_impuestos || [],
            concepto: parsed.concepto || null,
            // New fields
            direccion_proveedor: parsed.direccion_proveedor || null,
            codigo_postal_proveedor: parsed.codigo_postal_proveedor || null,
            ciudad_proveedor: parsed.ciudad_proveedor || null,
            provincia_proveedor: parsed.provincia_proveedor || null,
            telefono_proveedor: parsed.telefono_proveedor || null,
            email_proveedor: parsed.email_proveedor || null,
            web_proveedor: parsed.web_proveedor || null,

            raw_text: "[Imagen analizada con GPT-4 Vision]",
            confidence: parsed.confidence || 0
        }
    } catch (error: any) {
        console.error("GPT Vision Error:", error)
        throw new Error("Error al analizar imagen con IA: " + error.message)
    }
}

function ensureNumber(val: any): number | null {
    if (typeof val === 'number') return val
    if (typeof val === 'string') return parseFloat(val) || null
    return null
}
