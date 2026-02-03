"use client"

import { useState } from "react"
import { Upload, FileText, Search, AlertCircle, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { parsePdfAction } from "@/app/actions/parse-pdf"

export function PDFImporterDebugger() {
    const [isProcessing, setIsProcessing] = useState(false)
    const [rawText, setRawText] = useState<string>("")
    const [fileName, setFileName] = useState<string>("")

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        setIsProcessing(true)
        setRawText("Extrayendo texto del PDF... espere un momento.")

        const formData = new FormData()
        formData.append("file", file)

        try {
            const result = await parsePdfAction(formData)

            if (result.success && result.text) {
                setRawText(result.text)
            } else {
                setRawText(`ERROR: ${result.error || "No se pudo extraer texto. El PDF podría ser una imagen escaneada."}`)
            }
        } catch (err: any) {
            setRawText(`ERROR CRÍTICO: ${err.message}`)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="space-y-6">
            <Alert className="bg-blue-50 text-blue-900 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle>Modo Diagnóstico</AlertTitle>
                <AlertDescription>
                    Sube **una sola factura** de ejemplo. El sistema mostrará el texto crudo que la máquina "ve" dentro del PDF.
                    Copia este texto y pásamelo para que pueda programar el lector automático.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>1. Subir Factura PDF (QuickBooks)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                            />
                            <Button disabled={isProcessing}>
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <Search className="h-4 w-4 animate-spin" /> Procesando...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Upload className="h-4 w-4" /> Seleccionar PDF
                                    </span>
                                )}
                            </Button>
                        </div>
                        {fileName && <span className="text-sm font-medium">{fileName}</span>}
                    </div>
                </CardContent>
            </Card>

            {rawText && (
                <Card className="border-2 border-slate-300">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-base flex items-center gap-2 font-mono">
                            <Terminal className="h-4 w-4" />
                            Resultado: Texto Crudo Extraído
                        </CardTitle>
                        <CardDescription>
                            Si ves aquí los datos (Fecha, Nº Factura, Productos), ¡significa que podemos automatizarlo!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Textarea
                            className="font-mono text-xs min-h-[400px] border-0 rounded-none p-4 resize-y bg-slate-900 text-green-400 focus-visible:ring-0"
                            value={rawText}
                            readOnly
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
