"use client"

import { useState, useMemo } from "react"
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
import type { PagoFijo } from "@/types"

interface HistorialPago {
    id: string
    pago_fijo_id: string
    fecha_vencimiento: string
    importe: number
    estado: 'pendiente' | 'pagado' | 'anulado'
    fecha_pago?: string
}

interface ControlPagosTableProps {
    pagosDefiniciones: PagoFijo[]
    historialPagos: any[] // Tipado laxo para simplificar join
}

export function ControlPagosTable({ pagosDefiniciones, historialPagos }: ControlPagosTableProps) {
    const supabase = createClient()
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [monthOffset, setMonthOffset] = useState(0) // 0 = Current month

    // Calcular mes actual visible
    const targetDate = useMemo(() => {
        const d = new Date()
        d.setMonth(d.getMonth() + monthOffset)
        return d
    }, [monthOffset])

    // Fusionar definiciones con historial
    const pagosDelMes = useMemo(() => {
        const year = targetDate.getFullYear()
        const month = targetDate.getMonth() // 0-11

        return pagosDefiniciones
            .filter(def => def.activo) // Solo mostrar activos
            .map(def => {
                // Calcular fecha vencimiento para este mes
                // Ojo: si el día es 31 y el mes tiene 30, date choca.
                // Simple approach: Use day 28 if > daysInMonth? Or JS handles overflow.
                // Let's use Date constructor carefully.
                const dueDate = new Date(year, month, def.dia_inicio)
                const dueDateStr = format(dueDate, 'yyyy-MM-dd')

                // Buscar en historial
                const historyEntry = historialPagos.find(h => {
                    const hDate = new Date(h.fecha_vencimiento)
                    return h.pago_fijo_id === def.id &&
                        hDate.getMonth() === month &&
                        hDate.getFullYear() === year
                })

                return {
                    definition: def,
                    history: historyEntry as HistorialPago | undefined,
                    computedDate: dueDate,
                    computedDateStr: dueDateStr,
                    status: historyEntry ? historyEntry.estado : 'pendiente_virtual'
                }
            })
            .sort((a, b) => a.definition?.dia_inicio - b.definition?.dia_inicio)
    }, [pagosDefiniciones, historialPagos, targetDate])

    const handleMarcarPagado = async (item: typeof pagosDelMes[0]) => {
        setLoadingId(item.definition.id)
        try {
            if (item.history) {
                // Update existing
                const { error } = await supabase
                    .from('historial_pagos_fijos')
                    .update({
                        estado: 'pagado',
                        fecha_pago: new Date().toISOString()
                    })
                    .eq('id', item.history.id)
                if (error) throw error
            } else {
                // Create new (Upsert)
                const { error } = await supabase.from("historial_pagos_fijos").insert({
                    pago_fijo_id: item.definition.id,
                    fecha_vencimiento: item.computedDateStr,
                    importe: item.definition.importe,
                    estado: 'pagado',
                    fecha_pago: new Date().toISOString()
                })
                if (error) throw error
            }

            toast({
                title: "Pago registrado",
                description: "El pago se ha marcado como realizado correctamente.",
                variant: "success"
            })

            // Refresh page data (simple way)
            window.location.reload()

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

    // Calcular totales
    const resumen = useMemo(() => {
        return pagosDelMes.reduce(
            (acc, item) => {
                const importe = item.history ? item.history.importe : item.definition.importe

                acc.total += importe

                if (item.status === 'pagado') {
                    acc.pagado += importe
                } else {
                    acc.pendiente += importe
                }

                return acc
            },
            { total: 0, pagado: 0, pendiente: 0 }
        )
    }, [pagosDelMes])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">
                    {format(targetDate, "MMMM yyyy", { locale: es }).toUpperCase()}
                </h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMonthOffset(prev => prev - 1)}>
                        Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setMonthOffset(0)}>
                        Actual
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setMonthOffset(prev => prev + 1)}>
                        Siguiente
                    </Button>
                </div>
            </div>

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
                        {pagosDelMes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No hay pagos activos configurados para este periodo.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pagosDelMes.map((item) => (
                                <TableRow key={item.definition.id}>
                                    <TableCell className="font-medium">
                                        {item.definition.concepto}
                                    </TableCell>
                                    <TableCell>
                                        {format(item.computedDate, "d 'de' MMMM", { locale: es })}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(item.history ? item.history.importe : item.definition.importe)}
                                    </TableCell>
                                    <TableCell>
                                        {(item.status === 'pagado') && (
                                            <Badge variant="default" className="bg-green-600">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Pagado
                                            </Badge>
                                        )}
                                        {(item.status === 'pendiente' || item.status === 'pendiente_virtual') && (
                                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                                                <Clock className="w-3 h-3 mr-1" /> Pendiente
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.status !== 'pagado' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleMarcarPagado(item)}
                                                disabled={!!loadingId}
                                            >
                                                {loadingId === item.definition.id ? "..." : "Marcar Pagado"}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Resumen Financiero del Mes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-muted-foreground">Total Gastos</p>
                    <p className="text-2xl font-bold">{formatCurrency(resumen.total)}</p>
                </div>
                <div className="rounded-lg border bg-green-50 text-green-900 shadow-sm p-4 flex flex-col items-center justify-center border-green-200">
                    <p className="text-sm font-medium text-green-700 opacity-90">Total Pagado</p>
                    <p className="text-2xl font-bold">{formatCurrency(resumen.pagado)}</p>
                </div>
                <div className="rounded-lg border bg-amber-50 text-amber-900 shadow-sm p-4 flex flex-col items-center justify-center border-amber-200">
                    <p className="text-sm font-medium text-amber-700 opacity-90">Total Pendiente</p>
                    <p className="text-2xl font-bold">{formatCurrency(resumen.pendiente)}</p>
                </div>
            </div>
        </div>
    )
}
