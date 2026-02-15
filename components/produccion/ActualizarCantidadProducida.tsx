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
import { updateOrdenProduccion } from "@/lib/actions/ordenes-produccion"
import { Edit } from "lucide-react"

interface ActualizarCantidadProducidaProps {
    ordenId: string
    cantidadActual: number
    cantidadPlanificada: number
}

export function ActualizarCantidadProducida({
    ordenId,
    cantidadActual,
    cantidadPlanificada,
}: ActualizarCantidadProducidaProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [cantidad, setCantidad] = useState(cantidadActual.toString())

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const cantidadNumerica = parseFloat(cantidad)

            if (isNaN(cantidadNumerica) || cantidadNumerica < 0) {
                toast({
                    title: "Error",
                    description: "La cantidad debe ser un número válido mayor o igual a 0",
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            const result = await updateOrdenProduccion(ordenId, {
                cantidad_producida: cantidadNumerica,
            })

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
                title: "Cantidad actualizada",
                description: `La cantidad producida ha sido actualizada a ${cantidadNumerica}`,
            })

            setIsOpen(false)
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Error al actualizar la cantidad",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Actualizar Cantidad Producida
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Actualizar Cantidad Producida</DialogTitle>
                    <DialogDescription>
                        Registra la cantidad real producida hasta el momento
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cantidad">Cantidad Producida</Label>
                            <Input
                                id="cantidad"
                                type="number"
                                step="0.01"
                                min="0"
                                max={cantidadPlanificada * 1.5} // Permitir hasta 150% de la planificada
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                            <p className="text-sm text-muted-foreground">
                                Cantidad planificada: {cantidadPlanificada}
                            </p>
                        </div>
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
                            {isLoading ? "Actualizando..." : "Actualizar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
