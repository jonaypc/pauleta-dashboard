"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { SmartExpenseImporter, ExtractedExpenseData } from "@/components/gastos/SmartExpenseImporter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { createBulkGastos } from "@/lib/actions/gastos"
import { testDbLog } from "@/app/actions/test-log"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { GastoFormData, GastoForm } from "@/components/gastos/GastoForm"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ImportarGastosPage() {
    const { toast } = useToast()
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    // Lista de borradores
    const [drafts, setDrafts] = useState<ExtractedExpenseData[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [pagosFijos, setPagosFijos] = useState<any[]>([])

    // Cargar borradores desde BD (Emails pendientes)
    useEffect(() => {
        const loadPendingEmails = async () => {
            const { data, error } = await supabase
                .from('gastos')
                .select('*')
                .eq('estado', 'pendiente')
                .ilike('notas', '%Importado%') // Filtrar solo los que vienen de email/auto
                .order('created_at', { ascending: false })

            if (data) {
                const mapped: ExtractedExpenseData[] = data.map(g => ({
                    fecha: g.fecha,
                    importe: g.importe,
                    numero: g.numero,
                    cif_proveedor: null, // No guardamos CIF en DB aun, se podria mejorar
                    nombre_proveedor: (g.notas && g.notas.includes("Importado automáticamente")) ? "Revisar Proveedor" : "Proveedor Desconocido",
                    // Intentar recuperar el nombre del proveedor si tenemos ID, pero es complejo aqui sin join
                    archivo_file: null, // No tenemos File object, pero tenemos URL
                    archivo_url: g.archivo_url,
                    concepto: g.notas, // Usamos notas como concepto visual
                    base_imponible: g.base_imponible,
                    iva: g.impuestos, // Mappeamos la columna de DB 'impuestos' al campo 'iva' del frontend
                    // ID para poder eliminarlo de la BD si se descarta o actualizarlo
                    id: g.id
                }))

                // Mezclar con drafts locales (evitando duplicados por ID si los hubiera)
                setDrafts(prev => {
                    const ids = new Set(prev.map(p => (p as any).id).filter(Boolean))
                    const newItems = mapped.filter(m => !ids.has((m as any).id))
                    return [...prev, ...newItems]
                })
            }
        }
        loadPendingEmails()

        const loadPagosFijos = async () => {
            const { data } = await supabase.from('pagos_fijos').select('id, concepto').eq('activo', true)
            if (data) setPagosFijos(data)
        }
        loadPagosFijos()
    }, [supabase])

    const handleMultipleExtracted = (data: ExtractedExpenseData[]) => {
        setDrafts(prev => [...prev, ...data])
        toast({
            title: "Documentos analizados",
            description: `Se han añadido ${data.length} facturas a la lista de revisión.`,
        })
    }

    const removeDraft = async (index: number) => {
        const draft = drafts[index]
        // Si tiene ID, borrar de BD (es un borrador guardado)
        if ((draft as any).id) {
            const { error } = await supabase.from('gastos').delete().eq('id', (draft as any).id)
            if (error) {
                toast({ title: "Error al borrar borrador", variant: "destructive" })
                return
            }
        }
        setDrafts(prev => prev.filter((_, i) => i !== index))
    }

    const handleSaveAll = async () => {
        if (drafts.length === 0) return
        setIsSaving(true)

        try {
            // 1. Subir archivos y preparar datos
            const gastosToSave = await Promise.all(drafts.map(async (draft) => {
                let archivoUrl = draft.archivo_url // Ya podría venir de BD

                // Si hay archivo físico NUEVO, subirlo
                if (draft.archivo_file) {
                    const file = draft.archivo_file
                    const fileExt = file.name.split('.').pop()
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                    const filePath = `facturas_gastos/${fileName}`

                    const { error: uploadError } = await supabase.storage
                        .from('gastos')
                        .upload(filePath, file)

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('gastos')
                            .getPublicUrl(filePath)
                        archivoUrl = publicUrl
                    }
                }

                return {
                    ...draft,
                    archivo_url: archivoUrl,
                    // Asegurar tipos para la action
                    importe: Number(draft.importe) || 0,
                    base_imponible: Number(draft.base_imponible) || 0,
                    iva: Number(draft.iva) || 0,
                    nombre_proveedor: draft.nombre_proveedor || "Proveedor Desconocido",
                    // ID para actualizar si ya existía
                    id: (draft as any).id
                }
            }))

            // 2. Guardar en BD (o actualizar)
            const updates = gastosToSave.filter(g => g.id)
            const inserts = gastosToSave.filter(g => !g.id)

            if (inserts.length > 0) {
                await createBulkGastos(inserts)
            }

            if (updates.length > 0) {
                for (const up of updates) {
                    // Actualizar uno a uno 
                    await supabase.from('gastos').update({
                        importe: up.importe,
                        fecha: up.fecha,
                        numero: up.numero,
                        // nombre_proveedor: up.nombre_proveedor, // Ops esto no existe en tabla gastos, es relacion.
                        estado: 'aprobado',
                        base_imponible: up.base_imponible,
                        impuestos: up.iva
                    }).eq('id', up.id)
                }
            }

            toast({
                title: "¡Importación completada!",
                description: `Se han procesado ${gastosToSave.length} gastos.`,
            })
            setDrafts([])
            router.push("/gastos")

        } catch (error: any) {
            console.error(error)
            toast({
                title: "Error al guardar",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    // Estado para el diálogo de revisión individual
    const [selectedDraftIndex, setSelectedDraftIndex] = useState<number | null>(null)
    const [isReviewOpen, setIsReviewOpen] = useState(false)

    const handleSelectDraft = (index: number) => {
        setSelectedDraftIndex(index)
        setIsReviewOpen(true)
    }

    const handleSingleSaveSuccess = () => {
        if (selectedDraftIndex !== null) {
            removeDraft(selectedDraftIndex)
            setIsReviewOpen(false)
            setSelectedDraftIndex(null)
            toast({ title: "Gasto guardado correctamente" })
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <div className="bg-red-600 text-white p-4 rounded-lg shadow-xl animate-bounce flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-8 w-8" />
                    <div>
                        <h2 className="text-xl font-bold uppercase">⚠️ TEST DE VERSIÓN ACTIVA (07/02 - 23:15)</h2>
                        <p className="text-sm opacity-90">Si ves este banner rojo, el código se ha actualizado correctamente.</p>
                    </div>
                </div>
                <Button variant="outline" className="bg-white text-red-600 hover:bg-red-50 border-white" onClick={() => window.location.reload()}>
                    FORZAR RECARGA
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/gastos">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Buzón de Gastos</h1>
                    <p className="text-muted-foreground">
                        Sube varias facturas a la vez, revísalas y guárdalas en bloque.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Panel Izquierdo: Importador */}
                <div className="md:col-span-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Subir Facturas</CardTitle>
                            <CardDescription>
                                Arrastra PDFs o fotos aquí.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SmartExpenseImporter
                                onDataExtracted={() => { }} // No usado en multi
                                onMultipleExtracted={handleMultipleExtracted}
                                allowMultiple={true}
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50/50 border-blue-100">
                        <CardContent className="pt-6">
                            <div className="flex gap-3">
                                <div className="p-2 bg-blue-100 rounded-full h-fit">
                                    <CheckCircle className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-blue-900">Consejo Pro</h4>
                                    <p className="text-xs text-blue-700">
                                        Revisa los importes y proveedores antes de guardar.
                                        El sistema aprenderá con el tiempo, pero siempre es bueno echar un ojo.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <span className="text-xl">📧</span> Importación por Email
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p className="text-muted-foreground">
                                Envía tus facturas a:
                            </p>
                            <div className="bg-white p-2 rounded border font-mono text-xs break-all select-all cursor-copy hover:border-blue-400 transition-colors"
                                title="Click para copiar dirección real"
                                onClick={() => {
                                    navigator.clipboard.writeText("4b8939c0c3268388@cloudmailin.net")
                                    toast({ title: "Email copiado", description: "Configura el reenvío a esta dirección." })
                                }}>
                                4b8939c0c3268388@cloudmailin.net
                            </div>

                            <div className="text-xs text-slate-600 bg-slate-100 p-2 rounded border border-slate-200 space-y-2">
                                <p><strong>Cómo configurar tu correo corporativo:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-700">
                                    <li>Accede a tu panel de hosting (donde tengas <em>pauletacanaria.es</em>).</li>
                                    <li>Busca la sección <strong>Reenvíos</strong> o <strong>Redirecciones de Correo</strong>.</li>
                                    <li>Crea un reenvío desde <span className="font-semibold text-slate-900">facturas@pauletacanaria.es</span> hacia la dirección rara de arriba (4b89...).</li>
                                    <li>Ahora, cuando recibas una factura en <em>contacto@</em>, solo tienes que reenviarla a <em>facturas@</em> y aparecerá aquí.</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Panel Derecho: Lista de Revisión */}
                <div className="md:col-span-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-lg">Borradores ({drafts.length})</CardTitle>
                                <CardDescription>Revisa los datos antes de confirmar.</CardDescription>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">Logs de Conexión</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Logs del Webhook</DialogTitle>
                                        <DialogDescription>
                                            Historial de intentos de conexión desde el proveedor de correo.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <WebhookLogsViewer />
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {drafts.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                                    <p>No hay facturas pendientes de revisar.</p>
                                    <p className="text-sm mt-1">Sube archivos para empezar.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {drafts.map((draft, index) => (
                                        <DraftItem
                                            key={index}
                                            draft={draft}
                                            onRemove={() => removeDraft(index)}
                                            onReview={() => handleSelectDraft(index)}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal de Revisión Split View */}
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 h-full overflow-y-auto md:overflow-hidden">
                        {/* Columna Izquierda: Previsualización */}
                        <div className="h-[50vh] md:h-full bg-slate-100 border-b md:border-b-0 md:border-r p-4 flex flex-col relative min-h-0">
                            <div className="absolute top-2 left-2 z-10 flex gap-2">
                                <Badge variant="secondary" className="bg-black/50 text-white hover:bg-black/60 border-none">
                                    Documento Original
                                </Badge>
                                {selectedDraftIndex !== null && drafts[selectedDraftIndex] && (drafts[selectedDraftIndex].archivo_url || drafts[selectedDraftIndex].archivo_file) && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6 bg-white shadow-sm"
                                        asChild
                                        title="Abrir en pestaña nueva"
                                    >
                                        <a
                                            href={drafts[selectedDraftIndex].archivo_url || (drafts[selectedDraftIndex].archivo_file ? URL.createObjectURL(drafts[selectedDraftIndex].archivo_file) : '#')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Eye className="h-3 w-3" />
                                        </a>
                                    </Button>
                                )}
                            </div>

                            <div className="flex-1 min-h-0 w-full mt-8">
                                {selectedDraftIndex !== null && drafts[selectedDraftIndex] && (
                                    <DocumentPreview
                                        file={drafts[selectedDraftIndex].archivo_file}
                                        url={drafts[selectedDraftIndex].archivo_url || undefined}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Columna Derecha: Formulario */}
                        <div className="h-full overflow-y-auto p-6 bg-white flex flex-col min-h-0">
                            <DialogHeader className="mb-6 shrink-0">
                                <DialogTitle>Confirmar Datos del Gasto</DialogTitle>
                                <DialogDescription>
                                    Verifica que la información extraída coincide con el documento.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1">
                                {selectedDraftIndex !== null && drafts[selectedDraftIndex] && (
                                    <GastoForm
                                        initialData={convertToFormData(drafts[selectedDraftIndex])}
                                        onSaveSuccess={handleSingleSaveSuccess}
                                        pagosFijos={pagosFijos}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Componente para visualizar el borrador en la lista principal
function DraftItem({ draft, onRemove, onReview }: { draft: ExtractedExpenseData, onRemove: () => void, onReview: () => void }) {
    const fileUrl = draft.archivo_url || (draft.archivo_file ? URL.createObjectURL(draft.archivo_file) : null)

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-10 w-10 shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                    {draft.nombre_proveedor ? draft.nombre_proveedor.substring(0, 1).toUpperCase() : "?"}
                </div>
                <div className="min-w-0">
                    <p className="font-medium truncate">{draft.nombre_proveedor || "Proveedor Desconocido"}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono">{draft.fecha || "Sin fecha"}</span>
                        <span>•</span>
                        <span className="font-semibold text-foreground">{draft.importe ? `${Number(draft.importe).toFixed(2)} €` : "0.00 €"}</span>
                        {draft.isDuplicate && (
                            <Badge variant="destructive" className="ml-2 text-[10px] h-5">Duplicado</Badge>
                        )}
                        {draft.archivo_file && (
                            <Badge variant="outline" className="ml-1 text-[10px] h-5 bg-muted">
                                {draft.archivo_file.name}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
                {fileUrl && (
                    <Button variant="outline" size="icon" asChild className="h-8 w-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700" title="Ver archivo original">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                            <Eye size={16} />
                        </a>
                    </Button>
                )}
                <Button onClick={onReview} size="sm" className="gap-2">
                    Revisar
                </Button>
                <Button variant="ghost" size="icon" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={16} />
                </Button>
            </div>
        </div>
    )
}

// Convertir datos del borrador al formato del GastoForm
function convertToFormData(draft: ExtractedExpenseData): GastoFormData {
    return {
        id: (draft as any).id, // Si existe
        queueId: Math.random().toString(), // Force reset form
        numero: draft.numero,
        fecha: draft.fecha,
        nombre_proveedor: draft.nombre_proveedor,
        cif_proveedor: draft.cif_proveedor,
        importe: draft.importe,
        // ... otros campos
        base_imponible: draft.base_imponible,
        impuestos: draft.iva, // Mapping simple
        tipo_impuesto: draft.iva_porcentaje || 7.00,
        estado: 'pendiente',
        metodo_pago: 'transferencia',
        notas: draft.concepto || "",
        archivo_file: draft.archivo_file,
        archivo_url: draft.archivo_url,
        isDuplicate: draft.isDuplicate,
        lineas: draft.desglose_impuestos?.map(gw => ({
            descripcion: `IGIC ${gw.porcentaje}%`,
            base_imponible: gw.base,
            tipo_impuesto: gw.porcentaje,
            importe_impuesto: gw.cuota,
            subtotal: gw.base + gw.cuota
        })) || []
    }
}

// Componente para visualizar documento (PDF o Imagen)
function DocumentPreview({ file, url }: { file: File | null, url?: string }) {
    const objectUrl = useMemo(() => {
        if (file) {
            const b = URL.createObjectURL(file)
            console.log("DocumentPreview: Created blob URL", b)
            return b
        }
        if (url) {
            console.log("DocumentPreview: Using provided URL", url)
            return url
        }
        return null
    }, [file, url])

    // Limpiar URL object
    useEffect(() => {
        return () => {
            if (file && objectUrl && objectUrl.startsWith('blob:')) {
                console.log("DocumentPreview: Revoking blob URL", objectUrl)
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [file, objectUrl])

    if (!objectUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded bg-slate-50/50 p-4 text-center">
                <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                <p className="font-semibold">Documento No Encontrado</p>
                <p className="text-xs mt-1 opacity-70">No se ha podido generar una URL para este archivo.</p>
                <div className="mt-4 p-2 bg-slate-200 rounded text-[9px] font-mono break-all w-full">
                    DEBUG: file={file ? 'YES' : 'NO'}, url={url || 'NONE'}
                </div>
            </div>
        )
    }

    const isPdf = file?.type === 'application/pdf' ||
        url?.toLowerCase().endsWith('.pdf') ||
        (url?.includes('facturas_gastos') && !url?.match(/\.(jpg|jpeg|png|webp|gif)$/i))

    return (
        <div className="w-full h-full flex flex-col gap-2">
            {/* Cabecera Debug Visible para el usuario */}
            <div className="bg-slate-800 text-white text-[9px] p-1 px-2 rounded flex justify-between items-center font-mono">
                <span className="truncate max-w-[200px]">{objectUrl.substring(0, 60)}...</span>
                <Badge variant="outline" className="text-[8px] h-4 border-slate-500 text-slate-300">
                    {isPdf ? 'PDF' : 'IMAGE'}
                </Badge>
            </div>

            <div className="flex-1 min-h-0 w-full overflow-hidden border rounded shadow-inner bg-white relative">
                {isPdf ? (
                    <iframe
                        src={`${objectUrl}${objectUrl.includes('#') ? '' : '#view=FitH&toolbar=0'}`}
                        className="w-full h-full border-none"
                        title="Vista previa del PDF"
                        onLoad={() => console.log("Iframe loaded successfully")}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 bg-slate-100">
                        <img
                            src={objectUrl}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                                console.error("Img error");
                                const target = e.target as HTMLImageElement;
                                target.parentElement!.innerHTML = `<p class="text-xs text-red-500 p-4">Error al cargar imagen. Usa el botón de abajo.</p>`;
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-2 pb-2">
                <Button variant="default" size="sm" asChild className="h-8 shadow-md">
                    <a href={objectUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Ver en Pantalla Completa
                    </a>
                </Button>
                {file && (
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="h-8">
                        Recargar página
                    </Button>
                )}
            </div>
        </div>
    )
}

function WebhookLogsViewer() {
    const supabase = useMemo(() => createClient(), [])
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { toast } = useToast()

    const fetchLogs = useCallback(() => {
        setLoading(true)
        setError(null)
        supabase.from('webhook_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching logs:", error)
                    setError(error.message)
                } else {
                    setLogs(data || [])
                }
                setLoading(false)
            })
    }, [supabase])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const handleTestWrite = async () => {
        const res = await testDbLog()
        if (res.success) {
            toast({ title: "Prueba Exitosa", description: "Se ha escrito un log de prueba en la BD." })
            fetchLogs()
        } else {
            toast({ title: "Error en Prueba", description: res.error, variant: "destructive" })
        }
    }

    if (loading) return <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Button size="sm" variant="secondary" onClick={handleTestWrite}>
                    Generar Log de Prueba
                </Button>
                <Button size="sm" variant="ghost" onClick={fetchLogs}>
                    Refrescar
                </Button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-md border border-red-200 text-sm">
                    <strong>Error de Base de Datos:</strong> {error}
                    <p className="text-xs mt-1">Es posible que la tabla &apos;webhook_logs&apos; no exista. Ejecuta las migraciones.</p>
                </div>
            )}

            {!error && logs.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No hay logs registrados.</div>
            )}

            {logs.map((log) => (
                <div key={log.id} className="text-sm border p-3 rounded-md">
                    <div className="flex justify-between font-bold">
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                        <Badge variant={log.status === 'success' ? 'default' : log.status === 'test' ? 'secondary' : 'destructive'}>{log.status}</Badge>
                    </div>
                    {log.error && <p className="text-red-500 mt-1">{log.error}</p>}
                    <details className="mt-2 text-xs text-muted-foreground">
                        <summary className="cursor-pointer">Ver Detalles</summary>
                        <pre className="mt-2 overflow-x-auto p-2 bg-slate-100 rounded">
                            {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                    </details>
                </div>
            ))}
        </div>
    )
}
