import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'
import { PresupuestoForm } from "@/components/presupuestos/PresupuestoForm"
import { SendPresupuestoEmailButton } from "@/components/presupuestos/SendPresupuestoEmailButton"
import { ConvertirAFacturaButton } from "@/components/presupuestos/ConvertirAFacturaButton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
    ArrowLeft,
    Pencil,
    FileText,
    User,
    Calendar,
    Calculator,
    Printer,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { EstadoPresupuesto } from "@/types"

interface PageProps {
    params: { id: string }
    searchParams: { editar?: string }
}

function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

function getEstadoVariant(estado: EstadoPresupuesto): string {
    const map: Record<EstadoPresupuesto, string> = {
        borrador: "borrador",
        enviado: "emitida",
        aceptado: "cobrada",
        rechazado: "anulada",
        facturado: "facturado",
    }
    return map[estado]
}

function getEstadoLabel(estado: EstadoPresupuesto): string {
    const labels: Record<EstadoPresupuesto, string> = {
        borrador: "Borrador",
        enviado: "Enviado",
        aceptado: "Aceptado",
        rechazado: "Rechazado",
        facturado: "Facturado",
    }
    return labels[estado]
}

export async function generateMetadata({ params }: PageProps) {
    const supabase = await createClient()
    const { data: presupuesto } = await supabase
        .from("presupuestos")
        .select("numero")
        .eq("id", params.id)
        .single()

    return {
        title: presupuesto?.numero || "Presupuesto",
    }
}

export default async function PresupuestoDetailPage({
    params,
    searchParams,
}: PageProps) {
    const supabase = await createClient()
    const isEditing = searchParams.editar === "true"
    const id = params.id

    const { data: presupuesto, error } = await supabase
        .from("presupuestos")
        .select(`
            *,
            cliente:clientes(*),
            lineas:lineas_presupuesto(*, producto:productos(nombre))
        `)
        .eq("id", id)
        .single()

    if (error) {
        return (
            <div className="p-8 bg-red-50 border border-red-200 rounded-lg m-4">
                <h1 className="text-2xl font-bold text-red-800 mb-4">Error al cargar presupuesto</h1>
                <p className="text-red-600 mb-2"><strong>ID solicitado:</strong> {id}</p>
                <p className="text-red-600 mb-2"><strong>Mensaje:</strong> {String(error.message || 'N/A')}</p>
            </div>
        )
    }

    if (!presupuesto) {
        return (
            <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
                <h1 className="text-2xl font-bold text-yellow-800 mb-4">Presupuesto no encontrado</h1>
                <p className="text-yellow-600"><strong>ID solicitado:</strong> {id}</p>
            </div>
        )
    }

    // Si está editando, cargar clientes y productos
    if (isEditing) {
        const { data: clientes } = await supabase
            .from("clientes")
            .select("*")
            .eq("activo", true)
            .order("nombre")

        const { data: productos } = await supabase
            .from("productos")
            .select("*")
            .eq("activo", true)
            .order("nombre")

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/presupuestos/${id}`}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Editar presupuesto
                        </h1>
                        <p className="text-muted-foreground">{presupuesto.numero}</p>
                    </div>
                </div>

                <PresupuestoForm
                    presupuesto={presupuesto}
                    clientes={clientes || []}
                    productos={productos || []}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/presupuestos">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {presupuesto.numero}
                            </h1>
                            <Badge
                                variant={getEstadoVariant(presupuesto.estado) as any}
                                dot
                            >
                                {getEstadoLabel(presupuesto.estado)}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            Fecha: {formatDate(presupuesto.fecha)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <SendPresupuestoEmailButton
                        presupuestoId={id}
                        clienteEmail={presupuesto.cliente?.email}
                    />
                    {(presupuesto.estado === "borrador" || presupuesto.estado === "enviado") && (
                        <Button variant="outline" asChild>
                            <Link href={`/presupuestos/${id}?editar=true`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                            </Link>
                        </Button>
                    )}
                    {presupuesto.estado === "aceptado" && (
                        <ConvertirAFacturaButton
                            presupuestoId={id}
                            presupuestoNumero={presupuesto.numero}
                        />
                    )}
                    {presupuesto.estado === "facturado" && presupuesto.factura_id && (
                        <Button variant="outline" asChild>
                            <Link href={`/facturas/${presupuesto.factura_id}`}>
                                <FileText className="mr-2 h-4 w-4" />
                                Ver factura
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Grid de información */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Columna principal */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Cliente */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5" />
                                Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {presupuesto.cliente ? (
                                <div className="space-y-1">
                                    <p className="font-medium">{presupuesto.cliente.nombre}</p>
                                    {presupuesto.cliente.cif && (
                                        <p className="text-sm text-muted-foreground">
                                            CIF: {presupuesto.cliente.cif}
                                        </p>
                                    )}
                                    {presupuesto.cliente.direccion && (
                                        <p className="text-sm text-muted-foreground">
                                            {presupuesto.cliente.direccion}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Sin cliente asignado</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Líneas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5" />
                                Líneas del presupuesto
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-2 text-left font-medium text-muted-foreground">
                                                Descripción
                                            </th>
                                            <th className="py-2 text-center font-medium text-muted-foreground">
                                                Cant.
                                            </th>
                                            <th className="py-2 text-right font-medium text-muted-foreground">
                                                Precio
                                            </th>
                                            <th className="py-2 text-center font-medium text-muted-foreground">
                                                IGIC
                                            </th>
                                            <th className="py-2 text-right font-medium text-muted-foreground">
                                                Subtotal
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {presupuesto.lineas?.map((linea: any) => (
                                            <tr key={linea.id} className="border-b last:border-b-0">
                                                <td className="py-2">{linea.descripcion}</td>
                                                <td className="py-2 text-center">{linea.cantidad}</td>
                                                <td className="py-2 text-right tabular-nums">
                                                    {formatPrecio(linea.precio_unitario)}
                                                </td>
                                                <td className="py-2 text-center">{linea.igic}%</td>
                                                <td className="py-2 text-right font-medium tabular-nums">
                                                    {formatPrecio(linea.subtotal)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notas */}
                    {presupuesto.notas && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Notas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-muted-foreground">
                                    {presupuesto.notas}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Totales */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calculator className="h-5 w-5" />
                                Totales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Base imponible</span>
                                <span className="font-medium tabular-nums">
                                    {formatPrecio(presupuesto.base_imponible)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">IGIC</span>
                                <span className="font-medium tabular-nums">
                                    {formatPrecio(presupuesto.igic)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t pt-3">
                                <span className="text-lg font-semibold">Total</span>
                                <span className="text-lg font-bold text-primary tabular-nums">
                                    {formatPrecio(presupuesto.total)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5" />
                                Información
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estado</span>
                                <Badge variant={getEstadoVariant(presupuesto.estado) as any}>
                                    {getEstadoLabel(presupuesto.estado)}
                                </Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Fecha</span>
                                <span>{formatDate(presupuesto.fecha)}</span>
                            </div>
                            {presupuesto.fecha_validez && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Válido hasta</span>
                                    <span className={
                                        new Date(presupuesto.fecha_validez) < new Date()
                                            ? "text-red-500 font-medium"
                                            : ""
                                    }>
                                        {formatDate(presupuesto.fecha_validez)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Creado</span>
                                <span>{formatDate(presupuesto.created_at)}</span>
                            </div>
                            {presupuesto.factura_id && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Factura</span>
                                    <Link
                                        href={`/facturas/${presupuesto.factura_id}`}
                                        className="text-primary hover:underline font-medium"
                                    >
                                        Ver factura
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
