"use client"

import { useState } from "react"
import { MoreHorizontal, Eye, Pencil, Power } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Producto } from "@/types"

interface ProductosTableProps {
    productos: Producto[]
    onView?: (producto: Producto) => void
    onEdit?: (producto: Producto) => void
    onToggleActive?: (producto: Producto) => void
}

// Formatea el precio con el símbolo del euro
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

// Mapea la unidad a texto legible
function formatUnidad(unidad: string): string {
    const unidades: Record<string, string> = {
        unidad: "Unidad",
        caja: "Caja",
        kg: "Kg",
    }
    return unidades[unidad] || unidad
}

export function ProductosTable({
    productos,
    onView,
    onEdit,
    onToggleActive,
}: ProductosTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Nombre
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Precio
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                            Unidad
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                            IGIC %
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                            Estado
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {productos.length === 0 ? (
                        <tr>
                            <td
                                colSpan={6}
                                className="px-4 py-8 text-center text-muted-foreground"
                            >
                                No hay productos registrados
                            </td>
                        </tr>
                    ) : (
                        productos.map((producto) => (
                            <tr
                                key={producto.id}
                                className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <div className="font-medium text-foreground">
                                        {producto.nombre}
                                    </div>
                                    {producto.descripcion && (
                                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                                            {producto.descripcion}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums">
                                    {formatPrecio(producto.precio)}
                                </td>
                                <td className="px-4 py-3 text-center text-muted-foreground">
                                    {formatUnidad(producto.unidad)}
                                </td>
                                <td className="px-4 py-3 text-center tabular-nums">
                                    {producto.igic}%
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Badge
                                        variant={producto.activo ? "cobrada" : "borrador"}
                                        className="text-xs"
                                    >
                                        {producto.activo ? "Activo" : "Inactivo"}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:bg-muted"
                                            >
                                                <span className="sr-only">Abrir menú</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem
                                                onClick={() => onView?.(producto)}
                                                className="cursor-pointer"
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                Ver
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onEdit?.(producto)}
                                                className="cursor-pointer"
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => onToggleActive?.(producto)}
                                                className="cursor-pointer"
                                            >
                                                <Power className="mr-2 h-4 w-4" />
                                                {producto.activo ? "Desactivar" : "Activar"}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
