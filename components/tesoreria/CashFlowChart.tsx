"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface CashFlowChartProps {
    data: {
        mes: string
        ingresos: number
        gastos: number
        neto: number
    }[]
}

export function CashFlowChart({ data }: CashFlowChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-sm mb-2">{payload[0].payload.mes}</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-green-600">Ingresos:</span>
                            <span className="font-bold">{formatCurrency(payload[0].payload.ingresos)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-red-600">Gastos:</span>
                            <span className="font-bold">{formatCurrency(payload[0].payload.gastos)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t pt-1">
                            <span className={payload[0].payload.neto >= 0 ? "text-blue-600" : "text-amber-600"}>Neto:</span>
                            <span className="font-bold">{formatCurrency(payload[0].payload.neto)}</span>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }

    const totalNeto = data.reduce((sum, item) => sum + item.neto, 0)
    const promedioNeto = data.length > 0 ? totalNeto / data.length : 0
    const tendenciaPositiva = promedioNeto >= 0

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            {tendenciaPositiva ? (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            ) : (
                                <TrendingDown className="h-5 w-5 text-red-600" />
                            )}
                            Flujo de Caja (6 meses)
                        </CardTitle>
                        <CardDescription>
                            Evolución de ingresos y gastos
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Promedio Neto</p>
                        <p className={`text-lg font-bold ${tendenciaPositiva ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(promedioNeto)}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="mes"
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="circle"
                        />
                        <Area
                            type="monotone"
                            dataKey="ingresos"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorIngresos)"
                            name="Ingresos"
                        />
                        <Area
                            type="monotone"
                            dataKey="gastos"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorGastos)"
                            name="Gastos"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
