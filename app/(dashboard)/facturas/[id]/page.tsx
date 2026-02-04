import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'
import { FacturaForm } from "@/components/facturas/FacturaForm"
import { SendEmailButton } from "@/components/facturas/SendEmailButton"
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
    Send,
    CheckCircle,
    XCircle,
    Printer,
    Truck,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { EstadoFactura } from "@/types"
import { CambiarClienteButton } from "@/components/facturas/CambiarClienteButton"

interface PageProps {
    params: { id: string }
    searchParams: { editar?: string }
}

// Formatea precio
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

export async function generateMetadata({ params }: PageProps) {
    const supabase = await createClient()
    const { data: factura } = await supabase
        .from("facturas")
        .select("numero")
        .eq("id", params.id)
        .single()

    return {
        title: factura?.numero || "Factura",
    }
}

export default async function FacturaDetailPage({
    params,
    searchParams,
}: PageProps) {
    const supabase = await createClient()
    const isEditing = searchParams.editar === "true"
    const id = params.id

    // Obtener factura con cliente y líneas
    const { data: factura, error } = await supabase
        .from("facturas")
        .select(`
      *,
      cliente:clientes(*),
      lineas:lineas_factura(*, producto:productos(nombre))
    `)
        .eq("id", id)
        .single()

    // DIAGNÓSTICO: Mostrar error en pantalla en vez de 404
    if (error) {
        return (
            <div className="p-8 bg-red-50 border border-red-200 rounded-lg m-4">
                <h1 className="text-2xl font-bold text-red-800 mb-4">Error al cargar factura</h1>
                <p className="text-red-600 mb-2"><strong>ID solicitado:</strong> {id}</p>
                <p className="text-red-600 mb-2"><strong>Código de error:</strong> {String(error.code || 'N/A')}</p>
                <p className="text-red-600 mb-2"><strong>Mensaje:</strong> {String(error.message || 'N/A')}</p>
                <p className="text-red-600 mb-2"><strong>Detalles:</strong> {JSON.stringify(error.details) || 'N/A'}</p>
                <p className="text-red-600"><strong>Hint:</strong> {String(error.hint || 'N/A')}</p>
                <pre className="mt-4 p-4 bg-red-100 rounded text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
            </div>
        )
    }

    if (!factura) {
        return (
            <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
                <h1 className="text-2xl font-bold text-yellow-800 mb-4">Factura no encontrada</h1>
                <p className="text-yellow-600"><strong>ID solicitado:</strong> {id}</p>
                <p className="text-yellow-600">No se encontró ninguna factura con este ID.</p>
            </div>
        )
    }

    // Cargar todos los clientes para el botón de cambiar cliente
    const { data: todosClientes } = await supabase
        .from("clientes")
        .select("id, nombre, cif, direccion, persona_contacto")
        .eq("activo", true)
        .order("nombre")

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
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/facturas/${id}`}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Editar factura
                        </h1>
                        <p className="text-muted-foreground">{factura.numero}</p>
                    </div>
                </div>

                {/* Formulario */}
                <FacturaForm
                    factura={factura}
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
                        <Link href="/facturas">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {factura.numero}
                            </h1>
                            <Badge
                                variant={factura.estado as EstadoFactura}
                                dot
                            >
                                {factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1)}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            Fecha: {formatDate(factura.fecha)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/print/facturas/${id}`} target="_blank">
                            <Printer className="mr-2 h-4 w-4" />
                            Original
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/print/facturas/${id}?copia=true`} target="_blank">
                            <Printer className="mr-2 h-4 w-4" opacity={0.5} />
                            Copia
                        </Link>
                    </Button>
                    <SendEmailButton
                        facturaId={id}
                        clienteEmail={factura.cliente?.email}
                    />
                    <Button variant="outline" asChild>
                        <Link href={`/print/albaran/${id}`} target="_blank">
                            <Truck className="mr-2 h-4 w-4" />
                            Albarán
                        </Link>
                    </Button>
                    {factura.estado === "borrador" && (
                        <>
                            <Button variant="outline" asChild>
                                <Link href={`/facturas/${id}?editar=true`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </Link>
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Send className="mr-2 h-4 w-4" />
                                Emitir
                            </Button>
                        </>
                    )}
                    {factura.estado === "emitida" && (
                        <Button className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marcar cobrada
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
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5" />
                                Cliente
                            </CardTitle>
                            <CambiarClienteButton
                                facturaId={id}
                                facturaNumero={factura.numero}
                                clienteActualId={factura.cliente?.id}
                                clientes={todosClientes || []}
                            />
                        </CardHeader>
                        <CardContent>
                            {factura.cliente ? (
                                <div className="space-y-1">
                                    <p className="font-medium">{factura.cliente.nombre}</p>
                                    {factura.cliente.cif && (
                                        <p className="text-sm text-muted-foreground">
                                            CIF: {factura.cliente.cif}
                                        </p>
                                    )}
                                    {factura.cliente.direccion && (
                                        <p className="text-sm text-muted-foreground">
                                            {factura.cliente.direccion}
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
                                Líneas de factura
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
                                        {factura.lineas?.map((linea: { id: string; descripcion: string; cantidad: number; precio_unitario: number; igic: number; subtotal: number }) => (
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
                    {factura.notas && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Notas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-muted-foreground">
                                    {factura.notas}
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
                                    {formatPrecio(factura.base_imponible)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">IGIC</span>
                                <span className="font-medium tabular-nums">
                                    {formatPrecio(factura.igic)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t pt-3">
                                <span className="text-lg font-semibold">Total</span>
                                <span className="text-lg font-bold text-primary tabular-nums">
                                    {formatPrecio(factura.total)}
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
                                <Badge variant={factura.estado as EstadoFactura}>
                                    {factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1)}
                                </Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Fecha</span>
                                <span>{formatDate(factura.fecha)}</span>
                            </div>
                            {factura.fecha_vencimiento && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Vencimiento</span>
                                    <span>{formatDate(factura.fecha_vencimiento)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Creada</span>
                                <span>{formatDate(factura.created_at)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
