"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { updateEstadoOrden } from "@/lib/actions/ordenes-produccion"
import { Play, Pause, CheckCircle2, XCircle } from "lucide-react"

interface EstadoOrdenProduccionButtonsProps {
    ordenId: string
    estadoActual: string
}

export function EstadoOrdenProduccionButtons({
    ordenId,
    estadoActual,
}: EstadoOrdenProduccionButtonsProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleCambiarEstado = async (nuevoEstado: string) => {
        setIsLoading(true)

        try {
            const result = await updateEstadoOrden(ordenId, nuevoEstado)

            if (result.error) {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                })
                return
            }

            toast({
                title: "Estado actualizado",
                description: `La orden ha sido marcada como ${nuevoEstado}`,
            })

            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Error al actualizar el estado",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Definir transiciones permitidas según el estado actual
    const mostrarIniciar = estadoActual === "planificada" || estadoActual === "pausada"
    const mostrarPausar = estadoActual === "en_proceso"
    const mostrarCompletar = estadoActual === "en_proceso"
    const mostrarCancelar = estadoActual !== "completada" && estadoActual !== "cancelada"

    return (
        <div className="flex gap-2 flex-wrap">
            {/* Botón Iniciar */}
            {mostrarIniciar && (
                <Button
                    onClick={() => handleCambiarEstado("en_proceso")}
                    disabled={isLoading}
                    variant="default"
                >
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Producción
                </Button>
            )}

            {/* Botón Pausar */}
            {mostrarPausar && (
                <Button
                    onClick={() => handleCambiarEstado("pausada")}
                    disabled={isLoading}
                    variant="outline"
                >
                    <Pause className="mr-2 h-4 w-4" />
                    Pausar
                </Button>
            )}

            {/* Botón Completar */}
            {mostrarCompletar && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button disabled={isLoading} variant="default" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Completar Orden
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Completar orden de producción?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción marcará la orden como completada y:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Consumirá automáticamente las materias primas según la receta</li>
                                    <li>Calculará los costos de producción</li>
                                    <li>Actualizará el inventario</li>
                                </ul>
                                <p className="mt-3 font-medium">
                                    Asegúrate de haber actualizado la cantidad producida antes de completar.
                                </p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => handleCambiarEstado("completada")}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Sí, Completar Orden
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Botón Cancelar */}
            {mostrarCancelar && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button disabled={isLoading} variant="destructive">
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar Orden
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Cancelar orden de producción?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción marcará la orden como cancelada. No se consumirán materias primas
                                ni se calcularán costos. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>No, mantener orden</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => handleCambiarEstado("cancelada")}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Sí, Cancelar Orden
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    )
}
