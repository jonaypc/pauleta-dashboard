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
import { ExternalLink, FileText, Search, X } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency } from "@/lib/utils"
import { CATEGORIAS_GASTOS } from "./constants"

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
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [categoryFilter, setCategoryFilter] = useState("all")

    // Filtrado
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

    if (gastos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
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
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-lg border">
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

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredGastos.length}</span> gastos
                    <span>•</span>
                    <span>Total: <span className="font-bold text-foreground">{formatCurrency(totalFiltered)}</span></span>
                </div>
            </div>

            {/* Tabla */}
            <div className="rounded-md border bg-card">
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
                        {filteredGastos.length > 0 ? (
                            filteredGastos.map((gasto) => (
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
                                    <TableCell>
                                        <Badge
                                            variant={gasto.estado === "pagado" ? "default" : "secondary"}
                                            className={
                                                gasto.estado === "pagado"
                                                    ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                                                    : "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"
                                            }
                                        >
                                            {gasto.estado === "pagado" ? "PAGADO" : "PENDIENTE"}
                                        </Badge>
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
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No se encontraron gastos con estos filtros.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
