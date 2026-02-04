import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, FileText, CreditCard, Download, ExternalLink } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency } from "@/lib/utils"

interface PageProps {
    params: { id: string }
}

export default async function GastoDetailPage({ params }: PageProps) {
    const supabase = await createClient()

    const { data: gasto, error } = await supabase
        .from("gastos")
        .select(`
            *,
            proveedor:proveedores(*)
        `)
        .eq("id", params.id)
        .single()

    if (error || !gasto) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/gastos">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Gasto {gasto.numero || "Sin número"}
                        </h1>
                        <Badge
                            variant={gasto.estado === "pagado" ? "default" : "secondary"}
                            className={
                                gasto.estado === "pagado"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                            }
                        >
                            {gasto.estado === "pagado" ? "PAGADO" : "PENDIENTE"}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        {gasto.proveedor?.nombre}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Detalles Principales */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Detalles del Gasto</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Fecha
                                </div>
                                <div className="font-medium text-lg">{formatDate(gasto.fecha)}</div>
                            </div>

                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" /> Importe Total
                                </div>
                                <div className="font-bold text-2xl">{formatCurrency(gasto.importe)}</div>
                            </div>

                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">Categoría</div>
                                <div><Badge variant="outline">{gasto.categoria || "Sin categoría"}</Badge></div>
                            </div>

                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">Método de Pago</div>
                                <div className="capitalize">{gasto.metodo_pago || "-"}</div>
                            </div>

                            {gasto.notas && (
                                <div className="col-span-2 space-y-1 pt-4 border-t">
                                    <div className="text-sm font-medium text-muted-foreground">Notas</div>
                                    <p className="text-sm whitespace-pre-wrap">{gasto.notas}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Previsualización del Archivo */}
                    {gasto.archivo_url ? (
                        <Card className="offset-card h-[600px] flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Factura Adjunta
                                </CardTitle>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={gasto.archivo_url} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-3 w-3" /> Descargar
                                    </a>
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 overflow-hidden bg-slate-100 relative">
                                {gasto.archivo_url.toLowerCase().endsWith('.pdf') ? (
                                    <iframe
                                        src={`${gasto.archivo_url}#toolbar=0`}
                                        className="w-full h-full border-0"
                                    />
                                ) : (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={gasto.archivo_url}
                                        alt="Factura"
                                        className="w-full h-full object-contain"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-muted/50 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <FileText className="h-10 w-10 mb-2 opacity-50" />
                                <p>No hay archivo adjunto</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar Proveedor */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Proveedor</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Nombre</div>
                                <div className="font-medium">{gasto.proveedor?.nombre}</div>
                            </div>
                            {gasto.proveedor?.cif && (
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">CIF/NIF</div>
                                    <div className="font-mono text-sm">{gasto.proveedor.cif}</div>
                                </div>
                            )}
                            {gasto.proveedor?.email && (
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Email</div>
                                    <a href={`mailto:${gasto.proveedor.email}`} className="text-sm text-blue-600 hover:underline">
                                        {gasto.proveedor.email}
                                    </a>
                                </div>
                            )}
                            {gasto.proveedor?.telefono && (
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Teléfono</div>
                                    <div className="text-sm">{gasto.proveedor.telefono}</div>
                                </div>
                            )}
                            {gasto.proveedor?.direccion && (
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Dirección</div>
                                    <div className="text-sm text-balance">{gasto.proveedor.direccion}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
