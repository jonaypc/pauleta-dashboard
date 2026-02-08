
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ProveedorForm } from "@/components/proveedores/ProveedorForm"
import { GastosTable } from "@/components/gastos/GastosTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, Globe, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default async function ProveedorDetallePage({ params }: { params: { id: string } }) {
    const supabase = await createClient()

    // 1. Fetch Proveedor Data
    const { data: proveedor, error: provError } = await supabase
        .from("proveedores")
        .select("*")
        .eq("id", params.id)
        .single()

    if (provError || !proveedor) {
        notFound()
    }

    // 2. Fetch Gastos asociados
    const { data: gastos } = await supabase
        .from("gastos")
        .select(`
            id,
            numero,
            fecha,
            importe,
            estado,
            categoria,
            archivo_url,
            monto_pagado,
            proveedor:proveedores(nombre)
        `)
        .eq("proveedor_id", params.id)
        .order("fecha", { ascending: false })

    const gastosList = (gastos as any) || []

    // Estadísticas
    const totalFacturado = gastosList.reduce((acc: number, curr: any) => acc + curr.importe, 0)
    const totalPagado = gastosList.reduce((acc: number, curr: any) => acc + (curr.monto_pagado || 0), 0)
    const totalPendiente = totalFacturado - totalPagado

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{proveedor.nombre}</h1>
                    <div className="flex gap-2 mt-1">
                        {proveedor.categoria_default && (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                {proveedor.categoria_default}
                            </span>
                        )}
                        <span className="text-sm text-muted-foreground">ID: {proveedor.cif || "Sin CIF"}</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Panel de Información de Contacto */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Información de Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        {proveedor.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${proveedor.email}`} className="hover:underline">{proveedor.email}</a>
                            </div>
                        )}
                        {proveedor.telefono && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a href={`tel:${proveedor.telefono}`} className="hover:underline">{proveedor.telefono}</a>
                            </div>
                        )}
                        {proveedor.direccion && (
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <span>
                                    {proveedor.direccion}<br />
                                    {proveedor.codigo_postal} {proveedor.ciudad}
                                </span>
                            </div>
                        )}
                        {proveedor.web && (
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <a href={proveedor.web} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                                    {proveedor.web.replace(/^https?:\/\//, '')}
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Panel de Estadísticas Financieras (Mini) */}
                <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalFacturado)}</div>
                            <p className="text-xs text-muted-foreground">
                                {gastosList.length} facturas registradas
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pagado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPagado)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Pendiente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalPendiente)}</div>
                        </CardContent>
                    </Card>

                    {/* Formulario de Edición Embebido (Opcional, o usar modal) */}
                    <Card className="md:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Editar Datos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ProveedorForm initialData={proveedor} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Listado de Facturas */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Historial de Facturas</h2>
                <GastosTable gastos={gastosList} />
            </div>
        </div>
    )
}
