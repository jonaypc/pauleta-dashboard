import { createClient } from "@/lib/supabase/server"
import { CobrosTable } from "@/components/cobros/CobrosTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CreditCard, TrendingUp } from "lucide-react"
import { RegistrarCobroButton } from "@/components/cobros/RegistrarCobroButton"

export const metadata = {
    title: "Cobros",
}

// Formatea precio
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

export default async function CobrosPage() {
    const supabase = await createClient()

    // Obtener cobros con relaciones
    const { data: cobros } = await supabase
        .from("cobros")
        .select(`
      *,
      factura:facturas(
        numero,
        cliente:clientes(nombre)
      )
    `)
        .order("fecha", { ascending: false })
        .limit(100)

    // Obtener estadísticas de cobros del mes
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const { data: cobrosMes } = await supabase
        .from("cobros")
        .select("importe")
        .gte("fecha", inicioMes.toISOString().split("T")[0])

    const totalCobrosMes = cobrosMes?.reduce((sum, c) => sum + c.importe, 0) || 0

    // Obtener facturas pendientes de cobro
    const { data: facturasPendientes } = await supabase
        .from("facturas")
        .select("total")
        .eq("estado", "emitida")

    const totalPendiente =
        facturasPendientes?.reduce((sum, f) => sum + f.total, 0) || 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cobros</h1>
                    <p className="text-muted-foreground">
                        Historial de cobros de Pauleta Canaria
                    </p>
                </div>
                <RegistrarCobroButton />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Cobros este mes
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatPrecio(totalCobrosMes)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {cobrosMes?.length || 0} cobros registrados
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pendiente de cobro
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {formatPrecio(totalPendiente)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {facturasPendientes?.length || 0} facturas emitidas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabla de cobros */}
            <div>
                <h2 className="mb-4 text-lg font-semibold">Últimos cobros</h2>
                {cobros && cobros.length > 0 ? (
                    <CobrosTable cobros={cobros} />
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                        <div className="rounded-full bg-muted p-4">
                            <CreditCard className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">No hay cobros</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Los cobros aparecerán aquí cuando registres pagos de facturas
                        </p>
                        <Button asChild className="mt-4" variant="outline">
                            <Link href="/facturas?estado=emitida">Ver facturas emitidas</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
