import { createClient } from "@/lib/supabase/server"
import { GastosTable } from "@/components/gastos/GastosTable"
import { GastosStats } from "@/components/gastos/GastosStats"
import { Button } from "@/components/ui/button"
import { Plus, Import } from "lucide-react"
import Link from "next/link"

export const metadata = {
    title: "Gastos y Compras",
    description: "Control de facturas de proveedores",
}

export default async function GastosPage() {
    const supabase = await createClient()

    const { data: gastos } = await supabase
        .from("gastos")
        .select(`
            numero,
            fecha,
            importe,
            estado,
            categoria,
            archivo_url,
            monto_pagado,
            proveedor:proveedores(nombre)
        `)
        .order("fecha", { ascending: false })

    const gastosList = (gastos as any) || []

    // Cálculos para estadísticas globles (Mes actual)
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const gastosMes = gastosList.filter((g: any) => {
        const d = new Date(g.fecha)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    const totalMes = gastosMes.reduce((acc: number, curr: any) => acc + curr.importe, 0)

    // Pendientes (Globales, no solo mes)
    const pendientes = gastosList.filter((g: any) => g.estado === 'pendiente')
    const totalPendiente = pendientes.reduce((acc: number, curr: any) => acc + curr.importe, 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gastos y Compras</h1>
                    <p className="text-muted-foreground">
                        Gestiona las facturas de tus proveedores y controla el flujo de caja.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/gastos/importar">
                            <Import className="mr-2 h-4 w-4" />
                            Buzón / Importar
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/gastos/nuevo">
                            <Plus className="mr-2 h-4 w-4" />
                            Registrar Gasto
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Estadísticas */}
            <GastosStats
                totalMes={totalMes}
                totalPendiente={totalPendiente}
                countPendientes={pendientes.length}
                countTotal={gastosMes.length}
            />

            <GastosTable gastos={gastosList} />
        </div>
    )
}
