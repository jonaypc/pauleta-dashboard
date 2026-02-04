import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { CreditCard, DollarSign, TrendingUp, AlertCircle } from "lucide-react"

interface GastosStatsProps {
    totalMes: number
    totalPendiente: number
    countPendientes: number
    countTotal: number
}

export function GastosStats({ totalMes, totalPendiente, countPendientes, countTotal }: GastosStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Gasto Total (Este Mes)
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalMes)}</div>
                    <p className="text-xs text-muted-foreground">
                        {countTotal} facturas registradas
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Pendiente de Pago
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendiente)}</div>
                    <p className="text-xs text-muted-foreground">
                        {countPendientes} facturas pendientes
                    </p>
                </CardContent>
            </Card>
            {/* Se pueden añadir más cards aquí en el futuro */}
        </div>
    )
}
