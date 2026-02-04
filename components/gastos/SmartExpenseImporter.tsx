"use client"

import { useState, useRef, useEffect } from "react"
import { FileText, Loader2, Upload, AlertTriangle, CheckCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import * as pdfjsLib from "pdfjs-dist"

// Definir tipos para los datos extraídos
export interface ExtractedExpenseData {
    fecha: string | null
    importe: number | null
    numero: string | null
    cif_proveedor: string | null
    nombre_proveedor: string | null
    archivo_file: File | null
    raw_text?: string
}

interface SmartExpenseImporterProps {
    onDataExtracted: (data: ExtractedExpenseData) => void
    isProcessing?: boolean
}

export function SmartExpenseImporter({ onDataExtracted, isProcessing = false }: SmartExpenseImporterProps) {
    const [isParsing, setIsParsing] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
        }
    }, [])

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0])
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0])
        }
    }

    const processFile = async (file: File) => {
        // Validar tipo
        if (!file.type.includes("pdf") && !file.type.includes("image")) {
            toast({
                title: "Formato no válido",
                description: "Solo se aceptan archivos PDF o Imágenes.",
                variant: "destructive"
            })
            return
        }

        setIsParsing(true)

        try {
            let text = ""

            if (file.type.includes("pdf")) {
                const arrayBuffer = await file.arrayBuffer()
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
                const pdf = await loadingTask.promise

                // Leer primeras 2 páginas (suficiente para facturas)
                const numPages = Math.min(pdf.numPages, 2)
                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i)
                    const content = await page.getTextContent()
                    const strings = content.items.map((item: any) => item.str)
                    text += strings.join(" ") + "\n"
                }
            } else {
                // TODO: Implementar OCR para imágenes si es necesario
                console.log("OCR para imágenes no implementado aún")
            }

            console.log("Texto extraído:", text.substring(0, 500) + "...")

            // ANALIZAR TEXTO (HEURÍSTICA)
            const extracted = parseExpenseText(text)
            extracted.archivo_file = file

            toast({
                title: "Factura analizada",
                description: "Datos extraídos automáticamente. Por favor valida.",
            })

            onDataExtracted(extracted)

        } catch (error) {
            console.error("Error parsing file:", error)
            toast({
                title: "Error al leer archivo",
                description: "No se pudo extraer texto. Introduce los datos manualmente.",
                variant: "destructive"
            })
            // Devolver objeto vacío pero con archivo
            onDataExtracted({
                fecha: null,
                importe: null,
                numero: null,
                cif_proveedor: null,
                nombre_proveedor: null,
                archivo_file: file
            })
        } finally {
            setIsParsing(false)
        }
    }

    // LÓGICA DE PARSEO HEURÍSTICO MEJORADA
    const parseExpenseText = (text: string): ExtractedExpenseData => {
        const result: ExtractedExpenseData = {
            fecha: null,
            importe: null,
            numero: null,
            cif_proveedor: null,
            nombre_proveedor: null,
            archivo_file: null,
            raw_text: text
        }

        // Normalizar texto para facilitar búsquedas
        const cleanText = text.replace(/\s+/g, ' ')

        // 1. FECHA (Prioridad: Buscar cerca de palabras clave)
        // Buscamos patrones: dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, dd de Mes de yyyy
        const datePatterns = [
            /(?:Fecha|Emisión|Date)\s*[:\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i, // Fecha explícita
            /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/ // Fecha genérica
        ]

        for (const pattern of datePatterns) {
            const match = text.match(pattern)
            if (match && match[1]) {
                const dateStr = match[1].replace(/[.-]/g, '/')
                const parts = dateStr.split('/')
                if (parts.length === 3) {
                    // Asumimos DD/MM/YYYY si el primero es <=31 y segundo <=12
                    let d = parseInt(parts[0])
                    let m = parseInt(parts[1])
                    let y = parseInt(parts[2])

                    // Caso YYYY-MM-DD
                    if (parts[0].length === 4) {
                        y = parseInt(parts[0])
                        m = parseInt(parts[1])
                        d = parseInt(parts[2])
                    }

                    if (y < 100) y += 2000 // Convertir 24 a 2024

                    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                        result.fecha = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                        break // Encontrada, paramos
                    }
                }
            }
        }

        // 2. TOTAL / IMPORTE
        // Estrategia: Buscar "Total" seguido de número, o el número más grande al final del documento
        // Regex para capturar formatos: 1.234,56 | 1,234.56 | 1234.56
        // Captura grupos: 1=entero con separadores, 2=decimal
        const moneyGlobalRegex = /(\d{1,3}(?:[.,]\d{3})*)[.,](\d{2})\b/g
        const moneyMatches = Array.from(text.matchAll(moneyGlobalRegex))

        const candidateAmounts: number[] = []

        moneyMatches.forEach(match => {
            // Unificar separadores: eliminar puntos de miles, cambiar coma decimal por punto
            // Caso España (1.234,56) -> replace('.', '') -> replace(',', '.')
            // Caso US (1,234.56) -> replace(',', '') -> no hace falta cambiar punto

            let rawNum = match[0]
            let val = 0

            if (rawNum.includes(',') && rawNum.includes('.')) {
                // Mixto: asumimos el último es decimal
                if (rawNum.lastIndexOf(',') > rawNum.lastIndexOf('.')) {
                    // 1.234,56
                    val = parseFloat(rawNum.replace(/\./g, '').replace(',', '.'))
                } else {
                    // 1,234.56
                    val = parseFloat(rawNum.replace(/,/g, ''))
                }
            } else if (rawNum.includes(',')) {
                // Solo comas: asumimos decimal si son 2 digitos al final (regex forced 2)
                // 1234,56
                val = parseFloat(rawNum.replace(',', '.'))
            } else {
                // Solo puntos, asumimos decimal
                val = parseFloat(rawNum)
            }

            if (!isNaN(val)) candidateAmounts.push(val)
        })

        // Prioridad 1: Buscar etiqueta "Total" explícita
        const totalLabelRegex = /Total\s*(?:Factura|Importe|Pagar)?\s*[:\.]?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i
        const totalMatch = text.match(totalLabelRegex)

        if (totalMatch) {
            // Procesar este valor específico igual que arriba
            const rawOne = totalMatch[1]
            let val = parseFloat(rawOne.replace(/\./g, '').replace(',', '.')) // Asunción ES default
            if (rawOne.includes(',') && rawOne.lastIndexOf(',') < rawOne.length - 3) {
                // Si la coma está lejos del final, quizás era miles (caso US)
                val = parseFloat(rawOne.replace(/,/g, ''))
            }
            if (!isNaN(val)) {
                result.importe = val
            }
        }

        // Si no encontramos etiqueta explícita o falló, usamos el mayor valor encontrado (heurística común)
        if (!result.importe && candidateAmounts.length > 0) {
            result.importe = Math.max(...candidateAmounts)
        }


        // 3. CIF PROVEEDOR
        const cifRegex = /\b([A-Z]\-?\d{8})\b/g
        const cifMatches = text.match(cifRegex) || []
        const ownCIF = "B70853163"
        // Filtrar el propio
        const validCIFs = cifMatches.filter(c => c.replace(/[\-\s]/g, '') !== ownCIF)

        if (validCIFs.length > 0) {
            result.cif_proveedor = validCIFs[0].replace(/[\-\s]/g, '') // Normalizar
        }

        // 4. DETECTAR NOMBRE PROVEEDOR (Nueva mejora)
        // Lista de proveedores conocidos (hardcoded por ahora para mejorar UX inmediata)
        const commonSuppliers = [
            { key: "MAKRO", name: "Makro Autoservicio Mayorista" },
            { key: "MERCADONA", name: "Mercadona S.A." },
            { key: "ENDESA", name: "Endesa Energía" },
            { key: "VODAFONE", name: "Vodafone España" },
            { key: "MOVISTAR", name: "Telefónica de España" },
            { key: "AMAZON", name: "Amazon EU Sarl" },
            { key: "CENCOSU", name: "Cencosu (SPAR)" },
            { key: "DISA", name: "Disa" },
            { key: "ALDI", name: "Aldi Supermercados" },
            { key: "LIDL", name: "Lidl Supermercados" },
            { key: "CANARAGUA", name: "Canaragua" }
        ]

        const upperText = text.toUpperCase()
        for (const supplier of commonSuppliers) {
            if (upperText.includes(supplier.key)) {
                result.nombre_proveedor = supplier.name
                break
            }
        }

        // 5. NÚMERO FACTURA
        // Patrones: Factura: X, Nº: X, Factura A123
        const invPatterns = [
            /(?:Factura|Nº|Num|Invoice)\s*(?:rectificativa)?\s*[:\.]?\s*([A-Z0-9\-\/]{3,20})/i,
            /([A-Z]{1,2}[\-\/]\d{3,6}\/\d{2,4})/ // Patrón tipo A-123/2024
        ]

        for (const p of invPatterns) {
            const m = text.match(p)
            if (m && m[1]) {
                // Evitar capturar fechas o cifs por error
                if (!m[1].includes('/') || m[1].length > 8) { // Filtros básicos
                    result.numero = m[1]
                    break
                }
            }
        }

        return result
    }

    return (
        <Card className={`border-2 border-dashed transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}>
            <CardContent className="flex flex-col items-center justify-center py-10 space-y-4"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="rounded-full bg-muted p-4">
                    {isParsing || isProcessing ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                </div>

                <div className="text-center space-y-1">
                    <h3 className="font-semibold text-lg">
                        {isParsing ? "Analizando documento..." : "Arrastra tu factura aquí"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        o haz clic para seleccionar (PDF)
                    </p>
                </div>

                <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={handleChange}
                />

                <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing || isProcessing}
                >
                    Seleccionar Archivo
                </Button>
            </CardContent>
        </Card>
    )
}
