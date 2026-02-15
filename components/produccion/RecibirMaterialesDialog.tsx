"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { recibirMateriales } from "@/lib/actions/ordenes-compra"
import { Package } from "lucide-react"

interface LineaOrdenCompra {
    id: string
    materia_prima_id: string
    cantidad_pedida: number
    cantidad_recibida: number
    lote_proveedor: string | null
    fecha_caducidad: string | null
    materia_prima?: {
        nombre: string
        codigo: string
        unidad_medida: string
    }
}

interface RecibirMaterialesDialogProps {
    ordenId: string
    lineas: LineaOrdenCompra[]
}

export function RecibirMaterialesDialog({ ordenId, lineas }: RecibirMaterialesDialogProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({})
    const [lotes, setLotes] = useState<Record<string, string>>({})
    const [caducidades, setCaducidades] = useState<Record<string, string>>({})

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Preparar datos de las líneas recibidas
            const lineasRecibidas = Object.entries(cantidadesRecibidas)
                .filter(([_, cantidad]) => cantidad > 0)
                .map(([lineaId, cantidad]) => ({
                    linea_id: lineaId,
                    cantidad_recibida: cantidad,
                    lote_proveedor: lotes[lineaId] || undefined,
                    fecha_caducidad: caducidades[lineaId] || undefined,
                }))

            if (lineasRecibidas.length === 0) {
                toast({
                    title: "Error",
                    description: "Debes especificar al menos una cantidad recibida",
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            const result = await recibirMateriales(ordenId, lineasRecibidas)

            if (result.error) {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            toast({
                title: "Materiales recibidos",
                description: "Los materiales han sido recibidos y el stock ha sido actualizado",
            })

            setIsOpen(false)
            setCantidadesRecibidas({})
            setLotes({})
            setCaducidades({})
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Error al recibir materiales",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Filtrar solo las líneas que aún no están completamente recibidas
    const lineasPendientes = lineas.filter(l => l.cantidad_recibida < l.cantidad_pedida)

    if (lineasPendientes.length === 0) {
        return null
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Package className="mr-2 h-4 w-4" />
                    Recibir Materiales
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Recibir Materiales</DialogTitle>
                    <DialogDescription>
                        Registra las cantidades recibidas de cada materia prima
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        {lineasPendientes.map((linea) => {
                            const cantidadPendiente = linea.cantidad_pedida - linea.cantidad_recibida

                            return (
                                <div key={linea.id} className="border rounded-lg p-4 space-y-3">
                                    <div>
                                        <h4 className="font-medium">{linea.materia_prima?.nombre}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {linea.materia_prima?.codigo} - Pendiente: {cantidadPendiente} {linea.materia_prima?.unidad_medida}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="space-y-1">
                                            <Label htmlFor={`cantidad-${linea.id}`}>
                                                Cantidad Recibida *
                                            </Label>
                                            <Input
                                                id={`cantidad-${linea.id}`}
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max={cantidadPendiente}
                                                value={cantidadesRecibidas[linea.id] || ""}
                                                onChange={(e) => setCantidadesRecibidas({
                                                    ...cantidadesRecibidas,
                                                    [linea.id]: parseFloat(e.target.value) || 0
                                                })}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor={`lote-${linea.id}`}>
                                                Lote Proveedor
                                            </Label>
                                            <Input
                                                id={`lote-${linea.id}`}
                                                value={lotes[linea.id] || linea.lote_proveedor || ""}
                                                onChange={(e) => setLotes({
                                                    ...lotes,
                                                    [linea.id]: e.target.value
                                                })}
                                                placeholder="Lote"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor={`caducidad-${linea.id}`}>
                                                Fecha Caducidad
                                            </Label>
                                            <Input
                                                id={`caducidad-${linea.id}`}
                                                type="date"
                                                value={caducidades[linea.id] || linea.fecha_caducidad || ""}
                                                onChange={(e) => setCaducidades({
                                                    ...caducidades,
                                                    [linea.id]: e.target.value
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Procesando..." : "Confirmar Recepción"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
