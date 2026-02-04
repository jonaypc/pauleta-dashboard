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
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { CATEGORIAS_GASTOS } from "./constants"
import { ExtractedExpenseData } from "./SmartExpenseImporter"

const formSchema = z.object({
    numero: z.string().optional(),
    fecha: z.string().min(1, "La fecha es obligatoria"),
    proveedor: z.string().min(1, "El nombre del proveedor es obligatorio"),
    importe: z.string().min(1, "El importe es obligatorio"),
    categoria: z.string().optional(),
    estado: z.string().default("pendiente"),
    metodo_pago: z.string().optional(),
    notas: z.string().optional(),
})

interface GastoFormProps {
    initialData?: ExtractedExpenseData | null
}

export function GastoForm({ initialData }: GastoFormProps) {
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

            // 3. Crear Gasto
            const { error: gastoError } = await supabase
                .from("gastos")
                .insert({
                    proveedor_id: proveedorId,
                    numero: values.numero,
                    fecha: values.fecha,
                    importe: parseFloat(values.importe),
                    estado: values.estado,
                    categoria: values.categoria,
                    metodo_pago: values.metodo_pago,
                    notas: values.notas,
                    archivo_url: archivoUrl
                })

            if (gastoError) throw gastoError

            toast({
                title: "Gasto registrado",
                description: "La factura se ha guardado correctamente.",
            })

            router.push("/gastos")
            router.refresh()

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
