"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useProveedores } from "@/hooks/useProveedores"
import { mergeProveedores } from "@/lib/actions/proveedores"
import { Loader2, Merge } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface MergeProveedorDialogProps {
    sourceProveedorId: string
    sourceProveedorNombre: string
}

export function MergeProveedorDialog({ sourceProveedorId, sourceProveedorNombre }: MergeProveedorDialogProps) {
    const [open, setOpen] = useState(false)
    const [targetId, setTargetId] = useState<string>("")
    const [isMerging, setIsMerging] = useState(false)
    const { proveedores, fetchProveedores, loading } = useProveedores()
    const router = useRouter()
    const { toast } = useToast()

    useEffect(() => {
        if (open) {
            fetchProveedores()
        }
    }, [open, fetchProveedores])

    // Filtrar para no mostrar el mismo proveedor
    const availableTargets = proveedores.filter(p => p.id !== sourceProveedorId)

    const handleMerge = async () => {
        if (!targetId) return

        setIsMerging(true)
        try {
            const result = await mergeProveedores(sourceProveedorId, targetId)

            if (!result.success) {
                throw new Error(result.error)
            }

            toast({
                title: "Fusión completada",
                description: `Se han movido las facturas a ${proveedores.find(p => p.id === targetId)?.nombre} y se ha eliminado ${sourceProveedorNombre}.`
            })

            setOpen(false)
            // Redirigir al proveedor destino
            router.refresh()
            router.push(`/proveedores/${targetId}`)
        } catch (error: any) {
            console.error("Error merging proveedores:", error)
            toast({
                title: "Error al fusionar",
                description: error.message || "Ha ocurrido un error inesperado.",
                variant: "destructive"
            })
        } finally {
            setIsMerging(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Merge className="h-4 w-4" />
                    Fusionar Proveedor
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Fusionar Proveedor</DialogTitle>
                    <DialogDescription>
                        Esta acción es irreversible. Se moverán todas las facturas de <strong>{sourceProveedorNombre}</strong> al proveedor seleccionado, y luego se eliminará <strong>{sourceProveedorNombre}</strong> permanente.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Proveedor Destino (El que quedará)
                        </label>
                        <Select onValueChange={setTargetId} value={targetId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un proveedor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {loading ? (
                                    <div className="p-2 text-center text-sm text-muted-foreground">Cargando...</div>
                                ) : availableTargets.length === 0 ? (
                                    <div className="p-2 text-center text-sm text-muted-foreground">No hay otros proveedores</div>
                                ) : (
                                    availableTargets.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.nombre} {p.cif ? `(${p.cif})` : ""}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {targetId && (
                        <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 border border-yellow-200">
                            <strong>Atención:</strong> Vas a eliminar {sourceProveedorNombre} y mover todo su historial a {proveedores.find(p => p.id === targetId)?.nombre}.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isMerging}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleMerge}
                        disabled={!targetId || isMerging}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isMerging ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fusionando...
                            </>
                        ) : (
                            "Confirmar Fusión"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
