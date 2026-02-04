"use client"

import { useState, useRef } from "react"
import { FileText, Loader2, Upload, AlertTriangle, CheckCircle, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { parsePdfAction, ParsedExpenseData } from "@/app/actions/parse-pdf"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

// Definir tipos para los datos extraídos
export interface ExtractedExpenseData {
    fecha: string | null
    importe: number | null
    numero: string | null
    cif_proveedor: string | null
    nombre_proveedor: string | null
    archivo_file: File | null
    raw_text?: string
    base_imponible?: number | null
    iva?: number | null
}

interface ProcessedFile {
    file: File
    status: 'pending' | 'processing' | 'success' | 'error'
    data?: ExtractedExpenseData
    error?: string
}

interface SmartExpenseImporterProps {
    onDataExtracted: (data: ExtractedExpenseData) => void
    onMultipleExtracted?: (data: ExtractedExpenseData[]) => void
    isProcessing?: boolean
    allowMultiple?: boolean
}

export function SmartExpenseImporter({ 
    onDataExtracted, 
    onMultipleExtracted,
    isProcessing = false,
    allowMultiple = true 
}: SmartExpenseImporterProps) {
    const [isParsing, setIsParsing] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
    const [showRawText, setShowRawText] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files)
            if (allowMultiple) {
                processMultipleFiles(files)
            } else {
                processFile(files[0])
            }
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)
            if (allowMultiple && files.length > 1) {
                processMultipleFiles(files)
            } else {
                processFile(files[0])
            }
        }
    }

    const processMultipleFiles = async (files: File[]) => {
        // Filtrar solo PDFs
        const validFiles = files.filter(f => f.type.includes("pdf"))
        
        if (validFiles.length === 0) {
            toast({
                title: "Sin archivos válidos",
                description: "Solo se aceptan archivos PDF.",
                variant: "destructive"
            })
            return
        }

        if (validFiles.length !== files.length) {
            toast({
                title: "Algunos archivos ignorados",
                description: `Se procesarán ${validFiles.length} de ${files.length} archivos (solo PDFs).`,
            })
        }

        setIsParsing(true)
        setProgress(0)

        // Inicializar estado
        const initialFiles: ProcessedFile[] = validFiles.map(f => ({
            file: f,
            status: 'pending'
        }))
        setProcessedFiles(initialFiles)

        const results: ExtractedExpenseData[] = []
        let successCount = 0
        let errorCount = 0

        // Procesar cada archivo
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i]
            
            // Actualizar estado a processing
            setProcessedFiles(prev => prev.map((pf, idx) => 
                idx === i ? { ...pf, status: 'processing' } : pf
            ))

            try {
                const formData = new FormData()
                formData.append("file", file)
                
                const result = await parsePdfAction(formData)

                if (result.success && result.parsed) {
                    const extracted: ExtractedExpenseData = {
                        fecha: result.parsed.fecha,
                        importe: result.parsed.importe,
                        numero: result.parsed.numero,
                        cif_proveedor: result.parsed.cif_proveedor,
                        nombre_proveedor: result.parsed.nombre_proveedor,
                        archivo_file: file,
                        raw_text: result.parsed.raw_text,
                        base_imponible: result.parsed.base_imponible,
                        iva: result.parsed.iva
                    }

                    results.push(extracted)
                    successCount++

                    setProcessedFiles(prev => prev.map((pf, idx) => 
                        idx === i ? { ...pf, status: 'success', data: extracted } : pf
                    ))
                } else {
                    errorCount++
                    setProcessedFiles(prev => prev.map((pf, idx) => 
                        idx === i ? { ...pf, status: 'error', error: result.error || 'Error desconocido' } : pf
                    ))
                }
            } catch (error: any) {
                errorCount++
                setProcessedFiles(prev => prev.map((pf, idx) => 
                    idx === i ? { ...pf, status: 'error', error: error.message } : pf
                ))
            }

            // Actualizar progreso
            setProgress(Math.round(((i + 1) / validFiles.length) * 100))
        }

        setIsParsing(false)

        // Notificar resultados
        if (successCount > 0) {
            toast({
                title: `${successCount} factura${successCount > 1 ? 's' : ''} procesada${successCount > 1 ? 's' : ''}`,
                description: errorCount > 0 
                    ? `${errorCount} archivo${errorCount > 1 ? 's' : ''} con errores.`
                    : "Revisa los datos extraídos antes de guardar.",
            })

            // Si solo hay un archivo exitoso, usar callback simple
            if (results.length === 1) {
                onDataExtracted(results[0])
            } else if (onMultipleExtracted) {
                onMultipleExtracted(results)
            }
        } else {
            toast({
                title: "Error al procesar",
                description: "No se pudo extraer información de ningún archivo.",
                variant: "destructive"
            })
        }
    }

    const processFile = async (file: File) => {
        // Validar tipo
        if (!file.type.includes("pdf")) {
            toast({
                title: "Formato no válido",
                description: "Solo se aceptan archivos PDF.",
                variant: "destructive"
            })
            return
        }

        setIsParsing(true)
        setProgress(0)

        try {
            const formData = new FormData()
            formData.append("file", file)
            
            setProgress(30)
            
            // Usar server action para parsing más robusto
            const result = await parsePdfAction(formData)
            
            setProgress(80)

            if (result.success && result.parsed) {
                const extracted: ExtractedExpenseData = {
                    fecha: result.parsed.fecha,
                    importe: result.parsed.importe,
                    numero: result.parsed.numero,
                    cif_proveedor: result.parsed.cif_proveedor,
                    nombre_proveedor: result.parsed.nombre_proveedor,
                    archivo_file: file,
                    raw_text: result.parsed.raw_text,
                    base_imponible: result.parsed.base_imponible,
                    iva: result.parsed.iva
                }

                // Log de lo que se encontró para debug
                console.log("Datos extraídos:", {
                    fecha: extracted.fecha,
                    importe: extracted.importe,
                    numero: extracted.numero,
                    proveedor: extracted.nombre_proveedor,
                    cif: extracted.cif_proveedor
                })

                // Contar campos encontrados
                const foundFields = [
                    extracted.fecha,
                    extracted.importe,
                    extracted.numero,
                    extracted.nombre_proveedor || extracted.cif_proveedor
                ].filter(Boolean).length

                const quality = foundFields >= 3 ? "alta" : foundFields >= 2 ? "media" : "baja"

                toast({
                    title: "Factura analizada",
                    description: `Calidad de extracción: ${quality}. ${foundFields}/4 campos detectados.`,
                })

                setProgress(100)
                onDataExtracted(extracted)
            } else {
                throw new Error(result.error || "No se pudo extraer información")
            }

        } catch (error: any) {
            console.error("Error parsing file:", error)
            toast({
                title: "Error al leer archivo",
                description: error.message || "No se pudo extraer texto. Introduce los datos manualmente.",
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
            setProgress(0)
        }
    }

    const removeFile = (index: number) => {
        setProcessedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const selectFileToEdit = (pf: ProcessedFile) => {
        if (pf.data) {
            onDataExtracted(pf.data)
        }
    }

    return (
        <>
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
                            {isParsing ? "Analizando documento..." : "Arrastra tus facturas aquí"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {allowMultiple 
                                ? "Puedes subir varios PDFs a la vez"
                                : "o haz clic para seleccionar (PDF)"
                            }
                        </p>
                    </div>

                    {isParsing && progress > 0 && (
                        <div className="w-full max-w-xs space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-center text-muted-foreground">{progress}%</p>
                        </div>
                    )}

                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple={allowMultiple}
                        className="hidden"
                        onChange={handleChange}
                    />

                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsing || isProcessing}
                    >
                        {allowMultiple ? "Seleccionar Archivos" : "Seleccionar Archivo"}
                    </Button>

                    {allowMultiple && (
                        <p className="text-xs text-muted-foreground">
                            Formatos soportados: PDF
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Lista de archivos procesados (modo múltiple) */}
            {processedFiles.length > 1 && (
                <Card className="mt-4">
                    <CardContent className="py-4">
                        <h4 className="font-medium mb-3">Archivos procesados ({processedFiles.length})</h4>
                        <div className="space-y-2">
                            {processedFiles.map((pf, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{pf.file.name}</p>
                                            {pf.status === 'success' && pf.data && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {pf.data.nombre_proveedor && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {pf.data.nombre_proveedor}
                                                        </Badge>
                                                    )}
                                                    {pf.data.importe && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {pf.data.importe.toFixed(2)} €
                                                        </Badge>
                                                    )}
                                                    {pf.data.fecha && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {new Date(pf.data.fecha).toLocaleDateString('es-ES')}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                            {pf.status === 'error' && (
                                                <p className="text-xs text-destructive mt-1">{pf.error}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 ml-2">
                                        {pf.status === 'pending' && (
                                            <Badge variant="outline">Pendiente</Badge>
                                        )}
                                        {pf.status === 'processing' && (
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        )}
                                        {pf.status === 'success' && (
                                            <>
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                {pf.data?.raw_text && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setShowRawText(pf.data?.raw_text || null)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => selectFileToEdit(pf)}
                                                >
                                                    Editar
                                                </Button>
                                            </>
                                        )}
                                        {pf.status === 'error' && (
                                            <AlertTriangle className="h-4 w-4 text-destructive" />
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeFile(idx)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dialog para ver texto raw */}
            <Dialog open={!!showRawText} onOpenChange={() => setShowRawText(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Texto extraído del PDF</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh]">
                        <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg font-mono">
                            {showRawText}
                        </pre>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}
