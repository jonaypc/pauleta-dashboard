"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, ArrowUpRight, ArrowDownLeft, Link as LinkIcon, Filter } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { BankMovement } from "@/lib/actions/tesoreria"

interface MovementsListProps {
    initialMovements: any[]
}

export function MovementsList({ initialMovements }: MovementsListProps) {
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

    const filteredMovements = useMemo(() => {
        return initialMovements.filter(m => {
            if (filter === 'income') return m.importe > 0
            if (filter === 'expense') return m.importe < 0
            return true
        })
    }, [initialMovements, filter])

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Movimientos Bancarios Pendientes</CardTitle>
                        <CardDescription>Facturas encontradas con el mismo importe aparecerán aquí.</CardDescription>
                    </div>
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-[400px]">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">Todos</TabsTrigger>
                            <TabsTrigger value="income" className="text-green-700 data-[state=active]:bg-green-100">Ingresos</TabsTrigger>
                            <TabsTrigger value="expense" className="text-red-700 data-[state=active]:bg-red-100">Gastos</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {filteredMovements.length === 0 ? (
                        <div className="py-12 text-center">
                            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                            <p className="text-muted-foreground">No hay movimientos {filter !== 'all' ? 'de este tipo ' : ''}pendientes.</p>
                            {initialMovements.length === 0 && (
                                <p className="text-xs text-muted-foreground mt-1">Importa un extracto para comenzar.</p>
                            )}
                        </div>
                    ) : (
                        filteredMovements.map((move: any) => (
                            <div key={move.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4">
                                <div className="flex gap-4 items-center">
                                    <div className={`p-2 rounded-full ${move.importe > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {move.importe > 0 ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownLeft className="h-4 w-4 text-red-600" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm leading-none mb-1">{move.descripcion}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{formatDate(move.fecha)}</span>
                                            {move.referencia && <Badge variant="outline" className="text-[10px] py-0">{move.referencia}</Badge>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className={`font-bold tabular-nums ${move.importe > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                            {formatCurrency(move.importe)}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="outline" className="gap-2" asChild>
                                        <Link href={`/tesoreria/conciliar/${move.id}`}>
                                            <LinkIcon className="h-3 w-3" /> Conciliar
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
