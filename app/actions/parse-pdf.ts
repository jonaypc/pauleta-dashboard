"use server"

const pdf = require("pdf-parse");

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

export async function parsePdfAction(formData: FormData): Promise<{
    success: boolean
    error?: string
    text?: string
    numpages?: number
    parsed?: ParsedExpenseData
}> {
    const file = formData.get("file") as File
    if (!file) {
        return { success: false, error: "No file provided" }
    }

    try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const data = await pdf(buffer)

        if (!data || typeof data.text !== 'string') {
            return { success: false, error: "No se pudo extraer texto del PDF." }
        }

        // Parsear los datos extraídos
        const parsed = parseExpenseTextServer(data.text)

        return {
            success: true,
            text: data.text,
            numpages: data.numpages || 0,
            parsed
        }
    } catch (error: any) {
        console.error("PDF Parse Error:", error)
        return { success: false, error: "Error al leer el PDF. Asegúrate de que no esté protegido o dañado." }
    }
}

// Función de parsing mejorada en el servidor
function parseExpenseTextServer(text: string): ParsedExpenseData {
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

    // Normalizar texto
    const cleanText = text.replace(/\s+/g, ' ').trim()
    const upperText = text.toUpperCase()
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)

    // ============================================
    // 1. FECHA - Múltiples patrones
    // ============================================
    const datePatterns = [
        // Formato: Fecha de Factura: 15/01/2024
        /(?:Fecha\s*(?:de\s*)?(?:Factura|Emisión|Emision|documento|expedición|expedicion)?)\s*[:\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        // Formato: F. Factura: 15/01/2024
        /(?:F\.\s*(?:Factura|Emisión))\s*[:\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        // Formato: Fecha: 15/01/2024
        /(?:Fecha)\s*[:\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        // Formato: 15 de Enero de 2024
        /(\d{1,2})\s*de\s*(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s*(?:de|del)?\s*(\d{4})/i,
        // Formato simple: dd/mm/yyyy al inicio de línea
        /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/m,
        // Formato ISO: 2024-01-15
        /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
        // Fecha genérica en cualquier lugar
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

            // Caso: "15 de Enero de 2024"
            if (match[2] && meses[match[2].toUpperCase()]) {
                d = parseInt(match[1])
                m = meses[match[2].toUpperCase()]
                y = parseInt(match[3])
            } else if (match[1]) {
                const dateStr = match[1].replace(/[\.\-]/g, '/')
                const parts = dateStr.split('/')

                if (parts.length === 3) {
                    // Detectar formato
                    if (parts[0].length === 4) {
                        // YYYY-MM-DD
                        y = parseInt(parts[0])
                        m = parseInt(parts[1])
                        d = parseInt(parts[2])
                    } else {
                        // DD/MM/YYYY o DD/MM/YY
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

            // Validar fecha
            if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
                result.fecha = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                break
            }
        }
    }

    // ============================================
    // 2. CIF/NIF PROVEEDOR
    // ============================================
    // Patrones de CIF español: letra + 8 dígitos (o 7 + letra de control)
    const cifPatterns = [
        // CIF estándar: A12345678, B-12345678
        /\b([ABCDEFGHJKLMNPQRSUVW][\-\s]?\d{7}[\dA-J]?)\b/gi,
        // NIF: 12345678A
        /\b(\d{8}[A-Z])\b/gi,
        // NIE: X1234567A
        /\b([XYZ]\d{7}[A-Z])\b/gi
    ]

    const ownCIFs = ["B70853163", "B-70853163"] // CIF propio a excluir
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
        // Preferir el primero que no sea el propio
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
        { patterns: ["DISA PENINSULA", "DISA RED"], name: "Disa" },
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

    // Si no encontramos proveedor conocido, intentar extraer del encabezado
    if (!result.nombre_proveedor) {
        // Buscar después de "Razón Social:", "Nombre:", "Empresa:", etc.
        const providerNamePatterns = [
            /(?:Razón\s*Social|Razon\s*Social|Nombre|Empresa|Emisor)\s*[:\.]?\s*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s,\.]+(?:S\.?L\.?U?\.?|S\.?A\.?|S\.?Coop\.?)?)/i,
            // Primera línea en mayúsculas que parece nombre de empresa
            /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,\.]{5,50}(?:S\.?L\.?U?\.?|S\.?A\.?|S\.?Coop\.?)?)$/m
        ]

        for (const pattern of providerNamePatterns) {
            const match = text.match(pattern)
            if (match && match[1]) {
                const name = match[1].trim()
                // Verificar que no sea una dirección o texto genérico
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
    // Regex para números con formato monetario español/europeo
    const extractMoney = (str: string): number | null => {
        if (!str) return null
        // Limpiar y normalizar
        let clean = str.replace(/[€$\s]/g, '').trim()

        // Formato español: 1.234,56
        if (clean.match(/^\d{1,3}(\.\d{3})*,\d{2}$/)) {
            return parseFloat(clean.replace(/\./g, '').replace(',', '.'))
        }
        // Formato sin miles: 1234,56
        if (clean.match(/^\d+,\d{2}$/)) {
            return parseFloat(clean.replace(',', '.'))
        }
        // Formato americano: 1,234.56
        if (clean.match(/^\d{1,3}(,\d{3})*\.\d{2}$/)) {
            return parseFloat(clean.replace(/,/g, ''))
        }
        // Formato simple: 1234.56
        if (clean.match(/^\d+\.\d{2}$/)) {
            return parseFloat(clean)
        }
        // Intentar conversión directa
        const val = parseFloat(clean.replace(',', '.'))
        return isNaN(val) ? null : val
    }

    // Patrones para TOTAL
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

    // Patrones para BASE IMPONIBLE
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

    // Patrones para IVA
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

    // Si no encontramos total pero sí base e IVA, calcular
    if (!result.importe && result.base_imponible && result.iva) {
        result.importe = Math.round((result.base_imponible + result.iva) * 100) / 100
    }

    // Si solo tenemos total pero no base/IVA, estimar (asumiendo 21%)
    if (result.importe && !result.base_imponible) {
        result.base_imponible = Math.round((result.importe / 1.21) * 100) / 100
        result.iva = Math.round((result.importe - result.base_imponible) * 100) / 100
    }

    // Fallback: buscar el número más grande como total
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
        // Formato: Factura Nº: ABC-123/2024
        /(?:Factura|Fac\.?|Fra\.?)\s*(?:N[ºo°]?|Num\.?|Número)?\s*[:\.]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
        // Formato: Nº Factura: 123456
        /N[ºo°]\s*(?:de\s*)?(?:Factura|Fac\.?|Fra\.?)\s*[:\.]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
        // Formato: Invoice: ABC123
        /Invoice\s*(?:No\.?|Number)?\s*[:\.]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
        // Formato: Documento: FA-2024/001
        /(?:Documento|Doc\.?)\s*[:\.]?\s*([A-Z]{1,3}[\-\/]?\d{2,}[\-\/]?\d*)/i,
        // Formato genérico: F-2024/001, FA24001, etc.
        /\b([A-Z]{1,3}[\-\/]?\d{4,}[\-\/]?\d*)\b/,
        // Solo número largo
        /(?:Factura|Nº)\s*[:\.]?\s*(\d{6,12})/i
    ]

    for (const pattern of invoicePatterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
            const num = match[1].trim()
            // Validar que no sea una fecha o CIF
            if (num.length >= 3 && num.length <= 25) {
                if (!num.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) { // No es fecha
                    if (!num.match(/^[A-Z]\d{8}$/)) { // No es CIF
                        result.numero = num
                        break
                    }
                }
            }
        }
    }

    return result
}
