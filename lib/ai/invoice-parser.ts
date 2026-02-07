
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
    direccion_proveedor: string | null
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
    "direccion_proveedor": "dirección completa del proveedor",
    "fecha": "fecha de emisión en formato YYYY-MM-DD",
    "numero": "número de factura completo",
    "concepto": "descripción breve de los productos/servicios facturados",
    "base_imponible": número decimal (sin símbolo €),
    "iva_porcentaje": número del porcentaje de IVA/IGIC principal aplicado (ej: 7),
    "iva": número decimal del importe total de IVA/IGIC,
    "importe": número decimal del total a pagar,
    "desglose_impuestos": [
        { "base": 100.0, "porcentaje": 7, "cuota": 7.0 },
        { "base": 50.0, "porcentaje": 3, "cuota": 1.5 }
    ],
    "confidence": número de 0 a 100 indicando tu confianza en la extracción
}

NOTA: Muchas facturas de Makro tienen varios porcentajes de IGIC (3%, 7%, 0%, etc.). Por favor, extrae el desglose completo si está disponible.`

    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en análisis de facturas españolas. Extraes información con máxima precisión. Los importes deben ser números decimales sin símbolos de moneda. Si es un ABONO o FACTURA RECTIFICATIVA, devuelve los importes en NEGATIVO. Las fechas en formato YYYY-MM-DD."
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
            direccion_proveedor: parsed.direccion_proveedor || null,
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
Responde SOLO con el JSON, sin explicaciones adicionales.

{
    "nombre_proveedor": "nombre completo de la empresa que emite la factura",
    "cif_proveedor": "CIF/NIF del proveedor (formato español, ej: B12345678)",
    "direccion_proveedor": "dirección completa del proveedor",
    "fecha": "fecha de emisión en formato YYYY-MM-DD",
    "numero": "número de factura completo",
    "concepto": "descripción breve de los productos/servicios facturados",
    "base_imponible": número decimal (sin símbolo €),
    "iva_porcentaje": número del porcentaje de impuesto aplicado (IVA o IGIC) (ej: 7, 21),
    "iva": número decimal del importe del impuesto (IVA/IGIC),
    "importe": número decimal del total a pagar,
    "desglose_impuestos": [
        { "base": 100.0, "porcentaje": 7, "cuota": 7.0 },
        { "base": 50.0, "porcentaje": 3, "cuota": 1.5 }
    ],
    "confidence": número de 0 a 100 indicando tu confianza en la extracción
}

NOTA: Extrae el desglose de impuestos si la factura tiene múltiples tipos. Si es un ABONO, los importes deben ser negativos.`

    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en análisis de facturas españolas, con especial atención al régimen fiscal de Canarias (IGIC). Extraes información con máxima precisión de imágenes de facturas, tickets y recibos. Los importes deben ser números decimales sin símbolos de moneda. Si es un ABONO o FACTURA RECTIFICATIVA, devuelve los importes en NEGATIVO. Las fechas en formato YYYY-MM-DD. Detecta correctamente si es IVA o IGIC."
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
            direccion_proveedor: parsed.direccion_proveedor || null,
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
