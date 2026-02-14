"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Power, Package, AlertTriangle, Snowflake } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MateriaPrima } from "@/types"
import { toggleMateriaPrimaActivo } from "@/lib/actions/materias-primas"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface MateriasPrimasTableProps {
    materiasPrimas: MateriaPrima[]
}

const CATEGORIAS_LABELS: Record<string, string> = {
    fruta: "Fruta",
    insumo: "Insumo",
    embalaje: "Embalaje",
    otro: "Otro",
}

const UNIDADES_LABELS: Record<string, string> = {
    kg: "Kg",
    litros: "Litros",
    unidades: "Uds",
    gramos: "g",
    ml: "ml",
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num)
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(amount)
}

export function MateriasPrimasTable({ materiasPrimas }: MateriasPrimasTableProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState<string | null>(null)

    const handleToggleActivo = async (materia: MateriaPrima) => {
        setLoading(materia.id)
        const result = await toggleMateriaPrimaActivo(materia.id, !materia.activo)

        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            })
        } else {
            toast({
                title: materia.activo ? "Materia prima desactivada" : "Materia prima activada",
                description: `${materia.nombre} ha sido ${materia.activo ? "desactivada" : "activada"}`,
            })
            router.refresh()
        }
        setLoading(null)
    }

    const getStockStatus = (materia: MateriaPrima) => {
        if (materia.stock_actual === 0) {
            return { label: "Sin stock", variant: "destructive" as const, icon: AlertTriangle }
        }
        if (materia.stock_actual <= materia.stock_minimo) {
            return { label: "Stock bajo", variant: "warning" as const, icon: AlertTriangle }
        }
        return { label: "Stock OK", variant: "success" as const, icon: Package }
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Código
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Nombre
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                            Categoría
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Stock Actual
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Stock Mínimo
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                            Estado Stock
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Costo Promedio
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
                    {materiasPrimas.length === 0 ? (
                        <tr>
                            <td
                                colSpan={9}
                                className="px-4 py-8 text-center text-muted-foreground"
                            >
                                No hay materias primas registradas
                            </td>
                        </tr>
                    ) : (
                        materiasPrimas.map((materia) => {
                            const stockStatus = getStockStatus(materia)
                            const StatusIcon = stockStatus.icon

                            return (
                                <tr
                                    key={materia.id}
                                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-medium">
                                                {materia.codigo}
                                            </span>
                                            {materia.requiere_refrigeracion && (
                                                <Snowflake className="h-3 w-3 text-blue-500" aria-label="Requiere refrigeración" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-foreground">
                                            {materia.nombre}
                                        </div>
                                        {materia.proveedor && (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                Proveedor: {materia.proveedor.nombre}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Badge variant="outline" className="text-xs">
                                            {CATEGORIAS_LABELS[materia.categoria] || materia.categoria}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-medium tabular-nums ${materia.stock_actual <= materia.stock_minimo
                                            ? 'text-destructive font-bold'
                                            : 'text-foreground'
                                            }`}>
                                            {formatNumber(materia.stock_actual)} {UNIDADES_LABELS[materia.unidad_medida]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                                        {formatNumber(materia.stock_minimo)} {UNIDADES_LABELS[materia.unidad_medida]}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <StatusIcon className={`h-4 w-4 ${stockStatus.variant === 'destructive' ? 'text-red-500' :
                                                stockStatus.variant === 'warning' ? 'text-amber-500' :
                                                    'text-green-500'
                                                }`} />
                                            <span className={`text-xs font-medium ${stockStatus.variant === 'destructive' ? 'text-red-600' :
                                                stockStatus.variant === 'warning' ? 'text-amber-600' :
                                                    'text-green-600'
                                                }`}>
                                                {stockStatus.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                                        {formatCurrency(materia.costo_promedio)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Badge
                                            variant={materia.activo ? "success" : "secondary"}
                                            className="text-xs"
                                        >
                                            {materia.activo ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-muted"
                                                    disabled={loading === materia.id}
                                                >
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem
                                                    onClick={() => router.push(`/produccion/materias-primas/${materia.id}`)}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleToggleActivo(materia)}
                                                    className="cursor-pointer"
                                                >
                                                    <Power className="mr-2 h-4 w-4" />
                                                    {materia.activo ? "Desactivar" : "Activar"}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
    )
}
