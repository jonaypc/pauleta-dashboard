import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Pencil, Printer, ClipboardList } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { ControlCambiosForm } from "@/components/control-cambios/ControlCambiosForm"

interface PageProps {
  params: { id: string }
  searchParams: { editar?: string }
}

export async function generateMetadata({ params }: PageProps) {
  return { title: "Control de Cambios" }
}

export default async function ControlCambioDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const isEditing = searchParams.editar === "true"

  const { data: registro, error } = await supabase
    .from("control_cambios")
    .select(`
      *,
      cliente:clientes(*),
      lineas:lineas_control_cambios(*, producto:productos(nombre, codigo_barras))
    `)
    .eq("id", params.id)
    .single()

  if (error || !registro) {
    notFound()
  }

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
            <Link href={`/control-cambios/${params.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Control de Cambios</h1>
            <p className="text-muted-foreground">{formatDate(registro.fecha)}</p>
          </div>
        </div>
        <div className="max-w-3xl">
          <ControlCambiosForm
            controlCambio={registro}
            clientes={clientes || []}
            productos={productos || []}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/control-cambios">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Control de Cambios</h1>
            <p className="text-muted-foreground">{formatDate(registro.fecha)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/print/control-cambios/registro/${params.id}`} target="_blank">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/control-cambios/${params.id}?editar=true`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Info del cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Datos del registro
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cliente</p>
            <p className="mt-1 font-medium">{registro.cliente?.nombre || "—"}</p>
            {registro.cliente?.persona_contacto && (
              <p className="text-sm text-muted-foreground">{registro.cliente.persona_contacto}</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Fecha</p>
            <p className="mt-1">{formatDate(registro.fecha)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total retirado</p>
            <p className="mt-1 text-lg font-bold text-red-600">{registro.total_retirado}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total entregado</p>
            <p className="mt-1 text-lg font-bold text-green-600">{registro.total_entregado}</p>
          </div>
        </CardContent>
      </Card>

      {/* Líneas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Producto</th>
                  <th className="px-4 py-2 text-center font-medium">Retirado</th>
                  <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Motivo</th>
                  <th className="px-4 py-2 text-center font-medium">Entregado</th>
                </tr>
              </thead>
              <tbody>
                {registro.lineas?.map((linea: any) => (
                  <tr key={linea.id} className="border-b">
                    <td className="px-4 py-2">
                      <div className="font-medium">{linea.descripcion}</div>
                      {linea.producto?.codigo_barras && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {linea.producto.codigo_barras}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant="destructive">{linea.cantidad_retirada}</Badge>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-muted-foreground">
                      {linea.motivo || "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant="cobrada">{linea.cantidad_entregada}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Observaciones */}
      {registro.observaciones && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{registro.observaciones}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
