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
    telefono: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    cuenta_bancaria: z.string().optional(),
    serie_factura: z.string().min(1, "La serie es obligatoria"),
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
            telefono: initialData?.telefono || "",
            email: initialData?.email || "",
            cuenta_bancaria: initialData?.cuenta_bancaria || "",
            serie_factura: initialData?.serie_factura || "F",
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
                                    <FormLabel>Dirección Fiscal Completa</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Calle, Número, Ciudad, Provincia" {...field} />
                                    </FormControl>
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
