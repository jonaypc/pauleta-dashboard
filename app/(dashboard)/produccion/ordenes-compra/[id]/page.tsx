import { getOrdenCompraById, updateEstadoOrdenCompra, recibirMateriales, deleteOrdenCompra } from "@/lib/actions/ordenes-compra"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { EstadoOrdenButtons } from "@/components/produccion/EstadoOrdenButtons"
import { RecibirMaterialesDialog } from "@/components/produccion/RecibirMaterialesDialog"

export const metadata = {
    title: "Detalle Orden de Compra",
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

const ESTADO_COLORS: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-700 border-gray-200",
    enviada: "bg-blue-100 text-blue-700 border-blue-200",
    confirmada: "bg-purple-100 text-purple-700 border-purple-200",
    recibida_parcial: "bg-amber-100 text-amber-700 border-amber-200",
    recibida: "bg-green-100 text-green-700 border-green-200",
    cancelada: "bg-red-100 text-red-700 border-red-200",
}

const ESTADO_LABELS: Record<string, string> = {
    borrador: "Borrador",
    enviada: "Enviada",
    confirmada: "Confirmada",
    recibida_parcial: "Recibida Parcial",
    recibida: "Recibida",
    cancelada: "Cancelada",
}

export default async function OrdenCompraDetailPage({
    params,
}: {
    params: { id: string }
}) {
    const result = await getOrdenCompraById(params.id)

    if (result.error || !result.data) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Orden de Compra</h1>
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">Error: {result.error || "Orden no encontrada"}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const orden = result.data
    const lineas = orden.lineas || []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/produccion/ordenes-compra">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold font-mono">{orden.numero}</h1>
                            <Badge className={ESTADO_COLORS[orden.estado] || ""}>
                                {ESTADO_LABELS[orden.estado] || orden.estado}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            {orden.proveedor?.nombre || "Sin proveedor"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <EstadoOrdenButtons ordenId={orden.id} estadoActual={orden.estado} />
                    {orden.estado === "borrador" && (
                        <form action={async () => {
                            "use server"
                            await deleteOrdenCompra(orden.id)
                        }}>
                            <Button type="submit" variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            {/* Información General */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Información de la Orden</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Número</div>
                            <div className="font-mono font-bold">{orden.numero}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Fecha</div>
                            <div>{formatDate(orden.fecha)}</div>
                        </div>
                        {orden.fecha_entrega_esperada && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Entrega Esperada</div>
                                <div>{formatDate(orden.fecha_entrega_esperada)}</div>
                            </div>
                        )}
                        {orden.fecha_entrega_real && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Entrega Real</div>
                                <div>{formatDate(orden.fecha_entrega_real)}</div>
                            </div>
                        )}
                        {orden.metodo_pago && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Método de Pago</div>
                                <div className="capitalize">{orden.metodo_pago}</div>
                            </div>
                        )}
                        {orden.referencia_proveedor && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Referencia Proveedor</div>
                                <div>{orden.referencia_proveedor}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Proveedor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Nombre</div>
                            <div className="font-medium">{orden.proveedor?.nombre || "-"}</div>
                        </div>
                        {orden.proveedor?.cif && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">CIF</div>
                                <div>{orden.proveedor.cif}</div>
                            </div>
                        )}
                        {orden.proveedor?.telefono && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Teléfono</div>
                                <div>{orden.proveedor.telefono}</div>
                            </div>
                        )}
                        {orden.proveedor?.email && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Email</div>
                                <div>{orden.proveedor.email}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Líneas de la Orden */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Materiales Solicitados</CardTitle>
                    {(orden.estado === "enviada" || orden.estado === "confirmada" || orden.estado === "recibida_parcial") && (
                        <RecibirMaterialesDialog ordenId={orden.id} lineas={lineas} />
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Materia Prima
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Cantidad Pedida
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Cantidad Recibida
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                        Precio Unit.
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                        Subtotal
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Lote
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Caducidad
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineas.map((linea: any) => {
                                    const porcentajeRecibido = (linea.cantidad_recibida / linea.cantidad_pedida) * 100
                                    const estaCompleta = linea.cantidad_recibida >= linea.cantidad_pedida

                                    return (
                                        <tr key={linea.id} className="border-b border-border last:border-b-0">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">
                                                    {linea.materia_prima?.nombre || "Desconocido"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {linea.materia_prima?.codigo}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center tabular-nums">
                                                {linea.cantidad_pedida} {linea.materia_prima?.unidad_medida}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`font-medium tabular-nums ${estaCompleta ? "text-green-600" : ""}`}>
                                                        {linea.cantidad_recibida} {linea.materia_prima?.unidad_medida}
                                                    </span>
                                                    {linea.cantidad_recibida > 0 && (
                                                        <div className="text-xs text-muted-foreground">
                                                            ({porcentajeRecibido.toFixed(0)}%)
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {formatCurrency(linea.precio_unitario)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium tabular-nums">
                                                {formatCurrency(linea.subtotal)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs">
                                                {linea.lote_proveedor || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs">
                                                {linea.fecha_caducidad ? formatDate(linea.fecha_caducidad) : "-"}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Totales */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2 max-w-md ml-auto">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(orden.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">IGIC (7%):</span>
                            <span className="font-medium">{formatCurrency(orden.impuestos)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span className="text-primary">{formatCurrency(orden.total)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notas */}
            {orden.notas && (
                <Card>
                    <CardHeader>
                        <CardTitle>Notas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {orden.notas}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
