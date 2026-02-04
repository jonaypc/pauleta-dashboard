"use client"

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
import { ExternalLink, FileText, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency } from "@/lib/utils"

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
        <div className="rounded-md border">
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
                    {gastos.map((gasto) => (
                        <TableRow key={gasto.id}>
                            <TableCell>{formatDate(gasto.fecha)}</TableCell>
                            <TableCell className="font-medium">
                                {gasto.proveedor?.nombre || "Sin proveedor"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                                {gasto.numero || "-"}
                            </TableCell>
                            <TableCell>
                                {gasto.categoria && (
                                    <Badge variant="outline">{gasto.categoria}</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={gasto.estado === "pagado" ? "default" : "secondary"}
                                    className={
                                        gasto.estado === "pagado"
                                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                    }
                                >
                                    {gasto.estado === "pagado" ? "PAGADO" : "PENDIENTE"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold tabular-nums">
                                {formatCurrency(gasto.importe)}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {gasto.archivo_url && (
                                        <Button size="icon" variant="ghost" asChild>
                                            <a href={gasto.archivo_url} target="_blank" rel="noopener noreferrer">
                                                <FileText className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
                                    <Button size="icon" variant="ghost" asChild>
                                        <Link href={`/gastos/${gasto.id}`}>
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
