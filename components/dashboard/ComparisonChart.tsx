"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface ComparisonChartProps {
    data: {
        mes: string
        ingresos: number
        gastos: number
    }[]
}

export function ComparisonChart({ data }: ComparisonChartProps) {
    return (
        <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Comparativa de Rendimiento (Ventas vs Gastos)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis
                                dataKey="mes"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickFormatter={(value) => `${value}€`}
                            />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    fontSize: '12px'
                                }}
                            />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                            />
                            <Bar
                                name="Ingresos (Ventas)"
                                dataKey="ingresos"
                                fill="#2563eb"
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                            />
                            <Bar
                                name="Gastos"
                                dataKey="gastos"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
