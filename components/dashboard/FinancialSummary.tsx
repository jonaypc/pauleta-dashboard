"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingDown, TrendingUp, DollarSign, PieChart } from "lucide-react"

interface FinancialSummaryProps {
    ingresos: number
    gastosFijos: number
    gastosVariables: number
    mes: string // Nombre del mes actual
}

function formatCurrency(amount: number) {
    const num = Number(amount)
    if (!isFinite(num)) return "0,00 €"
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(num)
}

export function FinancialSummary({
    ingresos,
    gastosFijos,
    gastosVariables,
    mes,
}: FinancialSummaryProps) {
    const totalGastos = (gastosFijos || 0) + (gastosVariables || 0)
    const safeIngresos = ingresos || 0
    const resultado = safeIngresos - totalGastos
    const margen = safeIngresos > 0 ? (resultado / safeIngresos) * 100 : 0
    const esPositivo = resultado >= 0

    // Porcentajes para barras de progreso (max 100%)
    const maxVal = Math.max(safeIngresos, totalGastos) || 1
    const porcentajeIngresos = Math.min((safeIngresos / maxVal) * 100, 100)
    const porcentajeGastos = Math.min((totalGastos / maxVal) * 100, 100)

    // Porcentaje de gastos sobre ingresos (para ver salud)
    const ratioGastos = safeIngresos > 0 ? (totalGastos / safeIngresos) * 100 : 0

    const safeMargen = isFinite(margen) ? margen : 0

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Situación Financiera ({mes || "Mes"})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {/* Resultado */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Resultado Operativo</p>
                        <div className={`text-2xl font-bold ${esPositivo ? 'text-green-600' : 'text-red-600'}`}>
                            {esPositivo ? '+' : ''}{formatCurrency(resultado)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                            {esPositivo ? (
                                <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                            ) : (
                                <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                            )}
                            <span>{safeMargen.toFixed(1)}% margen</span>
                        </div>
                    </div>

                    {/* Ingresos */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                        <div className="text-2xl font-bold">{formatCurrency(safeIngresos)}</div>
                        <Progress value={porcentajeIngresos || 0} className="h-2 bg-muted" indicatorClassName="bg-blue-600" />
                    </div>

                    {/* Gastos Totales */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Gastos Totales</p>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalGastos)}</div>
                        <Progress
                            value={porcentajeGastos || 0}
                            className="h-2 bg-muted"
                            indicatorClassName={ratioGastos > 90 ? "bg-red-600" : "bg-amber-500"}
                        />
                    </div>

                    {/* Desglose Gastos */}
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center text-muted-foreground">
                                <DollarSign className="mr-1 h-3 w-3" /> Fijos
                            </span>
                            <span className="font-medium">{formatCurrency(gastosFijos)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center text-muted-foreground">
                                <TrendingDown className="mr-1 h-3 w-3" /> Variables
                            </span>
                            <span className="font-medium">{formatCurrency(gastosVariables)}</span>
                        </div>
                        <div className="text-xs text-right text-muted-foreground border-t pt-1">
                            {totalGastos > 0
                                ? `${isFinite((gastosFijos / totalGastos) * 100) ? ((gastosFijos / totalGastos) * 100).toFixed(0) : 0}% Fijos vs ${isFinite((gastosVariables / totalGastos) * 100) ? ((gastosVariables / totalGastos) * 100).toFixed(0) : 0}% Variables`
                                : "Sin gastos registrados"
                            }
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
