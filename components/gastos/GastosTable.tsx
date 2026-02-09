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
import { ExternalLink, FileText, Search, X, Trash2, Folder, ChevronDown, ChevronRight, Euro, DollarSign, Wallet, ListChecks } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency } from "@/lib/utils"
import { CATEGORIAS_GASTOS } from "./constants"
import { deleteGasto, updateGastoStatus } from "@/lib/actions/gastos"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ExpensePaymentModal } from "./ExpensePaymentModal"
import { Progress } from "@/components/ui/progress"

interface Gasto {
    id: string
    numero: string | null
    fecha: string
    importe: number
    estado: string
    categoria: string | null
    archivo_url: string | null
    monto_pagado: number
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
    const [expandedMonths, setExpandedMonths] = useState<string[]>([])

    // Estado para el modal de pagos
    const [expenseToPay, setExpenseToPay] = useState<Gasto | null>(null)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

    // Inicializar expandiendo el mes actual al cargar
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

    const handleDelete = async (id: string, numero: string | null) => {
        if (confirm(`¿Estás seguro de que quieres eliminar el gasto ${numero || ''}?`)) {
            setIsDeleting(id)
            try {
                await deleteGasto(id)
                toast({
                    description: "Gasto eliminado correctamente"
                })
                router.refresh()
            } catch (error: any) {
                console.error("Error eliminando gasto:", error)
                toast({
                    variant: "destructive",
                    title: "No se pudo eliminar el gasto",
                    description: error.message || "Error desconocido. Revisa la consola."
                })
            } finally {
                setIsDeleting(null)
            }
        }
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        setIsUpdatingStatus(id)
        try {
            await updateGastoStatus(id, newStatus)
            router.refresh()
            toast({
                description: "Estado actualizado"
            })
        } catch (error) {
            console.error("Error updating status", error)
            toast({
                variant: "destructive",
                description: "Error al actualizar estado"
            })
        } finally {
            setIsUpdatingStatus(null)
        }
    }

    const openPaymentModal = (gasto: Gasto) => {
        setExpenseToPay(gasto)
        setIsPaymentModalOpen(true)
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
    const totalPagadoFiltered = filteredGastos.reduce((acc, curr) => acc + (curr.monto_pagado || 0), 0)
    const totalPendienteFiltered = totalFiltered - totalPagadoFiltered

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
            {/* Modal de Pagos */}
            {expenseToPay && (
                <ExpensePaymentModal
                    open={isPaymentModalOpen}
                    onOpenChange={setIsPaymentModalOpen}
                    gasto={{
                        id: expenseToPay.id,
                        numero: expenseToPay.numero || "Sin número",
                        proveedor_nombre: expenseToPay.proveedor?.nombre || "Proveedor",
                        importe: expenseToPay.importe,
                        monto_pagado: expenseToPay.monto_pagado || 0
                    }}
                    onPaymentSuccess={() => {
                        router.refresh()
                    }}
                />
            )}

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
                            <SelectItem value="parcial">Parcial</SelectItem>
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

                <div className="flex items-center gap-4 text-sm bg-muted/30 px-4 py-2 rounded-md border text-muted-foreground">
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Facturado</span>
                        <span className="font-bold text-foreground text-base">{formatCurrency(totalFiltered)}</span>
                    </div>
                    <div className="h-8 w-px bg-border"></div>
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] uppercase font-bold text-green-600 mb-1">Pagado</span>
                        <span className="font-bold text-green-700 text-base">{formatCurrency(totalPagadoFiltered)}</span>
                    </div>
                    <div className="h-8 w-px bg-border"></div>
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] uppercase font-bold text-destructive mb-1">Pendiente</span>
                        <span className="font-bold text-destructive text-base">{formatCurrency(totalPendienteFiltered)}</span>
                    </div>
                </div>
            </div>

            {/* Lista Agrupada por Meses */}
            <div className="space-y-4">
                {sortedMonths.length > 0 ? (
                    sortedMonths.map(monthKey => {
                        const monthGastos = groupedGastos[monthKey]
                        const monthTotal = monthGastos.reduce((acc, curr) => acc + curr.importe, 0)
                        const monthPending = monthGastos.reduce((acc, curr) => acc + (curr.importe - (curr.monto_pagado || 0)), 0)
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
                                                {monthGastos.length} {monthGastos.length === 1 ? 'doc' : 'docs'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {monthPending > 0 && (
                                            <span className="text-sm font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                                                Pendiente: {formatCurrency(monthPending)}
                                            </span>
                                        )}
                                        <div className="font-bold text-lg tabular-nums">
                                            {formatCurrency(monthTotal)}
                                        </div>
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
                                                    <TableHead>Estado Pago</TableHead>
                                                    <TableHead className="text-right">Importe</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {monthGastos.map((gasto) => {
                                                    const pagado = gasto.monto_pagado || 0
                                                    const total = gasto.importe
                                                    const porcentaje = total > 0 ? (pagado / total) * 100 : 0
                                                    const isPartial = pagado > 0 && pagado < total

                                                    return (
                                                        <TableRow key={gasto.id}>
                                                            <TableCell className="w-[100px]">{formatDate(gasto.fecha)}</TableCell>
                                                            <TableCell className="font-medium max-w-[200px] truncate">
                                                                {gasto.proveedor?.nombre || "Sin proveedor"}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-muted-foreground w-[120px]">
                                                                {gasto.numero || "-"}
                                                            </TableCell>
                                                            <TableCell className="w-[120px]">
                                                                {gasto.categoria && (
                                                                    <Badge variant="outline" className="font-normal text-[10px] truncate max-w-full">
                                                                        {gasto.categoria}
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="w-[180px]">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge
                                                                            variant={
                                                                                gasto.estado === 'pagado' ? 'default' :
                                                                                    gasto.estado === 'parcial' ? 'secondary' :
                                                                                        'destructive'
                                                                            }
                                                                            className={
                                                                                gasto.estado === 'pagado' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                                                                    gasto.estado === 'parcial' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                                                                                        'bg-red-100 text-red-800 hover:bg-red-100'
                                                                            }
                                                                        >
                                                                            {gasto.estado === 'pagado' ? 'PAGADO' :
                                                                                gasto.estado === 'parcial' ? 'PARCIAL' :
                                                                                    'PENDIENTE'}
                                                                        </Badge>
                                                                        {gasto.estado !== 'pagado' && (
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="h-6 w-6 rounded-full hover:bg-green-100 text-green-600"
                                                                                onClick={() => openPaymentModal(gasto)}
                                                                                title="Registrar Pago"
                                                                            >
                                                                                <Wallet className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                    {isPartial && (
                                                                        <div className="w-full max-w-[140px]">
                                                                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                                                <span>{Math.round(porcentaje)}%</span>
                                                                                <span>Restan: {formatCurrency(total - pagado)}</span>
                                                                            </div>
                                                                            <Progress value={porcentaje} className="h-1.5" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums">
                                                                {formatCurrency(gasto.importe)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    {gasto.estado !== 'pagado' && (
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                            onClick={async () => {
                                                                                if (confirm("¿Marcar este gasto como completamente PAGADO hoy?")) {
                                                                                    try {
                                                                                        const { markGastoAsPaid } = await import("@/lib/actions/gastos")
                                                                                        await markGastoAsPaid(gasto.id)
                                                                                        toast({ description: "Gasto marcado como pagado" })
                                                                                    } catch (e) {
                                                                                        toast({ variant: "destructive", description: "Error al marcar como pagado" })
                                                                                    }
                                                                                }
                                                                            }}
                                                                            title="Marcar como PAGADO"
                                                                        >
                                                                            <ListChecks className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
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
                                                                        onClick={() => handleDelete(gasto.id, gasto.numero)}
                                                                        disabled={isDeleting === gasto.id}
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
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
