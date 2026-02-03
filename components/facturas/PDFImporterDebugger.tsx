"use client"

import { useState, useEffect } from "react"
import { Upload, FileText, Search, AlertCircle, Terminal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

declare global {
    interface Window {
        pdfjsLib: any
    }
}

export function PDFImporterDebugger() {
    const [isProcessing, setIsProcessing] = useState(false)
    const [libLoaded, setLibLoaded] = useState(false)
    const [rawText, setRawText] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

    // Load PDF.js from CDN to avoid npm complexity/crashing the build
    useEffect(() => {
        if (window.pdfjsLib) {
            setLibLoaded(true)
            return
        }

        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
            setLibLoaded(true)
        }
        document.head.appendChild(script)
    }, [])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !window.pdfjsLib) return

        setFileName(file.name)
        setIsProcessing(true)
        setRawText("Iniciando extracción local... (esto no usa servidor)")
        setProgress(null)

        try {
            const arrayBuffer = await file.arrayBuffer()
            const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
            const pdfData = await loadingTask.promise

            let fullText = ""
            const totalPages = pdfData.numPages

            for (let i = 1; i <= totalPages; i++) {
                setProgress({ current: i, total: totalPages })
                const page = await pdfData.getPage(i)
                const content = await page.getTextContent()
                const strings = content.items.map((item: any) => item.str)
                fullText += strings.join(" ") + "\n--- PÁGINA " + i + " ---\n"

                // Keep the UI responsive for large files
                if (i % 5 === 0) {
                    setRawText(`Procesando página ${i}/${totalPages}...`)
                }
            }

            setRawText(fullText || "No se encontró texto en el PDF.")
        } catch (err: any) {
            console.error("PDF Error:", err)
            setRawText(`ERROR: ${err.message || "Fallo en la lectura local del PDF."}`)
        } finally {
            setIsProcessing(false)
            setProgress(null)
        }
    }

    return (
        <div className="space-y-6">
            {!libLoaded && (
                <Alert className="bg-amber-50 text-amber-900 border-amber-200">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    <AlertTitle>Cargando motor de lectura...</AlertTitle>
                    <AlertDescription>Estamos preparando el lector de PDF en tu navegador.</AlertDescription>
                </Alert>
            )}

            <Alert className="bg-blue-50 text-blue-900 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle>Modo Diagnóstico LOCAL</AlertTitle>
                <AlertDescription>
                    Esta herramienta ahora procesa el archivo **en tu propio navegador**. No hay límites de tamaño y no se sube nada al servidor hasta que tú lo decidas.
                    Sube el PDF, espera a que termine y pásame el texto.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>1. Seleccionar archivo PDF</CardTitle>
                    <CardDescription>Ideal para archivos grandes (&quot;Mega PDF&quot;)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={isProcessing || !libLoaded}
                            />
                            <Button disabled={isProcessing || !libLoaded}>
                                {isProcessing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                {isProcessing ? "Extrayendo..." : "Abrir PDF"}
                            </Button>
                        </div>
                        {isProcessing && progress && (
                            <span className="text-sm font-medium animate-pulse text-blue-600">
                                Leyendo página {progress.current} de {progress.total}...
                            </span>
                        )}
                        {!isProcessing && fileName && <span className="text-sm font-medium text-green-600">✓ {fileName}</span>}
                    </div>
                </CardContent>
            </Card>

            {rawText && (
                <Card className="border-2 border-slate-300">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-base flex items-center gap-2 font-mono">
                            <Terminal className="h-4 w-4" />
                            Resultado: Texto Extraído
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Textarea
                            className="font-mono text-xs min-h-[500px] border-0 rounded-none p-4 resize-y bg-slate-900 text-green-400 focus-visible:ring-0"
                            value={rawText}
                            readOnly
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
