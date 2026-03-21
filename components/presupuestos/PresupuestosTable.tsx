"use client"

import { useState } from "react"
import Link from "next/link"
import { MoreHorizontal, Eye, Pencil, Send, CheckCircle, XCircle, FileText, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Presupuesto, EstadoPresupuesto } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PresupuestosTableProps {
    presupuestos: (Presupuesto & { cliente?: { nombre: string; persona_contacto?: string; email?: string | null } })[]
}

function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

function formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function getEstadoVariant(estado: EstadoPresupuesto): string {
    const map: Record<EstadoPresupuesto, string> = {
        borrador: "borrador",
        enviado: "emitida",
        aceptado: "cobrada",
        rechazado: "anulada",
        facturado: "facturado",
    }
    return map[estado]
}

function getEstadoLabel(estado: EstadoPresupuesto): string {
    const labels: Record<EstadoPresupuesto, string> = {
        borrador: "Borrador",
        enviado: "Enviado",
        aceptado: "Aceptado",
        rechazado: "Rechazado",
        facturado: "Facturado",
    }
    return labels[estado]
}

export function PresupuestosTable({ presupuestos }: PresupuestosTableProps) {
    const router = useRouter()
    const supabase = createClient()
    const [isActionLoading, setIsActionLoading] = useState(false)

    const totalVisible = presupuestos.reduce((sum, p) => sum + (p.total || 0), 0)

    const handleCambiarEstado = async (id: string, nuevoEstado: EstadoPresupuesto) => {
        setIsActionLoading(true)
        try {
            const { error } = await supabase
                .from("presupuestos")
                .update({ estado: nuevoEstado })
                .eq("id", id)

            if (error) throw error

            toast({
                title: "Estado actualizado",
                description: `Presupuesto marcado como ${getEstadoLabel(nuevoEstado).toLowerCase()}`,
                variant: "success",
            })
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Error al cambiar estado",
                variant: "destructive",
            })
        } finally {
            setIsActionLoading(false)
        }
    }

    return (
        <div className="space-y-2">
            {/* Summary bar */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm">
                <span className="text-muted-foreground">
                    {presupuestos.length} presupuesto{presupuestos.length !== 1 ? 's' : ''}
                </span>
                <span className="font-medium">
                    Total: {formatPrecio(totalVisible)}
                </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Número</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Validez</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Estado</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {presupuestos.map((presupuesto) => (
                            <tr
                                key={presupuesto.id}
                                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <Link
                                        href={`/presupuestos/${presupuesto.id}`}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {presupuesto.numero}
                                    </Link>
                                </td>
                                <td className="px-4 py-3">
                                    <div>
                                        <span className="font-medium">{presupuesto.cliente?.nombre || "—"}</span>
                                        {presupuesto.cliente?.persona_contacto && (
                                            <span className="block text-xs text-muted-foreground">
                                                {presupuesto.cliente.persona_contacto}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {formatFecha(presupuesto.fecha)}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {presupuesto.fecha_validez ? (
                                        <span className={
                                            new Date(presupuesto.fecha_validez) < new Date()
                                                ? "text-red-500"
                                                : ""
                                        }>
                                            {formatFecha(presupuesto.fecha_validez)}
                                        </span>
                                    ) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums">
                                    {formatPrecio(presupuesto.total)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Badge variant={getEstadoVariant(presupuesto.estado) as any} dot>
                                        {getEstadoLabel(presupuesto.estado)}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/presupuestos/${presupuesto.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver detalle
                                                </Link>
                                            </DropdownMenuItem>
                                            {presupuesto.estado === "borrador" && (
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/presupuestos/${presupuesto.id}?editar=true`}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            {presupuesto.estado === "borrador" && (
                                                <DropdownMenuItem onClick={() => handleCambiarEstado(presupuesto.id, "enviado")}>
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Marcar como enviado
                                                </DropdownMenuItem>
                                            )}
                                            {(presupuesto.estado === "enviado" || presupuesto.estado === "borrador") && (
                                                <>
                                                    <DropdownMenuItem onClick={() => handleCambiarEstado(presupuesto.id, "aceptado")}>
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Marcar como aceptado
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleCambiarEstado(presupuesto.id, "rechazado")}>
                                                        <XCircle className="mr-2 h-4 w-4" />
                                                        Marcar como rechazado
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            {presupuesto.estado === "facturado" && presupuesto.factura_id && (
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/facturas/${presupuesto.factura_id}`}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        Ver factura
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
