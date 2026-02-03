"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

interface HistorialPago {
    id: string
    fecha_vencimiento: string
    importe: number
    estado: 'pendiente' | 'pagado' | 'anulado'
    pago_fijo: {
        concepto: string
    }
}

interface ControlPagosTableProps {
    data: HistorialPago[]
}

export function ControlPagosTable({ data }: ControlPagosTableProps) {
    const supabase = createClient()
    const [pagos, setPagos] = useState(data)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleMarcarPagado = async (id: string) => {
        setLoadingId(id)
        try {
            const { error } = await supabase
                .from('historial_pagos_fijos')
                .update({
                    estado: 'pagado',
                    fecha_pago: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            setPagos(prev => prev.map(p =>
                p.id === id ? { ...p, estado: 'pagado' } : p
            ))

            toast({
                title: "Pago registrado",
                description: "El pago se ha marcado como realizado correctamente.",
                variant: "success"
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo actualizar el pago.",
                variant: "destructive"
            })
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pagos.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No hay pagos pendientes ni registrados para este periodo.
                            </TableCell>
                        </TableRow>
                    ) : (
                        pagos.map((pago) => (
                            <TableRow key={pago.id}>
                                <TableCell className="font-medium">
                                    {pago.pago_fijo?.concepto || "Pago Eliminado"}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(pago.fecha_vencimiento), "d 'de' MMMM", { locale: es })}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(pago.importe)}
                                </TableCell>
                                <TableCell>
                                    {pago.estado === 'pagado' && (
                                        <Badge variant="default" className="bg-green-600">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Pagado
                                        </Badge>
                                    )}
                                    {pago.estado === 'pendiente' && (
                                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                                            <Clock className="w-3 h-3 mr-1" /> Pendiente
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {pago.estado === 'pendiente' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleMarcarPagado(pago.id)}
                                            disabled={!!loadingId}
                                        >
                                            {loadingId === pago.id ? "Guardando..." : "Marcar Pagado"}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
