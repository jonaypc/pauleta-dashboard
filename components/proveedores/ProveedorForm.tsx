
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { useProveedores } from "@/hooks/useProveedores"
import { Proveedor } from "@/types"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    cif: z.string().optional(),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    categoria_default: z.string().optional(),
})

interface ProveedorFormProps {
    initialData?: Proveedor | null
    onSuccess?: (prov: Proveedor) => void
    redirectUrl?: string
}

export function ProveedorForm({ initialData, onSuccess, redirectUrl }: ProveedorFormProps) {
    const router = useRouter()
    const { createProveedor, updateProveedor } = useProveedores()
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nombre: initialData?.nombre || "",
            cif: initialData?.cif || "",
            direccion: initialData?.direccion || "",
            telefono: initialData?.telefono || "",
            email: initialData?.email || "",
            categoria_default: initialData?.categoria_default || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            if (initialData) {
                const updated = await updateProveedor(initialData.id, values)
                if (updated && onSuccess) onSuccess(updated)
            } else {
                const created = await createProveedor(values)
                if (created && onSuccess) onSuccess(created)
            }
            router.refresh()
            if (redirectUrl) {
                router.push(redirectUrl)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre o Razón Social</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: Distribuciones Canarias S.L." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="cif"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CIF/NIF</FormLabel>
                                <FormControl>
                                    <Input placeholder="B12345678" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="categoria_default"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoría Principal</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Materia Prima">Materia Prima</SelectItem>
                                        <SelectItem value="Suministros">Suministros</SelectItem>
                                        <SelectItem value="Alquiler">Alquiler</SelectItem>
                                        <SelectItem value="Servicios">Servicios</SelectItem>
                                        <SelectItem value="Transporte">Transporte</SelectItem>
                                        <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                                        <SelectItem value="Publicidad">Publicidad</SelectItem>
                                        <SelectItem value="Impuestos">Impuestos</SelectItem>
                                        <SelectItem value="Otros">Otros</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="contacto@proveedor.com" type="email" {...field} />
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
                                    <Input placeholder="928 000 000" {...field} />
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
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="C/ Ejemplo 123, Las Palmas"
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? "Guardar Cambios" : "Crear Proveedor"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
