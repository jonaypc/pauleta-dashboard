"use client"

import { useState, useEffect } from "react"
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
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { CATEGORIAS_GASTOS } from "./constants"

// Definición local flexible para aceptar datos de BD o de Extracción
export interface GastoFormData {
    id?: string
    numero?: string | null
    fecha?: string | null
    nombre_proveedor?: string | null
    cif_proveedor?: string | null
    importe?: number | string | null
    estado?: string
    categoria?: string | null
    metodo_pago?: string | null
    notas?: string | null
    archivo_file?: File | null // Para subidas nuevas
    archivo_url?: string | null // Para visualización
}

const formSchema = z.object({
    // ... existing schema ...
})

interface GastoFormProps {
    initialData?: GastoFormData | null
    onSaveSuccess?: () => void
}

export function GastoForm({ initialData, onSaveSuccess }: GastoFormProps) {
    const router = useRouter()
    const supabase = createClient()
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Pre-fill form if initialData exists
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            numero: initialData?.numero || "",
            fecha: initialData?.fecha || new Date().toISOString().split('T')[0],
            proveedor: initialData?.nombre_proveedor || "",
            importe: initialData?.importe?.toString() || "",
            estado: "pendiente",
            categoria: "",
            metodo_pago: "transferencia",
            notas: ""
        },
    })

    // Resetear formulario cuando cambia initialData (modo múltiple)
    useEffect(() => {
        if (initialData) {
            form.reset({
                numero: initialData.numero || "",
                fecha: initialData.fecha || new Date().toISOString().split('T')[0],
                proveedor: initialData.nombre_proveedor || "",
                importe: initialData.importe?.toString() || "",
                estado: "pendiente",
                categoria: "",
                metodo_pago: "transferencia",
                notas: ""
            })
        }
    }, [initialData, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            // 1. Gestionar Proveedor (Crear si no existe o usar existente)
            // Simplificado: Buscar por nombre exacto o crear
            let proveedorId = null

            const { data: existingProvider } = await supabase
                .from("proveedores")
                .select("id")
                .ilike("nombre", values.proveedor)
                .single()

            if (existingProvider) {
                proveedorId = existingProvider.id
            } else {
                // Crear nuevo proveedor
                const { data: newProvider, error: providerError } = await supabase
                    .from("proveedores")
                    .insert({
                        nombre: values.proveedor,
                        cif: initialData?.cif_proveedor // Usar CIF extraído si está disponible
                    })
                    .select("id")
                    .single()

                if (providerError) throw providerError
                proveedorId = newProvider.id
            }

            // 2. Subir Archivo (Si existe)
            let archivoUrl = null
            if (initialData?.archivo_file) {
                const file = initialData.archivo_file
                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `facturas_gastos/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('gastos')
                    .upload(filePath, file)

                if (uploadError) {
                    console.error("Error upload:", uploadError)
                    toast({
                        title: "Advertencia",
                        description: "El gasto se guardará pero la imagen falló al subir."
                    })
                } else {
                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('gastos')
                        .getPublicUrl(filePath)
                    archivoUrl = publicUrl
                }
            }

            // 3. Crear o Actualizar Gasto
            const expenseData = {
                proveedor_id: proveedorId,
                numero: values.numero,
                fecha: values.fecha,
                importe: parseFloat(values.importe),
                estado: values.estado,
                categoria: values.categoria,
                metodo_pago: values.metodo_pago,
                notas: values.notas,
                // Solo actualizar archivo si hay uno nuevo, si no mantener el anterior (implícito en backend si no se manda, pero aquí lo controlamos)
                ...(archivoUrl ? { archivo_url: archivoUrl } : {})
            }

            if (initialData?.id) { // Modo Editar (usamos initialData.id como flag de registro existente en BD)
                const { error: updateError } = await supabase
                    .from("gastos")
                    .update(expenseData)
                    .eq('id', initialData.id)

                if (updateError) throw updateError
                toast({ description: "Gasto actualizado correctamente." })
            } else {
                // Modo Crear
                const { error: insertError } = await supabase
                    .from("gastos")
                    .insert({
                        ...expenseData,
                        archivo_url: archivoUrl || null // En insert sí mandamos null si no hay
                    })

                if (insertError) throw insertError
                toast({ description: "Gasto registrado correctamente." })
            }

            // Si hay callback (modo múltiple), usarlo en lugar de redireccionar
            if (onSaveSuccess) {
                onSaveSuccess()
            } else {
                router.push("/gastos")
                router.refresh()
            }

        } catch (error: any) {
            console.error(error)
            toast({
                title: "Error",
                description: error.message || "No se pudo guardar el gasto.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Proveedor */}
                    <FormField
                        control={form.control}
                        name="proveedor"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Proveedor</FormLabel>
                                <FormControl>
                                    <Input placeholder="Nombre del proveedor (ej: Makro)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Nº Factura */}
                    <FormField
                        control={form.control}
                        name="numero"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nº Factura</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: F-2024/001" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Fecha */}
                    <FormField
                        control={form.control}
                        name="fecha"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha Emisión</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Importe */}
                    <FormField
                        control={form.control}
                        name="importe"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Importe Total (€)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Categoría */}
                    <FormField
                        control={form.control}
                        name="categoria"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoría</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona una categoría" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {CATEGORIAS_GASTOS.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Estado Pago */}
                    <FormField
                        control={form.control}
                        name="estado"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estado</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Estado del pago" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="pendiente">Pendiente</SelectItem>
                                        <SelectItem value="pagado">Pagado</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Notas */}
                <FormField
                    control={form.control}
                    name="notas"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Detalles adicionales..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Guardar Gasto
                        </>
                    )}
                </Button>
            </form>
        </Form>
    )
}
