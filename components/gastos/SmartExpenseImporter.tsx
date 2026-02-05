"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Loader2, AlertTriangle, FileText, X, CheckCircle, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { checkDuplicateExpenseByNames } from "@/lib/actions/gastos"
import * as pdfjs from 'pdfjs-dist'

// Configurar worker de PDF.js
if (typeof window !== 'undefined') {
    // Usar la versión específica de unpkg que coincide con la instalada o una fija estable
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

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
    isDuplicate?: boolean
    pago_fijo_id?: string | null
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
    allowMultiple?: boolean
}

export function SmartExpenseImporter({ onDataExtracted, onMultipleExtracted, allowMultiple = false }: SmartExpenseImporterProps) {
    const { toast } = useToast()
    const [isParsing, setIsParsing] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false) // Global processing state
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [progress, setProgress] = useState(0)

    // Estado para múltiples archivos
    const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
    const [showRawText, setShowRawText] = useState<string | null>(null)

    // Helper: Resize Image
    const resizeImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height
                const maxDim = 2048

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width)
                        width = maxDim
                    } else {
                        width = Math.round((width * maxDim) / height)
                        height = maxDim
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, width, height)

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob)
                    else reject(new Error("Canvas to Blob failed"))
                }, 'image/jpeg', 0.8) // Compress to JPEG 80%
            }
            img.onerror = reject
            img.src = URL.createObjectURL(file)
        })
    }

    // Helper: Convertir PDF a Imagen (Primera página)
    const convertPdfToImage = async (file: File): Promise<Blob> => {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1.5 }) // Escala razonable para OCR

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width

        if (!context) throw new Error("Canvas context failed")

        await page.render({ canvasContext: context, viewport } as any).promise

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob)
                else reject(new Error("PDF Render failed"))
            }, 'image/jpeg', 0.85)
        })
    }

    const processFile = useCallback(async (file: File, index: number) => {
        // Actualizar estado del archivo a processing
        setProcessedFiles(prev => prev.map((pf, i) => i === index ? { ...pf, status: 'processing' } : pf))

        const formData = new FormData()

        try {
            let fileToSend = file
            // Si es imagen, redimensionar
            if (file.type.startsWith('image/')) {
                const resizedBlob = await resizeImage(file)
                fileToSend = new File([resizedBlob], file.name, { type: 'image/jpeg' })
            }
            // Si es PDF, intentar convertir a imagen primero (client-side render)
            // Esto evita problemas con pdf-parse en server y timeouts
            else if (file.type === 'application/pdf') {
                try {
                    const pageImageBlob = await convertPdfToImage(file)
                    fileToSend = new File([pageImageBlob], file.name.replace('.pdf', '.jpg'), { type: 'image/jpeg' })
                } catch (pdfErr) {
                    console.warn("Client-side PDF render failed, sending original PDF", pdfErr)
                    // Fallback to sending original PDF
                }
            }

            formData.append("file", fileToSend)

            const response = await fetch("/api/parse-invoice", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || "Error desconocido al procesar")
            }

            // Check duplicate
            let isDuplicate = false
            if (result.parsed.numero && result.parsed.nombre_proveedor) {
                const existing = await checkDuplicateExpenseByNames(result.parsed.numero, result.parsed.nombre_proveedor)
                if (existing) isDuplicate = true
            }

            const extracted: ExtractedExpenseData = {
                fecha: result.parsed.fecha,
                importe: result.parsed.importe,
                numero: result.parsed.numero,
                cif_proveedor: result.parsed.cif_proveedor,
                nombre_proveedor: result.parsed.nombre_proveedor,
                archivo_file: file, // Guardamos el original
                raw_text: result.parsed.raw_text,
                base_imponible: result.parsed.base_imponible,
                iva: result.parsed.iva,
                concepto: result.parsed.concepto,
                confidence: result.parsed.confidence,
                isDuplicate
            }

            setProcessedFiles(prev => prev.map((pf, i) =>
                i === index ? { ...pf, status: 'success', data: extracted } : pf
            ))

            // Si estamos en modo simple, notificar inmediatamente
            if (!allowMultiple) {
                onDataExtracted(extracted)
            }

        } catch (error: any) {
            console.error(error)
            setProcessedFiles(prev => prev.map((pf, i) =>
                i === index ? { ...pf, status: 'error', error: error.message } : pf
            ))
            toast({
                title: "Error al analizar",
                description: error.message,
                variant: "destructive",
            })
        }
    }, [allowMultiple, onDataExtracted, toast])

    // Efecto para procesar cola
    useEffect(() => {
        const pendingIndex = processedFiles.findIndex(f => f.status === 'pending')
        if (pendingIndex !== -1 && !isProcessing) { // Uno a uno para no saturar
            setIsProcessing(true)
            processFile(processedFiles[pendingIndex].file, pendingIndex).then(() => {
                setIsProcessing(false)
                setProgress(((processedFiles.length - processedFiles.filter(f => f.status === 'pending').length) / processedFiles.length) * 100)
            })
        } else if (pendingIndex === -1 && processedFiles.length > 0 && !isProcessing) {
            // Todos terminados
            if (allowMultiple && onMultipleExtracted) {
                const successful = processedFiles
                    .filter(f => f.status === 'success' && f.data)
                    .map(f => f.data!)
                if (successful.length > 0) {
                    // Solo si no se ha notificado ya...
                    // Mejor dejar que el padre 'NuevoGastoPage' observe el estado o usar un boton 'Continuar'?
                    // En este diseño, el padre observa 'onMultipleExtracted'
                    onMultipleExtracted(successful)
                }
            }
        }
    }, [processedFiles, isProcessing, allowMultiple, onMultipleExtracted, processFile])


    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return

        const newFiles: ProcessedFile[] = Array.from(files).map(file => ({
            file,
            status: 'pending'
        }))

        // Si es allowMultiple, añadimos. Si no, reemplazamos.
        if (allowMultiple) {
            setProcessedFiles(prev => [...prev, ...newFiles])
        } else {
            setProcessedFiles(newFiles)
        }

        setIsParsing(true) // Activar UI de carga
        setProgress(0)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        handleFileSelect(e.target.files)
    }

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
            handleFileSelect(e.dataTransfer.files)
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
                        {isProcessing ? (
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : (
                            <Upload className="h-8 w-8 text-muted-foreground" />
                        )}
                    </div>

                    <div className="text-center space-y-1">
                        <h3 className="font-semibold text-lg">
                            {isProcessing ? "Analizando documentos..." : "Arrastra tus facturas aquí"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {allowMultiple
                                ? "Puedes subir varios archivos a la vez"
                                : "o haz clic para seleccionar (PDF/JPG)"
                            }
                        </p>
                    </div>

                    {isProcessing && (
                        <div className="w-full max-w-xs space-y-1">
                            <Progress value={progress} className="h-2" />
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
                        disabled={isProcessing}
                    >
                        {allowMultiple ? "Seleccionar Archivos" : "Seleccionar Archivo"}
                    </Button>
                </CardContent>
            </Card>

            {/* Lista de archivos procesados (modo múltiple) */}
            {processedFiles.length > 0 && allowMultiple && (
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
                                                    {pf.data.isDuplicate && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            DUPLICADO
                                                        </Badge>
                                                    )}
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
                                                </div>
                                            )}
                                            {pf.status === 'error' && (
                                                <p className="text-xs text-destructive mt-1">{pf.error}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-2">
                                        {pf.status === 'pending' && <Badge variant="outline">Pendiente</Badge>}
                                        {pf.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                        {pf.status === 'success' && (
                                            <>
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => pf.data?.raw_text && setShowRawText(pf.data.raw_text)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => selectFileToEdit(pf)}>
                                                    Editar
                                                </Button>
                                            </>
                                        )}
                                        {pf.status === 'error' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeFile(idx)}>
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
                        <DialogTitle>Texto extraído</DialogTitle>
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
