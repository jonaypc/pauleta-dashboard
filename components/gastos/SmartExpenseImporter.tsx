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

    // LÓGICA DE PARSEO HEURÍSTICO
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

        // 1. FECHA
        // Patrones: dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
        const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g
        const dates = Array.from(text.matchAll(dateRegex))
        if (dates.length > 0) {
            // Intentar encontrar la fecha más probable (cercana a hoy pero no futura)
            // Por simplicidad, tomamos la primera que parezca válida
            const [_, d, m, y] = dates[0]
            const year = y.length === 2 ? `20${y}` : y
            // Asegurar formato YYYY-MM-DD
            result.fecha = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        }

        // 2. TOTAL / IMPORTE
        // Buscar importes con formato moneda y "Total" cerca
        // Regex simplificado para buscar números con decimales
        const moneyRegex = /(\d+[.,]\d{2})/g
        const moneyMatches = Array.from(text.matchAll(moneyRegex))

        // Convertir matches a números
        const amounts = moneyMatches.map(m => parseFloat(m[0].replace(',', '.'))).filter(n => !isNaN(n))

        if (amounts.length > 0) {
            // Heurística simple: El importe mayor suele ser el total
            const maxAmount = Math.max(...amounts)
            result.importe = maxAmount
        }

        // 3. CIF PROVEEDOR
        // Patrón español: Letra + 8 dígitos (ej: B12345678)
        const cifRegex = /\b([A-Z]\-?\d{8})\b/g
        const cifMatch = text.match(cifRegex)
        // Ignorar el CIF propio si apareciera (Pauleta: B70853163)
        const ownCIF = "B70853163"

        if (cifMatch) {
            // Filtrar nuestro propio CIF
            const validCIFs = cifMatch.filter(c => c.replace('-', '') !== ownCIF)
            if (validCIFs.length > 0) {
                result.cif_proveedor = validCIFs[0]
            }
        }

        // 4. NÚMERO FACTURA
        // Buscar palabras clave "Factura", "Nº", etc.
        const invoiceNumRegex = /(?:Factura|Nº|Num)\s*[:\.]?\s*([A-Z0-9\-\/]{3,20})/i
        const numMatch = text.match(invoiceNumRegex)
        if (numMatch) {
            result.numero = numMatch[1]
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
