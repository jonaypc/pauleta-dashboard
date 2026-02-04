import { NextRequest, NextResponse } from "next/server"

export interface ParsedExpenseData {
    fecha: string | null
    importe: number | null
    numero: string | null
    cif_proveedor: string | null
    nombre_proveedor: string | null
    base_imponible: number | null
    iva: number | null
    raw_text: string
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        let text = ""

        // Determinar el tipo de archivo
        const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")
        const isImage = file.type.includes("image") || 
            file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)

        if (isPdf) {
            // Usar unpdf para extraer texto de PDFs
            try {
                const { extractText } = await import("unpdf")
                const result = await extractText(buffer)
                text = result.text || ""
            } catch (unpdfError: any) {
                console.error("unpdf error:", unpdfError)
                // Fallback: intentar con una extracción básica
                text = extractTextFromBuffer(buffer)
            }
        } else if (isImage) {
            // Para imágenes, no hay OCR integrado por ahora
            // Devolver datos vacíos con un mensaje indicando que es una imagen
            return NextResponse.json({
                success: true,
                text: "[Imagen cargada - Los datos deben introducirse manualmente]",
                numpages: 1,
                isImage: true,
                parsed: {
                    fecha: null,
                    importe: null,
                    numero: null,
                    cif_proveedor: null,
                    nombre_proveedor: null,
                    base_imponible: null,
                    iva: null,
                    raw_text: "[Imagen - sin OCR disponible]"
                }
            })
        } else {
            return NextResponse.json({ 
                success: false, 
                error: "Tipo de archivo no soportado. Solo PDF o imágenes." 
            }, { status: 400 })
        }

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ 
                success: true, 
                text: "[No se pudo extraer texto del PDF]",
                numpages: 1,
                parsed: {
                    fecha: null,
                    importe: null,
                    numero: null,
                    cif_proveedor: null,
                    nombre_proveedor: null,
                    base_imponible: null,
                    iva: null,
                    raw_text: "[PDF sin texto extraíble]"
                }
            })
        }

        // Parsear los datos extraídos
        const parsed = parseExpenseText(text)

        return NextResponse.json({
            success: true,
            text: text,
            numpages: 1,
            parsed
        })

    } catch (error: any) {
        console.error("PDF Parse Error:", error)
        return NextResponse.json({ 
            success: false, 
            error: error.message || "Error al leer el archivo. Asegúrate de que no esté protegido o dañado." 
        }, { status: 500 })
    }
}

// Función básica para extraer texto de un buffer PDF (fallback)
function extractTextFromBuffer(buffer: Buffer): string {
    try {
        // Intentar extraer texto básico del PDF buscando streams de texto
        const content = buffer.toString('binary')
        const textMatches: string[] = []
        
        // Buscar objetos de texto en el PDF
        const regex = /\(([^)]+)\)/g
        let match
        while ((match = regex.exec(content)) !== null) {
            const text = match[1]
            // Filtrar solo texto legible
            if (text && text.length > 2 && /[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/.test(text)) {
                textMatches.push(text)
            }
        }
        
        return textMatches.join(' ')
    } catch {
        return ""
    }
}

// Función de parsing mejorada
function parseExpenseText(text: string): ParsedExpenseData {
    const result: ParsedExpenseData = {
        fecha: null,
        importe: null,
        numero: null,
        cif_proveedor: null,
        nombre_proveedor: null,
        base_imponible: null,
        iva: null,
        raw_text: text
    }

    const upperText = text.toUpperCase()

    // ============================================
    // 1. FECHA - Múltiples patrones
    // ============================================
    const datePatterns = [
        /(?:Fecha\s*(?:de\s*)?(?:Factura|Emisión|Emision|documento|expedición|expedicion)?)\s*[:\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /(?:F\.\s*(?:Factura|Emisión))\s*[:\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /(?:Fecha)\s*[:\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /(\d{1,2})\s*de\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s*(?:de|del)?\s*(\d{4})/i,
        /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/m,
        /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/
    ]

    const meses: { [key: string]: number } = {
        'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
        'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
    }

    for (const pattern of datePatterns) {
        const match = text.match(pattern)
        if (match) {
            let d: number, m: number, y: number

            if (match[2] && meses[match[2].toUpperCase()]) {
                d = parseInt(match[1])
                m = meses[match[2].toUpperCase()]
                y = parseInt(match[3])
            } else if (match[1]) {
                const dateStr = match[1].replace(/[\.\-]/g, '/')
                const parts = dateStr.split('/')

                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        y = parseInt(parts[0])
                        m = parseInt(parts[1])
                        d = parseInt(parts[2])
                    } else {
                        d = parseInt(parts[0])
                        m = parseInt(parts[1])
                        y = parseInt(parts[2])
                        if (y < 100) y += 2000
                    }
                } else {
                    continue
                }
            } else {
                continue
            }

            if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
                result.fecha = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                break
            }
        }
    }

    // ============================================
    // 2. CIF/NIF PROVEEDOR
    // ============================================
    const cifPatterns = [
        /\b([ABCDEFGHJKLMNPQRSUVW][\-\s]?\d{7}[\dA-J]?)\b/gi,
        /\b(\d{8}[A-Z])\b/gi,
        /\b([XYZ]\d{7}[A-Z])\b/gi
    ]

    const ownCIFs = ["B70853163", "B-70853163"]
    const foundCIFs: string[] = []

    for (const pattern of cifPatterns) {
        let match: RegExpExecArray | null
        const regex = new RegExp(pattern.source, pattern.flags)
        while ((match = regex.exec(text)) !== null) {
            const cif = match[1].replace(/[\-\s]/g, '').toUpperCase()
            if (!ownCIFs.some(own => cif === own.replace(/[\-\s]/g, ''))) {
                foundCIFs.push(cif)
            }
        }
    }

    if (foundCIFs.length > 0) {
        result.cif_proveedor = foundCIFs[0]
    }

    // ============================================
    // 3. NOMBRE PROVEEDOR
    // ============================================
    const knownSuppliers = [
        { patterns: ["MAKRO", "AUTOSERVICIO MAYORISTA"], name: "Makro Autoservicio Mayorista" },
        { patterns: ["MERCADONA"], name: "Mercadona S.A." },
        { patterns: ["ENDESA", "ENERGIA XXI"], name: "Endesa Energía" },
        { patterns: ["VODAFONE"], name: "Vodafone España" },
        { patterns: ["MOVISTAR", "TELEFONICA", "TELEFÓNICA"], name: "Telefónica de España" },
        { patterns: ["AMAZON"], name: "Amazon EU Sarl" },
        { patterns: ["CENCOSU", "SPAR GRAN CANARIA"], name: "Cencosu (SPAR)" },
        { patterns: ["DISA PENINSULA", "DISA RED", "DISA"], name: "Disa" },
        { patterns: ["ALDI"], name: "Aldi Supermercados" },
        { patterns: ["LIDL"], name: "Lidl Supermercados" },
        { patterns: ["CANARAGUA"], name: "Canaragua" },
        { patterns: ["CARREFOUR"], name: "Carrefour" },
        { patterns: ["ALCAMPO", "AUCHAN"], name: "Alcampo" },
        { patterns: ["EL CORTE INGLES", "CORTE INGLÉS"], name: "El Corte Inglés" },
        { patterns: ["IBERDROLA"], name: "Iberdrola" },
        { patterns: ["NATURGY", "GAS NATURAL"], name: "Naturgy" },
        { patterns: ["ORANGE"], name: "Orange España" },
        { patterns: ["CASH & CARRY", "CASH AND CARRY"], name: "Cash & Carry" },
        { patterns: ["COSTCO"], name: "Costco Wholesale" },
        { patterns: ["CONSUM"], name: "Consum Cooperativa" },
        { patterns: ["HIPERDINO", "DINOSOL"], name: "HiperDino" },
        { patterns: ["COVIRAN", "COVIRÁN"], name: "Covirán" },
        { patterns: ["AHORRAMÁS", "AHORRAMAS"], name: "Ahorramás" },
        { patterns: ["BRICOMART", "BRICODEPOT"], name: "Bricomart" },
        { patterns: ["LEROY MERLIN"], name: "Leroy Merlin" },
        { patterns: ["MEDIAMARKT", "MEDIA MARKT"], name: "MediaMarkt" },
        { patterns: ["DECATHLON"], name: "Decathlon" },
        { patterns: ["IKEA"], name: "IKEA" },
        { patterns: ["ZARA", "INDITEX"], name: "Inditex" },
        { patterns: ["CORREOS"], name: "Correos" },
        { patterns: ["REPSOL"], name: "Repsol" },
        { patterns: ["CEPSA"], name: "Cepsa" },
        { patterns: ["BP ESTACION", "BP STATION"], name: "BP" },
        { patterns: ["SHELL"], name: "Shell" },
    ]

    for (const supplier of knownSuppliers) {
        for (const pattern of supplier.patterns) {
            if (upperText.includes(pattern)) {
                result.nombre_proveedor = supplier.name
                break
            }
        }
        if (result.nombre_proveedor) break
    }

    if (!result.nombre_proveedor) {
        const providerNamePatterns = [
            /(?:Razón\s*Social|Razon\s*Social|Nombre|Empresa|Emisor)\s*[:\.]?\s*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s,\.]+(?:S\.?L\.?U?\.?|S\.?A\.?|S\.?Coop\.?)?)/i,
            /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,\.]{5,50}(?:S\.?L\.?U?\.?|S\.?A\.?|S\.?Coop\.?)?)$/m
        ]

        for (const pattern of providerNamePatterns) {
            const match = text.match(pattern)
            if (match && match[1]) {
                const name = match[1].trim()
                if (name.length > 3 && !name.match(/^(FACTURA|FECHA|TOTAL|IMPORTE|CLIENTE|DIRECCION)/i)) {
                    result.nombre_proveedor = name
                    break
                }
            }
        }
    }

    // ============================================
    // 4. IMPORTES (Total, Base, IVA)
    // ============================================
    const extractMoney = (str: string): number | null => {
        if (!str) return null
        let clean = str.replace(/[€$\s]/g, '').trim()

        if (clean.match(/^\d{1,3}(\.\d{3})*,\d{2}$/)) {
            return parseFloat(clean.replace(/\./g, '').replace(',', '.'))
        }
        if (clean.match(/^\d+,\d{2}$/)) {
            return parseFloat(clean.replace(',', '.'))
        }
        if (clean.match(/^\d{1,3}(,\d{3})*\.\d{2}$/)) {
            return parseFloat(clean.replace(/,/g, ''))
        }
        if (clean.match(/^\d+\.\d{2}$/)) {
            return parseFloat(clean)
        }
        const val = parseFloat(clean.replace(',', '.'))
        return isNaN(val) ? null : val
    }

    const totalPatterns = [
        /TOTAL\s*(?:FACTURA|A\s*PAGAR|IMPORTE|GENERAL|EUR|€)?\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /IMPORTE\s*TOTAL\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /TOTAL\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /A\s*PAGAR\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /SUMA\s*TOTAL\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /IMPORTE\s*[:\.]?\s*([\d\.,]+)\s*€?\s*$/im
    ]

    for (const pattern of totalPatterns) {
        const match = text.match(pattern)
        if (match) {
            const val = extractMoney(match[1])
            if (val !== null && val > 0) {
                result.importe = val
                break
            }
        }
    }

    const basePatterns = [
        /BASE\s*IMPONIBLE\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /BASE\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /SUBTOTAL\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /NETO\s*[:\.]?\s*([\d\.,]+)\s*€?/i
    ]

    for (const pattern of basePatterns) {
        const match = text.match(pattern)
        if (match) {
            const val = extractMoney(match[1])
            if (val !== null && val > 0) {
                result.base_imponible = val
                break
            }
        }
    }

    const ivaPatterns = [
        /IVA\s*(?:\d+\s*%?)?\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /(?:CUOTA\s*)?I\.?V\.?A\.?\s*[:\.]?\s*([\d\.,]+)\s*€?/i,
        /IMPUESTO\s*[:\.]?\s*([\d\.,]+)\s*€?/i
    ]

    for (const pattern of ivaPatterns) {
        const match = text.match(pattern)
        if (match) {
            const val = extractMoney(match[1])
            if (val !== null && val > 0 && val < (result.importe || 10000)) {
                result.iva = val
                break
            }
        }
    }

    if (!result.importe && result.base_imponible && result.iva) {
        result.importe = Math.round((result.base_imponible + result.iva) * 100) / 100
    }

    if (result.importe && !result.base_imponible) {
        result.base_imponible = Math.round((result.importe / 1.21) * 100) / 100
        result.iva = Math.round((result.importe - result.base_imponible) * 100) / 100
    }

    if (!result.importe) {
        const allNumbers = text.match(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g) || []
        const amounts = allNumbers
            .map(n => extractMoney(n))
            .filter((n): n is number => n !== null && n > 1)
            .sort((a, b) => b - a)

        if (amounts.length > 0) {
            result.importe = amounts[0]
        }
    }

    // ============================================
    // 5. NÚMERO DE FACTURA
    // ============================================
    const invoicePatterns = [
        /(?:Factura|Fac\.?|Fra\.?)\s*(?:N[ºo°]?|Num\.?|Número)?\s*[:\.]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
        /N[ºo°]\s*(?:de\s*)?(?:Factura|Fac\.?|Fra\.?)\s*[:\.]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
        /Invoice\s*(?:No\.?|Number)?\s*[:\.]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
        /(?:Documento|Doc\.?)\s*[:\.]?\s*([A-Z]{1,3}[\-\/]?\d{2,}[\-\/]?\d*)/i,
        /\b([A-Z]{1,3}[\-\/]?\d{4,}[\-\/]?\d*)\b/,
        /(?:Factura|Nº)\s*[:\.]?\s*(\d{6,12})/i
    ]

    for (const pattern of invoicePatterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
            const num = match[1].trim()
            if (num.length >= 3 && num.length <= 25) {
                if (!num.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) {
                    if (!num.match(/^[A-Z]\d{8}$/)) {
                        result.numero = num
                        break
                    }
                }
            }
        }
    }

    return result
}
