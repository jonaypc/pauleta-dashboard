"use client"

import { useState } from "react"
import { SmartExpenseImporter, ExtractedExpenseData } from "@/components/gastos/SmartExpenseImporter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createBulkGastos } from "@/lib/actions/gastos"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Save, ArrowLeft, CheckCircle, AlertCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function ImportarGastosPage() {
    const { toast } = useToast()
    const router = useRouter()
    const supabase = createClient()

    // Lista de borradores
    const [drafts, setDrafts] = useState<ExtractedExpenseData[]>([])
    const [isSaving, setIsSaving] = useState(false)

    const handleMultipleExtracted = (data: ExtractedExpenseData[]) => {
        setDrafts(prev => [...prev, ...data])
        toast({
            title: "Documentos analizados",
            description: `Se han añadido ${data.length} facturas a la lista de revisión.`,
        })
    }

    const removeDraft = (index: number) => {
        setDrafts(prev => prev.filter((_, i) => i !== index))
    }

    const updateDraft = (index: number, field: keyof ExtractedExpenseData, value: any) => {
        setDrafts(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
    }

    const handleSaveAll = async () => {
        if (drafts.length === 0) return
        setIsSaving(true)

        try {
            // 1. Subir archivos y preparar datos
            const gastosToSave = await Promise.all(drafts.map(async (draft) => {
                let archivoUrl = null

                // Si hay archivo físico, subirlo
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
                    } else {
                        console.error("Error subiendo archivo:", uploadError)
                    }
                }

                return {
                    ...draft,
                    archivo_url: archivoUrl,
                    // Asegurar tipos para la action
                    importe: Number(draft.importe) || 0,
                    base_imponible: Number(draft.base_imponible) || 0,
                    iva: Number(draft.iva) || 0,
                    // Si no tiene nombre, poner algo
                    nombre_proveedor: draft.nombre_proveedor || "Proveedor Desconocido"
                }
            }))

            // 2. Guardar en BD
            const result = await createBulkGastos(gastosToSave)

            if (result.success) {
                toast({
                    title: "¡Importación completada!",
                    description: `Se han guardado ${result.results?.length} gastos correctamente.`,
                })
                setDrafts([]) // Limpiar lista
                router.push("/gastos")
            } else {
                throw new Error("Error en la respuesta del servidor")
            }

        } catch (error: any) {
            console.error(error)
            toast({
                title: "Error al guardar",
                description: "Hubo un problema al guardar los gastos. Inténtalo de nuevo.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
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
                </div>

                {/* Panel Derecho: Lista de Revisión */}
                <div className="md:col-span-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-lg">Borradores ({drafts.length})</CardTitle>
                                <CardDescription>Revisa los datos antes de confirmar.</CardDescription>
                            </div>
                            {drafts.length > 0 && (
                                <Button onClick={handleSaveAll} disabled={isSaving} className="gap-2">
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    Guardar Todo ({drafts.length})
                                </Button>
                            )}
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
                                        <div key={index} className="flex flex-col gap-3 p-4 border rounded-lg bg-card shadow-sm group hover:border-primary/50 transition-colors">
                                            {/* Cabecera del item */}
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 grid grid-cols-2 gap-4">
                                                    {/* Proveedor */}
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Proveedor</Label>
                                                        <Input
                                                            value={draft.nombre_proveedor || ""}
                                                            onChange={(e) => updateDraft(index, "nombre_proveedor", e.target.value)}
                                                            className="h-8 text-sm font-medium"
                                                            placeholder="Nombre..."
                                                        />
                                                    </div>

                                                    {/* Importe */}
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Total (€)</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={draft.importe || ""}
                                                            onChange={(e) => updateDraft(index, "importe", parseFloat(e.target.value))}
                                                            className="h-8 text-sm font-bold text-right"
                                                        />
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                    onClick={() => removeDraft(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <Separator />

                                            {/* Detalles secundarios */}
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Fecha</Label>
                                                    <Input
                                                        type="date"
                                                        value={draft.fecha || ""}
                                                        onChange={(e) => updateDraft(index, "fecha", e.target.value)}
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Nº Factura</Label>
                                                    <Input
                                                        value={draft.numero || ""}
                                                        onChange={(e) => updateDraft(index, "numero", e.target.value)}
                                                        className="h-7 text-xs"
                                                        placeholder="F-..."
                                                    />
                                                </div>
                                                {draft.isDuplicate && (
                                                    <div className="flex items-center justify-center">
                                                        <Badge variant="destructive" className="text-[10px] gap-1 px-2 h-7 w-full justify-center">
                                                            <AlertCircle className="h-3 w-3" /> Duplicado
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Previsualización de archivo */}
                                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                                <span className="truncate max-w-[200px] bg-muted px-2 py-0.5 rounded">
                                                    {draft.archivo_file?.name}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
