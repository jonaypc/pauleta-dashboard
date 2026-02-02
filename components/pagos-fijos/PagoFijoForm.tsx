"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Plus, Loader2 } from "lucide-react"
import type { PagoFijo } from "@/types"

const pagoFijoSchema = z.object({
    concepto: z.string().min(1, "El concepto es obligatorio"),
    dia_inicio: z.coerce
        .number()
        .min(1, "Mínimo día 1")
        .max(31, "Máximo día 31"),
    dia_fin: z.coerce
        .number()
        .min(1, "Mínimo día 1")
        .max(31, "Máximo día 31"),
    importe: z.coerce.number().min(0, "El importe no puede ser negativo"),
    variable: z.boolean().default(false),
    activo: z.boolean().default(true),
})

type PagoFijoFormValues = z.infer<typeof pagoFijoSchema>

interface PagoFijoFormProps {
    pagoToEdit?: PagoFijo | null
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
}

export function PagoFijoForm({
    pagoToEdit,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
    children,
}: PagoFijoFormProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = externalOpen !== undefined
    const open = isControlled ? externalOpen : internalOpen
    const onOpenChange = isControlled ? externalOnOpenChange : setInternalOpen

    const router = useRouter()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)

    const defaultValues: PagoFijoFormValues = {
        concepto: "",
        dia_inicio: 1,
        dia_fin: 5,
        importe: 0,
        variable: false,
        activo: true,
    }

    const form = useForm<PagoFijoFormValues>({
        resolver: zodResolver(pagoFijoSchema),
        defaultValues,
    })

    // Reset form when pagoToEdit changes or dialog opens/closes
    useEffect(() => {
        if (open) {
            if (pagoToEdit) {
                form.reset({
                    concepto: pagoToEdit.concepto,
                    dia_inicio: pagoToEdit.dia_inicio,
                    dia_fin: pagoToEdit.dia_fin,
                    importe: pagoToEdit.importe,
                    variable: pagoToEdit.variable,
                    activo: pagoToEdit.activo,
                })
            } else {
                form.reset(defaultValues)
            }
        }
    }, [open, pagoToEdit, form])

    const onSubmit = async (values: PagoFijoFormValues) => {
        setIsLoading(true)

        try {
            if (pagoToEdit) {
                // Update
                const { error } = await supabase
                    .from("pagos_fijos")
                    .update(values)
                    .eq("id", pagoToEdit.id)

                if (error) throw error

                toast({
                    title: "Pago fijo actualizado",
                    variant: "success",
                })
            } else {
                // Create
                const { error } = await supabase.from("pagos_fijos").insert(values)

                if (error) throw error

                toast({
                    title: "Pago fijo creado",
                    variant: "success",
                })
            }

            router.refresh()
            onOpenChange?.(false)
        } catch (error) {
            console.error("Error saving pago fijo:", error)
            toast({
                title: "Error",
                description: "No se pudo guardar el pago fijo",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {pagoToEdit ? "Editar pago fijo" : "Nuevo pago fijo"}
                    </DialogTitle>
                    <DialogDescription>
                        Configura los pagos recurrentes para recibir recordatorios.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="concepto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Concepto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Alquiler Local" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dia_inicio"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Día inicio (1-31)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={31} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="dia_fin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Día fin (1-31)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={31} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="importe"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Importe estimado</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...field}
                                            disabled={form.watch("variable")}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Si es variable, pon un estimado o 0.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="variable"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Importe Variable</FormLabel>
                                        <FormDescription>
                                            Marca si el importe cambia cada mes (ej: Luz)
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="activo"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Activo</FormLabel>
                                        <FormDescription>
                                            Activar o desactivar este recordatorio
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
