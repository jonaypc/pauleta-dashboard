"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, TrendingDown, TrendingUp, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FiscalidadPage() {
    const [period, setPeriod] = useState("month") // month, quarter, year
    const [stats, setStats] = useState({
        repercutido: 0, // Ventas (lo que cobramos de IGIC)
        soportado: 0,   // Compras (lo que pagamos de IGIC)
        neto: 0,
        baseVentas: 0,
        baseCompras: 0
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function loadStats() {
            setIsLoading(true)
            const supabase = createClient()

            // Definir rango de fechas según selección
            const now = new Date()
            let startDate = new Date()
            let endDate = new Date()

            if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            } else if (period === 'quarter') {
                const q = Math.floor((now.getMonth() + 3) / 3)
                startDate = new Date(now.getFullYear(), (q - 1) * 3, 1)
                endDate = new Date(now.getFullYear(), q * 3, 0)
            } else if (period === 'year') {
                startDate = new Date(now.getFullYear(), 0, 1)
                endDate = new Date(now.getFullYear(), 11, 31)
            }

            const startStr = startDate.toISOString().split('T')[0]
            const endsStr = endDate.toISOString().split('T')[0]

            // 1. IGIC Repercutido (Facturas Emitidas)
            // Asumimos que facturas.igic es el IMPORTE del impuesto. Si no, habría que calcularlo (base * 0.07).
            // Pero en el esquema actual: total, base_imponible, igic (importe)
            const { data: facturas } = await supabase
                .from("facturas")
                .select("base_imponible, igic, estado")
                .neq("estado", "anulada") // ignorar anuladas
                .gte("fecha", startStr)
                .lte("fecha", endsStr)

            const totalRepercutido = facturas?.reduce((acc, f) => acc + (f.igic || 0), 0) || 0
            const totalBaseVentas = facturas?.reduce((acc, f) => acc + (f.base_imponible || 0), 0) || 0

            // 2. IGIC Soportado (Gastos)
            const { data: gastos } = await supabase
                .from("gastos")
                .select("base_imponible, impuestos") // 'impuestos' es la columna nueva para el amount
                .gte("fecha", startStr)
                .lte("fecha", endsStr)

            const totalSoportado = gastos?.reduce((acc, g) => acc + (g.impuestos || 0), 0) || 0
            const totalBaseCompras = gastos?.reduce((acc, g) => acc + (g.base_imponible || 0), 0) || 0

            setStats({
                repercutido: totalRepercutido,
                soportado: totalSoportado,
                neto: totalRepercutido - totalSoportado,
                baseVentas: totalBaseVentas,
                baseCompras: totalBaseCompras
            })
            setIsLoading(false)
        }

        loadStats()
    }, [period])

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fiscalidad (IGIC)</h1>
                    <p className="text-muted-foreground">
                        Resumen de impuestos repercutidos y soportados (Modelo 420)
                    </p>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="month">Este Mes</SelectItem>
                        <SelectItem value="quarter">Este Trimestre</SelectItem>
                        <SelectItem value="year">Este Año</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Resultado Neto */}
            <Card className={stats.neto > 0 ? "border-l-4 border-l-red-500" : "border-l-4 border-l-green-500"}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Resultado a Liquidar</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <span className={`text-4xl font-bold ${stats.neto > 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(Math.abs(stats.neto))}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">
                            {stats.neto > 0 ? "A Pagar (Hacienda)" : "A Devolver / Compensar"}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                {/* IGIC Repercutido (Ventas) */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">IGIC Repercutido (Ventas)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{formatCurrency(stats.repercutido)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Sobre una base de {formatCurrency(stats.baseVentas)}
                        </p>
                    </CardContent>
                </Card>

                {/* IGIC Soportado (Gastos) */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">IGIC Soportado (Gastos)</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{formatCurrency(stats.soportado)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Sobre una base de {formatCurrency(stats.baseCompras)}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
