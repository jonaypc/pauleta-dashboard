"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

interface TreasuryKPIsProps {
    saldoActual: number
    ingresosPendientes: number
    gastosPendientes: number
    proyeccion30dias: number
    movimientosSinConciliar: number
}

export function TreasuryKPIs({
    saldoActual,
    ingresosPendientes,
    gastosPendientes,
    proyeccion30dias,
    movimientosSinConciliar
}: TreasuryKPIsProps) {
    const liquidezSaludable = saldoActual > gastosPendientes
    const proyeccionPositiva = proyeccion30dias > 0

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Saldo Actual / Liquidez */}
            <Card className={`${liquidezSaludable ? 'bg-green-50/50 border-green-200' : 'bg-amber-50/50 border-amber-200'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Liquidez Actual</CardTitle>
                    <Wallet className={`h-4 w-4 ${liquidezSaludable ? 'text-green-600' : 'text-amber-600'}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${liquidezSaludable ? 'text-green-700' : 'text-amber-700'}`}>
                        {formatCurrency(saldoActual)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {liquidezSaludable ? (
                            <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" /> Posición saludable
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-3 w-3" /> Requiere atención
                            </span>
                        )}
                    </p>
                </CardContent>
            </Card>

            {/* Ingresos Pendientes */}
            <Card className="bg-blue-50/50 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-700">
                        {formatCurrency(ingresosPendientes)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Facturas emitidas pendientes
                    </p>
                </CardContent>
            </Card>

            {/* Gastos Pendientes */}
            <Card className="bg-red-50/50 border-red-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-700">
                        {formatCurrency(gastosPendientes)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Gastos pendientes de pago
                    </p>
                </CardContent>
            </Card>

            {/* Proyección 30 días */}
            <Card className={`${proyeccionPositiva ? 'bg-slate-50/50 border-slate-200' : 'bg-amber-50/50 border-amber-200'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Proyección 30d</CardTitle>
                    {proyeccionPositiva ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-amber-600" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${proyeccionPositiva ? 'text-slate-900' : 'text-amber-700'}`}>
                        {formatCurrency(proyeccion30dias)}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                            Liquidez estimada
                        </p>
                        {movimientosSinConciliar > 0 && (
                            <Link href="/tesoreria">
                                <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 cursor-pointer">
                                    {movimientosSinConciliar} sin conciliar
                                </Badge>
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
