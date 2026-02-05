"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExternalLink, FileText, Search, X, Trash2, Folder, ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency } from "@/lib/utils"
import { CATEGORIAS_GASTOS } from "./constants"
import { deleteGasto, updateGastoStatus } from "@/lib/actions/gastos"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Gasto {
    id: string
    numero: string | null
    fecha: string
    importe: number
    estado: string
    categoria: string | null
    archivo_url: string | null
    proveedor: {
        nombre: string
    } | null
}

interface GastosTableProps {
    gastos: Gasto[]
}

export function GastosTable({ gastos }: GastosTableProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
    // Estado para controlar qué meses están expandidos. Por defecto todos cerrados o el primero abierto.
    // Usaremos un Set o array de strings "YYYY-MM"
    const [expandedMonths, setExpandedMonths] = useState<string[]>([])

    // Inicializar expandiendo el mes actual al cargar (opcional, pero buena UX)
    useState(() => {
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
        setExpandedMonths([currentMonth])
    })

    const toggleMonth = (monthKey: string) => {
        setExpandedMonths(prev =>
            prev.includes(monthKey)
                ? prev.filter(m => m !== monthKey)
                : [...prev, monthKey]
        )
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.")) return

        setIsDeleting(id)
        try {
            await deleteGasto(id)
            toast({
                title: "Gasto eliminado",
                description: "El registro se ha borrado correctamente."
            })
            router.refresh()
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo eliminar el gasto.",
                variant: "destructive"
            })
        } finally {
            setIsDeleting(null)
        }
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        setIsUpdatingStatus(id)
        try {
            await updateGastoStatus(id, newStatus)
            // Toast success?
        } catch (error) {
            console.error("Error updating status", error)
        } finally {
            setIsUpdatingStatus(null)
        }
    }

    // 1. Filtrado General
    const filteredGastos = gastos.filter(gasto => {
        const matchesSearch =
            gasto.proveedor?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            gasto.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            false

        const matchesStatus = statusFilter === "all" || gasto.estado === statusFilter
        const matchesCategory = categoryFilter === "all" || gasto.categoria === categoryFilter

        return matchesSearch && matchesStatus && matchesCategory
    })

    const totalFiltered = filteredGastos.reduce((acc, curr) => acc + curr.importe, 0)

    // 2. Agrupación por Mes
    const groupedGastos = filteredGastos.reduce((groups, gasto) => {
        const monthKey = gasto.fecha.substring(0, 7) // YYYY-MM
        if (!groups[monthKey]) {
            groups[monthKey] = []
        }
        groups[monthKey].push(gasto)
        return groups
    }, {} as Record<string, Gasto[]>)

    // 3. Ordenar claves de meses (más reciente primero)
    const sortedMonths = Object.keys(groupedGastos).sort((a, b) => b.localeCompare(a))

    const getMonthLabel = (monthKey: string) => {
        const [year, month] = monthKey.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            .replace(/^\w/, c => c.toUpperCase())
    }

    if (gastos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center bg-muted/20">
                <div className="rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No hay gastos registrados</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Sube tu primera factura para empezar a controlar los gastos.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/gastos/nuevo">Registrar Gasto</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative flex-1 md:max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar proveedor o nº factura..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Filtros Dropdown */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="pagado">Pagado</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {CATEGORIAS_GASTOS.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSearchTerm("")
                                setStatusFilter("all")
                                setCategoryFilter("all")
                            }}
                            title="Limpiar filtros"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">
                    <span className="font-medium text-foreground">{filteredGastos.length}</span> resultados
                    <span>•</span>
                    <span>Total: <span className="font-bold text-foreground">{formatCurrency(totalFiltered)}</span></span>
                </div>
            </div>

            {/* Lista Agrupada por Meses */}
            <div className="space-y-4">
                {sortedMonths.length > 0 ? (
                    sortedMonths.map(monthKey => {
                        const monthGastos = groupedGastos[monthKey]
                        const monthTotal = monthGastos.reduce((acc, curr) => acc + curr.importe, 0)
                        const isExpanded = expandedMonths.includes(monthKey)

                        return (
                            <div key={monthKey} className="border rounded-lg bg-card overflow-hidden shadow-sm transition-all">
                                {/* Header del Mes (Carpeta) */}
                                <button
                                    onClick={() => toggleMonth(monthKey)}
                                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Folder className="h-5 w-5 text-blue-500 fill-blue-100" />
                                            <span className="font-semibold text-lg">{getMonthLabel(monthKey)}</span>
                                            <Badge variant="secondary" className="ml-2 font-normal">
                                                {monthGastos.length} {monthGastos.length === 1 ? 'factura' : 'facturas'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="font-bold text-lg tabular-nums">
                                        {formatCurrency(monthTotal)}
                                    </div>
                                </button>

                                {/* Contenido (Tabla) */}
                                {isExpanded && (
                                    <div className="border-t">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Proveedor</TableHead>
                                                    <TableHead>Nº Factura</TableHead>
                                                    <TableHead>Categoría</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead className="text-right">Importe</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {monthGastos.map((gasto) => (
                                                    <TableRow key={gasto.id}>
                                                        <TableCell>{formatDate(gasto.fecha)}</TableCell>
                                                        <TableCell className="font-medium">
                                                            {gasto.proveedor?.nombre || "Sin proveedor"}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {gasto.numero || "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {gasto.categoria && (
                                                                <Badge variant="outline" className="font-normal text-[10px]">
                                                                    {gasto.categoria}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                            <Select
                                                                defaultValue={gasto.estado}
                                                                onValueChange={(val) => handleStatusChange(gasto.id, val)}
                                                                disabled={isUpdatingStatus === gasto.id}
                                                            >
                                                                <SelectTrigger className={`h-7 w-[110px] text-xs font-semibold border-0 ${gasto.estado === 'pagado'
                                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
                                                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200 focus:ring-amber-500'
                                                                    }`}>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="pendiente">PENDIENTE</SelectItem>
                                                                    <SelectItem value="pagado">PAGADO</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums">
                                                            {formatCurrency(gasto.importe)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                {gasto.archivo_url && (
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" asChild title="Ver recibo">
                                                                        <a href={gasto.archivo_url} target="_blank" rel="noopener noreferrer">
                                                                            <FileText className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                )}
                                                                <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Ver detalles">
                                                                    <Link href={`/gastos/${gasto.id}`}>
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => handleDelete(gasto.id)}
                                                                    disabled={isDeleting === gasto.id}
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                        <p className="text-muted-foreground">No se encontraron gastos con estos filtros.</p>
                        <Button
                            variant="link"
                            className="mt-2"
                            onClick={() => {
                                setSearchTerm("")
                                setStatusFilter("all")
                                setCategoryFilter("all")
                            }}
                        >
                            Limpiar filtros
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
