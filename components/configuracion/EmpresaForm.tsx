"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Loader2, Save, Building2 } from "lucide-react"
import type { Empresa } from "@/types"

const empresaSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    cif: z.string().optional(),
    direccion: z.string().optional(),
    codigo_postal: z.string().optional(),
    ciudad: z.string().optional(),
    provincia: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    cuenta_bancaria: z.string().optional(),
    logo_url: z.string().optional(),
    serie_factura: z.string().min(1, "La serie es obligatoria"),
    color_primario: z.string().optional(),
    texto_pie: z.string().optional(),
    mostrar_logo: z.boolean().optional(),
    logo_width: z.number().optional(),
    titulo_font_size: z.number().optional(),
    bank_font_size: z.number().optional(),
    footer_bottom_fixed: z.boolean().optional(),
})

type EmpresaFormValues = z.infer<typeof empresaSchema>

interface EmpresaFormProps {
    initialData?: Empresa | null
}

export function EmpresaForm({ initialData }: EmpresaFormProps) {
    const router = useRouter()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<EmpresaFormValues>({
        resolver: zodResolver(empresaSchema),
        defaultValues: {
            nombre: initialData?.nombre || "",
            cif: initialData?.cif || "",
            direccion: initialData?.direccion || "",
            codigo_postal: initialData?.codigo_postal || "",
            ciudad: initialData?.ciudad || "",
            provincia: initialData?.provincia || "",
            telefono: initialData?.telefono || "",
            email: initialData?.email || "",
            cuenta_bancaria: initialData?.cuenta_bancaria || "",
            logo_url: initialData?.logo_url || "",
            serie_factura: initialData?.serie_factura || "F",
            color_primario: initialData?.color_primario || "#2563EB",
            texto_pie: initialData?.texto_pie || "",
            mostrar_logo: initialData?.mostrar_logo ?? true,
            logo_width: initialData?.logo_width || 60,
            titulo_font_size: initialData?.titulo_font_size || 24,
            bank_font_size: initialData?.bank_font_size || 14,
            footer_bottom_fixed: initialData?.footer_bottom_fixed ?? true,
        },
    })

    const onSubmit = async (values: EmpresaFormValues) => {
        setIsLoading(true)

        try {
            if (initialData?.id) {
                // Update
                const { error } = await supabase
                    .from("empresa")
                    .update(values)
                    .eq("id", initialData.id)

                if (error) throw error
            } else {
                // Create (si no existe)
                const { error } = await supabase.from("empresa").insert(values)
                if (error) throw error
            }

            toast({
                title: "Configuración guardada",
                description: "Los datos de la empresa se han actualizado",
                variant: "success",
            })
            router.refresh()
        } catch (error) {
            console.error("Error saving empresa:", error)
            toast({
                title: "Error",
                description: "No se pudieron guardar los datos",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Datos de la Empresa</CardTitle>
                                <CardDescription>
                                    Información que aparecerá en tus facturas y albaranes.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="nombre"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Razón Social / Nombre</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Tu Empresa S.L." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cif"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CIF / NIF</FormLabel>
                                        <FormControl>
                                            <Input placeholder="B12345678" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email de contacto</FormLabel>
                                        <FormControl>
                                            <Input placeholder="info@tuempresa.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="telefono"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Teléfono</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+34 600 000 000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="direccion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección Fiscal (Calle y número)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Calle Ejemplo, 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid gap-4 md:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="codigo_postal"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código Postal</FormLabel>
                                        <FormControl>
                                            <Input placeholder="35000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ciudad"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ciudad</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Las Palmas de GC" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="provincia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Provincia</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Las Palmas" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="logo_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL del Logo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://..." {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        URL de tu logo (aparecerá en facturas y emails)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="cuenta_bancaria"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cuenta Bancaria (IBAN)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ES96 ..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Aparecerá en el pie de las facturas
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="serie_factura"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Serie Facturación</FormLabel>
                                        <FormControl>
                                            <Input placeholder="F" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Prefijo para tus facturas (ej: F25001)
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Building2 className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                                <CardTitle>Diseño de Factura</CardTitle>
                                <CardDescription>
                                    Personaliza la apariencia de tus documentos PDF.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="color_primario"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Color Primario (Hex)</FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input type="color" className="w-12 h-10 p-1" {...field} />
                                            </FormControl>
                                            <FormControl>
                                                <Input placeholder="#2563EB" {...field} />
                                            </FormControl>
                                        </div>
                                        <FormDescription>
                                            Color para cabeceras y importes totales.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="mostrar_logo"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Mostrar Logo</FormLabel>
                                            <FormDescription>
                                                Incluir el logo en la cabecera del PDF.
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
                        </div>

                        <FormField
                            control={form.control}
                            name="texto_pie"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Texto al Pie</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Gracias por su confianza. Registro Mercantil..."
                                            className="resize-none"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Texto legal, agradecimientos o información registral que aparecerá al final.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="logo_width"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tamaño Logo: {field.value}px</FormLabel>
                                        <FormControl>
                                            <Slider
                                                min={30}
                                                max={200}
                                                step={5}
                                                defaultValue={[field.value || 60]}
                                                onValueChange={(vals) => field.onChange(vals[0])}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="titulo_font_size"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tamaño Título: {field.value}px</FormLabel>
                                        <FormControl>
                                            <Slider
                                                min={12}
                                                max={48}
                                                step={2}
                                                defaultValue={[field.value || 24]}
                                                onValueChange={(vals) => field.onChange(vals[0])}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Guardar Configuración
                    </Button>
                </div>
            </form>
        </Form>
    )
}
