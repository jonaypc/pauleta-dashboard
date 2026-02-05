// ... imports
import { checkDuplicateExpenseByNames } from "@/lib/actions/gastos"

// ... inside ExtractedExpenseData interface
export interface ExtractedExpenseData {
    // ... existing fields
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
    isDuplicate?: boolean // Nuevo campo
}

// ... inside SmartExpenseImporter function ...

// Inside processMultipleFiles loop, after successful API call:
// ...
if (result.success && result.parsed) {
    // Check for duplicates
    let isDuplicate = false
    if (result.parsed.numero && result.parsed.nombre_proveedor) {
        const existing = await checkDuplicateExpenseByNames(result.parsed.numero, result.parsed.nombre_proveedor)
        if (existing) {
            isDuplicate = true
        }
    }

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
        confidence: result.parsed.confidence,
        isDuplicate: isDuplicate
    }

    // ... rest of the code pushing to results ...
}

// Inside processFile function, after successful API call:
// ...
if (result.success && result.parsed) {
    // Check for duplicates
    let isDuplicate = false
    if (result.parsed.numero && result.parsed.nombre_proveedor) {
        const existing = await checkDuplicateExpenseByNames(result.parsed.numero, result.parsed.nombre_proveedor)
        if (existing) {
            isDuplicate = true
            toast({
                title: "Posible duplicado detectado",
                description: `Ya existe una factura de ${result.parsed.nombre_proveedor} con número ${result.parsed.numero}`,
                variant: "destructive"
            })
        }
    }

    const extracted: ExtractedExpenseData = {
        // ... existing fields mapping
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
        confidence: result.parsed.confidence,
        isDuplicate: isDuplicate
    }
    // ... rest ...
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
