"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { Save, CreditCard } from "lucide-react"
import type { CobroFormData, MetodoPago } from "@/types"

interface CobroFormProps {
    facturaId: string
    facturaNumero: string
    pendiente: number
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
    { value: "transferencia", label: "Transferencia bancaria" },
    { value: "efectivo", label: "Efectivo" },
    { value: "bizum", label: "Bizum" },
    { value: "tarjeta", label: "Tarjeta" },
]

// Formatea precio
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

export function CobroForm({
    facturaId,
    facturaNumero,
    pendiente,
    open,
    onOpenChange,
    onSuccess,
}: CobroFormProps) {
    const supabase = createClient()

    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState<CobroFormData>({
        factura_id: facturaId,
        fecha: new Date().toISOString().split("T")[0],
        importe: pendiente,
        metodo: "transferencia",
        referencia: "",
        notas: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.importe <= 0) {
            toast({
                title: "Error",
                description: "El importe debe ser mayor que 0",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)

        try {
            // Insertar cobro
            const { error: cobroError } = await supabase.from("cobros").insert({
                factura_id: facturaId,
                fecha: formData.fecha,
                importe: formData.importe,
                metodo: formData.metodo,
                referencia: formData.referencia || null,
                notas: formData.notas || null,
            })

            if (cobroError) throw cobroError

            // Si el cobro cubre el total pendiente, marcar factura como cobrada
            if (formData.importe >= pendiente) {
                await supabase
                    .from("facturas")
                    .update({ estado: "cobrada" })
                    .eq("id", facturaId)
            }

            toast({
                title: "Cobro registrado",
                description: `Se ha registrado un cobro de ${formatPrecio(formData.importe)}`,
                variant: "success",
            })

            onOpenChange(false)
            onSuccess?.()
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "Error desconocido"
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Registrar cobro
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Factura {facturaNumero} - Pendiente: {formatPrecio(pendiente)}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="fecha" required>
                                Fecha
                            </Label>
                            <Input
                                id="fecha"
                                type="date"
                                value={formData.fecha}
                                onChange={(e) =>
                                    setFormData({ ...formData, fecha: e.target.value })
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="importe" required>
                                Importe (€)
                            </Label>
                            <Input
                                id="importe"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={pendiente}
                                value={formData.importe}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        importe: parseFloat(e.target.value) || 0,
                                    })
                                }
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="metodo" required>
                            Método de pago
                        </Label>
                        <Select
                            value={formData.metodo}
                            onValueChange={(value) =>
                                setFormData({ ...formData, metodo: value as MetodoPago })
                            }
                        >
                            <SelectTrigger id="metodo">
                                <SelectValue placeholder="Seleccionar método" />
                            </SelectTrigger>
                            <SelectContent>
                                {METODOS_PAGO.map((metodo) => (
                                    <SelectItem key={metodo.value} value={metodo.value}>
                                        {metodo.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="referencia">Referencia</Label>
                        <Input
                            id="referencia"
                            value={formData.referencia}
                            onChange={(e) =>
                                setFormData({ ...formData, referencia: e.target.value })
                            }
                            placeholder="Número de transferencia, recibo..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notas">Notas</Label>
                        <Input
                            id="notas"
                            value={formData.notas}
                            onChange={(e) =>
                                setFormData({ ...formData, notas: e.target.value })
                            }
                            placeholder="Observaciones..."
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
                        <Button type="submit" loading={isLoading}>
                            <Save className="mr-2 h-4 w-4" />
                            Registrar cobro
                        </Button>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    )
}
