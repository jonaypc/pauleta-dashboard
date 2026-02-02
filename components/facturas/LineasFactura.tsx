"use client"

import { Plus, Trash2 } from "lucide-react"
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
import type { Producto, LineaFacturaFormData } from "@/types"

interface LineasFacturaProps {
    lineas: LineaFacturaFormData[]
    productos: Producto[]
    onChange: (lineas: LineaFacturaFormData[]) => void
    disabled?: boolean
}

const IGIC_OPTIONS = [
    { value: 0, label: "0%" },
    { value: 3, label: "3%" },
    { value: 7, label: "7%" },
]

// Formatea precio
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

export function LineasFactura({
    lineas,
    productos,
    onChange,
    disabled = false,
}: LineasFacturaProps) {
    const handleAddLinea = () => {
        onChange([
            ...lineas,
            {
                producto_id: undefined,
                descripcion: "",
                cantidad: 1,
                precio_unitario: 0,
                igic: 7,
            },
        ])
    }

    const handleRemoveLinea = (index: number) => {
        const newLineas = lineas.filter((_, i) => i !== index)
        onChange(newLineas)
    }

    const handleLineaChange = (
        index: number,
        field: keyof LineaFacturaFormData,
        value: string | number
    ) => {
        const newLineas = [...lineas]
        newLineas[index] = { ...newLineas[index], [field]: value }
        onChange(newLineas)
    }

    const handleProductoSelect = (index: number, productoId: string) => {
        const producto = productos.find((p) => p.id === productoId)
        if (producto) {
            const newLineas = [...lineas]
            newLineas[index] = {
                ...newLineas[index],
                producto_id: productoId,
                descripcion: producto.nombre,
                precio_unitario: producto.precio,
                igic: producto.igic,
            }
            onChange(newLineas)
        }
    }

    const calcularSubtotal = (linea: LineaFacturaFormData): number => {
        return linea.cantidad * linea.precio_unitario
    }

    const calcularTotalLinea = (linea: LineaFacturaFormData): number => {
        const subtotal = calcularSubtotal(linea)
        return subtotal + subtotal * (linea.igic / 100)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Líneas de factura</Label>
                {!disabled && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddLinea}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Añadir línea
                    </Button>
                )}
            </div>

            {lineas.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No hay líneas. Añade productos a la factura.
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Header */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
                        <div className="col-span-4">Producto / Descripción</div>
                        <div className="col-span-2 text-center">Cantidad</div>
                        <div className="col-span-2 text-right">Precio</div>
                        <div className="col-span-1 text-center">IGIC</div>
                        <div className="col-span-2 text-right">Subtotal</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Líneas */}
                    {lineas.map((linea, index) => (
                        <div
                            key={index}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border bg-card p-3"
                        >
                            {/* Producto */}
                            <div className="sm:col-span-4">
                                <Select
                                    value={linea.producto_id || ""}
                                    onValueChange={(value) => handleProductoSelect(index, value)}
                                    disabled={disabled}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccionar producto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productos.map((producto) => (
                                            <SelectItem key={producto.id} value={producto.id}>
                                                {producto.nombre} - {formatPrecio(producto.precio)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    value={linea.descripcion}
                                    onChange={(e) =>
                                        handleLineaChange(index, "descripcion", e.target.value)
                                    }
                                    placeholder="Descripción"
                                    className="mt-2"
                                    disabled={disabled}
                                />
                            </div>

                            {/* Cantidad */}
                            <div className="sm:col-span-2">
                                <Label className="sm:hidden text-xs text-muted-foreground">
                                    Cantidad
                                </Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={linea.cantidad}
                                    onChange={(e) =>
                                        handleLineaChange(
                                            index,
                                            "cantidad",
                                            parseFloat(e.target.value) || 0
                                        )
                                    }
                                    className="text-center"
                                    disabled={disabled}
                                />
                            </div>

                            {/* Precio */}
                            <div className="sm:col-span-2">
                                <Label className="sm:hidden text-xs text-muted-foreground">
                                    Precio
                                </Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={linea.precio_unitario}
                                    onChange={(e) =>
                                        handleLineaChange(
                                            index,
                                            "precio_unitario",
                                            parseFloat(e.target.value) || 0
                                        )
                                    }
                                    className="text-right"
                                    disabled={disabled}
                                />
                            </div>

                            {/* IGIC */}
                            <div className="sm:col-span-1">
                                <Label className="sm:hidden text-xs text-muted-foreground">
                                    IGIC
                                </Label>
                                <Select
                                    value={linea.igic.toString()}
                                    onValueChange={(value) =>
                                        handleLineaChange(index, "igic", parseInt(value))
                                    }
                                    disabled={disabled}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
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

                            {/* Subtotal */}
                            <div className="sm:col-span-2 text-right">
                                <Label className="sm:hidden text-xs text-muted-foreground">
                                    Subtotal
                                </Label>
                                <div className="font-medium tabular-nums">
                                    {formatPrecio(calcularSubtotal(linea))}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    +{formatPrecio(calcularSubtotal(linea) * (linea.igic / 100))}{" "}
                                    IGIC
                                </div>
                            </div>

                            {/* Eliminar */}
                            <div className="sm:col-span-1 flex justify-end">
                                {!disabled && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveLinea(index)}
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
