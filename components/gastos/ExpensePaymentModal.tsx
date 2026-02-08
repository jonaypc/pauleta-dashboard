
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const paymentSchema = z.object({
    importe: z.coerce.number().min(0.01, "El importe debe ser mayor a 0"),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    metodo_pago: z.string().min(1, "Selecciona un método de pago"),
    notas: z.string().optional(),
})

interface ExpensePaymentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    gasto: {
        id: string
        numero: string
        proveedor_nombre: string
        importe: number
        monto_pagado: number
    }
    onPaymentSuccess: () => void
}

export function ExpensePaymentModal({ open, onOpenChange, gasto, onPaymentSuccess }: ExpensePaymentModalProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const supabase = createClient()

    const pendiente = gasto.importe - (gasto.monto_pagado || 0)

    const form = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            importe: pendiente > 0 ? Number(pendiente.toFixed(2)) : 0,
            fecha: new Date().toISOString().split('T')[0],
            metodo_pago: "transferencia",
            notas: ""
        }
    })

    async function onSubmit(values: z.infer<typeof paymentSchema>) {
        if (values.importe > pendiente + 0.01) { // Pequeño margen por redondeo
            toast({
                variant: "destructive",
                description: `El importe no puede superar lo pendiente (${formatCurrency(pendiente)})`
            })
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('pagos_gastos')
                .insert({
                    gasto_id: gasto.id,
                    importe: values.importe,
                    fecha: values.fecha,
                    metodo_pago: values.metodo_pago,
                    notas: values.notas
                })

            if (error) throw error

            toast({
                description: "Pago registrado correctamente"
            })
            onOpenChange(false)
            onPaymentSuccess()
            form.reset()
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                description: "Error al registrar el pago"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Pago</DialogTitle>
                    <DialogDescription>
                        Añadir pago para la factura <span className="font-semibold">{gasto.numero}</span> de {gasto.proveedor_nombre}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted p-4 rounded-md mb-4 text-sm space-y-1">
                    <div className="flex justify-between">
                        <span>Total Factura:</span>
                        <span className="font-semibold">{formatCurrency(gasto.importe)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Pagado hasta ahora:</span>
                        <span className="text-green-600">{formatCurrency(gasto.monto_pagado || 0)}</span>
                    </div>
                    <div className="flex justify-between border-t border-black/10 pt-1 mt-1">
                        <span className="font-bold">Pendiente:</span>
                        <span className="font-bold text-destructive">{formatCurrency(pendiente)}</span>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="importe"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Importe a Pagar (€)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fecha"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha Pago</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="metodo_pago"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="transferencia">Transferencia</SelectItem>
                                            <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                            <SelectItem value="efectivo">Efectivo</SelectItem>
                                            <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                                            <SelectItem value="bizum">Bizum</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notas"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ref. bancaria, detalles..." className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrar Pago
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
