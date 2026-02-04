"use client"

import { useState, useRef } from "react"
import { FileText, Loader2, Upload, AlertTriangle, CheckCircle, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

// Interfaz para la respuesta de la API con IA
interface ParsedExpenseData {
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

// Función para llamar a la API de parsing con IA (GPT-4 Vision)
async function parseInvoiceWithAI(formData: FormData): Promise<{
    success: boolean
    error?: string
    parsed?: ParsedExpenseData
    method?: string
}> {
    try {
        const response = await fetch('/api/parse-invoice', {
            method: 'POST',
            body: formData
        })
        
        const data = await response.json()
        return data
    } catch (error: any) {
        return {
            success: false,
            error: error.message || "Error al conectar con el servidor"
        }
    }
}

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
    concepto?: string | null
    confidence?: number
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
        // Filtrar solo PDFs e imágenes
        const validFiles = files.filter(f => 
            f.type.includes("pdf") || 
            f.type.includes("image") ||
            f.name.toLowerCase().match(/\.(pdf|jpg|jpeg|png|gif|webp|bmp)$/)
        )
        
        if (validFiles.length === 0) {
            toast({
                title: "Sin archivos válidos",
                description: "Solo se aceptan archivos PDF o imágenes (JPG, PNG).",
                variant: "destructive"
            })
            return
        }

        if (validFiles.length !== files.length) {
            toast({
                title: "Algunos archivos ignorados",
                description: `Se procesarán ${validFiles.length} de ${files.length} archivos.`,
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
                
                const result = await parseInvoiceWithAI(formData)

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
                        iva: result.parsed.iva,
                        concepto: result.parsed.concepto,
                        confidence: result.parsed.confidence
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
        // Validar tipo - aceptar PDF e imágenes
        const isValid = file.type.includes("pdf") || 
            file.type.includes("image") ||
            file.name.toLowerCase().match(/\.(pdf|jpg|jpeg|png|gif|webp|bmp)$/)
            
        if (!isValid) {
            toast({
                title: "Formato no válido",
                description: "Solo se aceptan archivos PDF o imágenes (JPG, PNG).",
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
            
            // Usar IA (GPT-4 Vision) para análisis preciso
            const result = await parseInvoiceWithAI(formData)
            
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
                    iva: result.parsed.iva,
                    concepto: result.parsed.concepto,
                    confidence: result.parsed.confidence
                }

                // Log de lo que se encontró para debug
                console.log("Datos extraídos con IA:", {
                    fecha: extracted.fecha,
                    importe: extracted.importe,
                    numero: extracted.numero,
                    proveedor: extracted.nombre_proveedor,
                    cif: extracted.cif_proveedor,
                    concepto: extracted.concepto,
                    confidence: extracted.confidence
                })

                // Mostrar confianza de la IA
                const confidence = result.parsed.confidence || 0

                toast({
                    title: "Factura analizada con IA",
                    description: `Confianza: ${confidence}%. Proveedor: ${extracted.nombre_proveedor || 'No detectado'}`,
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
                        accept=".pdf,.jpg,.jpeg,.png,image/*"
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
                            Formatos soportados: PDF, JPG, PNG
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
