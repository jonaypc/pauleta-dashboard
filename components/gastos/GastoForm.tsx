"use client"

import { useState, useEffect, useRef } from "react"
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
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Loader2, Save, Calculator, Link as LinkIcon } from "lucide-react"
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
    // Campos fiscales
    base_imponible?: number | string | null
    impuestos?: number | string | null
    tipo_impuesto?: number | string | null
    pago_fijo_id?: string | null
}

const formSchema = z.object({
    proveedor: z.string().min(2, "El nombre del proveedor es requerido"),
    numero: z.string().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    importe: z.coerce.number().min(0.01, "El importe debe ser mayor a 0"),
    estado: z.string(),
    categoria: z.string().optional(),
    metodo_pago: z.string().optional(),
    notas: z.string().optional(),
    // Fiscalidad
    base_imponible: z.coerce.number().optional(),
    impuestos: z.coerce.number().optional(),
    tipo_impuesto: z.coerce.number().default(7.00),
    pago_fijo_id: z.string().optional().nullable()
})

interface PagoFijoOption {
    id: string
    concepto: string
}

interface GastoFormProps {
    initialData?: GastoFormData | null
    onSaveSuccess?: () => void
    pagosFijos?: PagoFijoOption[] // Lista para el dropdown
}

export function GastoForm({ initialData, onSaveSuccess, pagosFijos = [] }: GastoFormProps) {
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
            importe: initialData?.importe ? Number(initialData.importe) : 0,
            estado: "pendiente",
            categoria: "",
            metodo_pago: "transferencia",
            notas: "",
            base_imponible: initialData?.base_imponible ? Number(initialData.base_imponible) : undefined,
            impuestos: initialData?.impuestos ? Number(initialData.impuestos) : undefined,
            tipo_impuesto: initialData?.tipo_impuesto ? Number(initialData.tipo_impuesto) : 7.00,
            pago_fijo_id: initialData?.pago_fijo_id || "none" // "none" para controlar el select
        },
    })

    // Track previous ID to detect if we are switching context or just refining
    const lastIdRef = useRef<string | undefined>(initialData?.id)

    // Resetear o fusionar formulario cuando cambia initialData
    useEffect(() => {
        if (initialData) {
            // Si cambia el ID (es otro gasto distinto), reseteamos todo
            if (initialData.id !== lastIdRef.current) {
                form.reset({
                    numero: initialData.numero || "",
                    fecha: initialData.fecha || new Date().toISOString().split('T')[0],
                    proveedor: initialData.nombre_proveedor || "",
                    importe: initialData.importe ? Number(initialData.importe) : 0,
                    estado: initialData.estado || "pendiente",
                    categoria: initialData.categoria || "",
                    metodo_pago: initialData.metodo_pago || "transferencia",
                    notas: initialData.notas || "",
                    base_imponible: initialData.base_imponible ? Number(initialData.base_imponible) : undefined,
                    impuestos: initialData.impuestos ? Number(initialData.impuestos) : undefined,
                    tipo_impuesto: initialData.tipo_impuesto ? Number(initialData.tipo_impuesto) : 7.00,
                    pago_fijo_id: initialData.pago_fijo_id || "none"
                })
                lastIdRef.current = initialData.id
            } else {
                // Si es el Mismo ID (o refinamiento del mismo escaneo), fusionamos
                // Solo sobrescribimos si el campo actual está vacío
                const currentValues = form.getValues()

                const getMergedValue = (key: keyof typeof currentValues, incomingVal: any, defaultVal: any = "") => {
                    const currentVal = currentValues[key]
                    // Si el usuario ya escribió algo (y no es el valor por defecto/vacío), lo respetamos
                    if (currentVal && currentVal !== 0 && currentVal !== "7.00" && currentVal !== "none") {
                        return currentVal
                    }
                    return incomingVal || defaultVal
                }

                form.reset({
                    numero: getMergedValue("numero", initialData.numero),
                    fecha: getMergedValue("fecha", initialData.fecha, new Date().toISOString().split('T')[0]),
                    proveedor: getMergedValue("proveedor", initialData.nombre_proveedor),
                    importe: initialData.importe ? Number(initialData.importe) : (currentValues.importe || 0),
                    estado: getMergedValue("estado", initialData.estado, "pendiente"),
                    categoria: getMergedValue("categoria", initialData.categoria),
                    metodo_pago: getMergedValue("metodo_pago", initialData.metodo_pago, "transferencia"),
                    notas: getMergedValue("notas", initialData.notas),
                    base_imponible: initialData.base_imponible ? Number(initialData.base_imponible) : currentValues.base_imponible,
                    impuestos: initialData.impuestos ? Number(initialData.impuestos) : currentValues.impuestos,
                    tipo_impuesto: initialData.tipo_impuesto ? Number(initialData.tipo_impuesto) : (currentValues.tipo_impuesto || 7.00),
                    pago_fijo_id: initialData.pago_fijo_id || currentValues.pago_fijo_id || "none"
                })
            }
        }
    }, [initialData, form])

    // Autocalculadora de Impuestos
    const calculateTaxes = () => {
        const total = parseFloat(form.getValues("importe").toString())
        const taxRate = parseFloat(form.getValues("tipo_impuesto").toString()) || 7.00

        if (total && !isNaN(total)) {
            // Asumiendo que Total = Base + (Base * Rate / 100)
            // Total = Base * (1 + Rate / 100)
            // Base = Total / (1 + Rate / 100)
            const base = total / (1 + (taxRate / 100))
            const taxAmount = total - base

            form.setValue("base_imponible", parseFloat(base.toFixed(2)))
            form.setValue("impuestos", parseFloat(taxAmount.toFixed(2)))
            toast({ title: "Cálculo Fiscal", description: "Base e impuestos recalculados desde el total." })
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            // 1. Gestionar Proveedor (Crear si no existe o usar existente)
            let proveedorId = null

            const { data: existingProvider } = await supabase
                .from("proveedores")
                .select("id")
                .ilike("nombre", values.proveedor)
                .maybeSingle()

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
                importe: values.importe,
                estado: values.estado,
                categoria: values.categoria,
                metodo_pago: values.metodo_pago,
                notas: values.notas,
                // Campos Fiscales
                base_imponible: values.base_imponible || null,
                impuestos: values.impuestos || null,
                tipo_impuesto: values.tipo_impuesto || 7.00,
                // Campo de vinculación (convertir "none" a null)
                pago_fijo_id: values.pago_fijo_id === "none" ? null : values.pago_fijo_id,
                // Archivo
                ...(archivoUrl ? { archivo_url: archivoUrl } : {})
            }

            if (initialData?.id) { // Modo Editar
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
                        archivo_url: archivoUrl || null
                    })

                if (insertError) throw insertError
                toast({ description: "Gasto registrado correctamente." })
            }

            // Si hay callback (modo múltiple), usarlo
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

                {/* Section: Datos Principales */}
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

                {/* Section: Fiscalidad */}
                <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-800">
                            <Calculator className="h-4 w-4" /> Desglose Fiscal (IGIC/IVA)
                        </h3>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={calculateTaxes}
                        >
                            Calcular desde Total
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {/* Importe Total */}
                        <FormField
                            control={form.control}
                            name="importe"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Total Factura (€)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" className="font-bold" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Base Imponible */}
                        <FormField
                            control={form.control}
                            name="base_imponible"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Base Imponible (€)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-2">
                            {/* % Impuesto */}
                            <FormField
                                control={form.control}
                                name="tipo_impuesto"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>% Imp.</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="7.00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Importe Impuesto */}
                            <FormField
                                control={form.control}
                                name="impuestos"
                                render={({ field }) => (
                                    <FormItem className="flex-[1.5]">
                                        <FormLabel>Cuota IGIC (€)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Vinculaciones y Categoría */}
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="categoria"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoría</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona categoría" />
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

                    {/* Vinculación Pago Fijo */}
                    <FormField
                        control={form.control}
                        name="pago_fijo_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <LinkIcon className="h-3 w-3" /> Vincular a Pago Fijo
                                </FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value || "none"}
                                    disabled={pagosFijos.length === 0}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={pagosFijos.length === 0 ? "No hay pagos fijos" : "Selecciona si corresponde"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">-- No vincular --</SelectItem>
                                        {pagosFijos.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.concepto}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Si seleccionas un pago (ej. Alquiler), esta factura contará como el comprobante del mes.
                                </FormDescription>
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
