"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Save, X, Package, Tag } from "lucide-react"
import type { Producto, ProductoFormData, UnidadMedida } from "@/types"

interface ProductoFormProps {
    producto?: Producto
    allProductos?: Producto[]
    onCancel?: () => void
}

const UNIDADES: { value: UnidadMedida; label: string }[] = [
    { value: "unidad", label: "Unidad" },
    { value: "caja", label: "Caja" },
    { value: "kg", label: "Kilogramo (Kg)" },
]

const IGIC_OPTIONS = [
    { value: 0, label: "0% - Exento" },
    { value: 3, label: "3% - Reducido" },
    { value: 7, label: "7% - General" },
]

export function ProductoForm({
    producto,
    allProductos,
    onCancel,
}: ProductoFormProps) {
    const router = useRouter()
    const supabase = createClient()
    const isEditing = !!producto

    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState<ProductoFormData>({
        nombre: producto?.nombre || "",
        descripcion: producto?.descripcion || "",
        precio: producto?.precio || 0,
        unidad: producto?.unidad || "unidad",
        igic: producto?.igic ?? 7,
        categoria: producto?.categoria || "",
        stock: producto?.stock || 0,
        stock_minimo: producto?.stock_minimo || 0,
        multiplicador_stock: producto?.multiplicador_stock || 1,
        vinculado_a_id: producto?.vinculado_a_id || "",
    })

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? parseFloat(value) || 0 : value,
        }))
    }

    const handleSelectChange = (name: string, value: string) => {
        if (name === "igic") {
            setFormData((prev) => ({ ...prev, [name]: parseInt(value) }))
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Preparar datos para enviar (limpiar campos vacíos)
            const dataToSend = {
                ...formData,
                descripcion: formData.descripcion || null,
                categoria: formData.categoria || null,
                vinculado_a_id: formData.vinculado_a_id || null,
            }

            if (isEditing) {
                const { error } = await supabase
                    .from("productos")
                    .update(dataToSend)
                    .eq("id", producto.id)

                if (error) throw error

                toast({
                    title: "Producto actualizado",
                    description: "Los datos del producto se han guardado correctamente",
                    variant: "success",
                })
            } else {
                const { error } = await supabase.from("productos").insert([dataToSend])

                if (error) throw error

                toast({
                    title: "Producto creado",
                    description: "El nuevo producto se ha añadido correctamente",
                    variant: "success",
                })
            }

            router.push("/productos")
            router.refresh()
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
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos principales */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5" />
                        Datos del producto
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="nombre" required>
                            Nombre del producto
                        </Label>
                        <Input
                            id="nombre"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            placeholder="Ej: Plátano de Canarias"
                            required
                        />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="descripcion">Descripción</Label>
                        <textarea
                            id="descripcion"
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            placeholder="Descripción detallada del producto..."
                            rows={3}
                            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Inventario */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5" />
                        Inventario
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="stock">Stock Actual (unidades)</Label>
                        <Input
                            id="stock"
                            name="stock"
                            type="number"
                            value={formData.stock}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                        <Input
                            id="stock_minimo"
                            name="stock_minimo"
                            type="number"
                            value={formData.stock_minimo}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="multiplicador_stock">Multiplicador Stock</Label>
                        <Input
                            id="multiplicador_stock"
                            name="multiplicador_stock"
                            type="number"
                            value={formData.multiplicador_stock}
                            onChange={handleChange}
                            placeholder="1"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Ej: 20 si esta entrada es una Caja que descuenta 20 polos.
                        </p>
                    </div>
                    <div className="space-y-2 sm:col-span-3 border-t pt-4 mt-2">
                        <Label htmlFor="vinculado_a_id">Vincular a producto base (Opcional)</Label>
                        <Select
                            value={formData.vinculado_a_id || "none"}
                            onValueChange={(value) => handleSelectChange("vinculado_a_id", value === "none" ? "" : value)}
                        >
                            <SelectTrigger id="vinculado_a_id">
                                <SelectValue placeholder="No vincular (este es un producto base)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ninguno (Producto independiente)</SelectItem>
                                {allProductos?.filter(p => p.id !== producto?.id).map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Si vinculas este producto (ej: Caja) a otro (ej: Polo), las ventas descontarán del stock del producto vinculado.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Precio y configuración */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Tag className="h-5 w-5" />
                        Precio y configuración
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="precio" required>
                            Precio (€)
                        </Label>
                        <Input
                            id="precio"
                            name="precio"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.precio}
                            onChange={handleChange}
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="unidad" required>
                            Unidad de medida
                        </Label>
                        <Select
                            value={formData.unidad}
                            onValueChange={(value) => handleSelectChange("unidad", value)}
                        >
                            <SelectTrigger id="unidad">
                                <SelectValue placeholder="Seleccionar unidad" />
                            </SelectTrigger>
                            <SelectContent>
                                {UNIDADES.map((unidad) => (
                                    <SelectItem key={unidad.value} value={unidad.value}>
                                        {unidad.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="igic" required>
                            IGIC (%)
                        </Label>
                        <Select
                            value={formData.igic.toString()}
                            onValueChange={(value) => handleSelectChange("igic", value)}
                        >
                            <SelectTrigger id="igic">
                                <SelectValue placeholder="Seleccionar IGIC" />
                            </SelectTrigger>
                            <SelectContent>
                                {IGIC_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value.toString()}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="categoria">Categoría</Label>
                        <Input
                            id="categoria"
                            name="categoria"
                            value={formData.categoria}
                            onChange={handleChange}
                            placeholder="Ej: Frutas, Verduras, etc."
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel || (() => router.back())}
                    disabled={isLoading}
                >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                </Button>
                <Button type="submit" loading={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Guardar cambios" : "Crear producto"}
                </Button>
            </div>
        </form>
    )
}
