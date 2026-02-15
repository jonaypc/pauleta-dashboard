"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { updateEstadoOrdenCompra } from "@/lib/actions/ordenes-compra"
import { Send, CheckCircle, XCircle } from "lucide-react"

interface EstadoOrdenButtonsProps {
    ordenId: string
    estadoActual: string
}

export function EstadoOrdenButtons({ ordenId, estadoActual }: EstadoOrdenButtonsProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleCambiarEstado = async (nuevoEstado: string) => {
        setIsLoading(true)

        try {
            const result = await updateEstadoOrdenCompra(ordenId, nuevoEstado)

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
                title: "Estado actualizado",
                description: "El estado de la orden ha sido actualizado correctamente",
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

    return (
        <>
            {estadoActual === "borrador" && (
                <Button
                    size="sm"
                    onClick={() => handleCambiarEstado("enviada")}
                    disabled={isLoading}
                >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                </Button>
            )}

            {estadoActual === "enviada" && (
                <Button
                    size="sm"
                    onClick={() => handleCambiarEstado("confirmada")}
                    disabled={isLoading}
                >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar
                </Button>
            )}

            {!["recibida", "cancelada"].includes(estadoActual) && (
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleCambiarEstado("cancelada")}
                    disabled={isLoading}
                >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar
                </Button>
            )}
        </>
    )
}
