import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ClienteForm } from "@/components/clientes/ClienteForm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { 
  ArrowLeft, 
  Pencil, 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  FileText,
  User
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface PageProps {
  params: { id: string }
  searchParams: { editar?: string }
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = await createClient()
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nombre")
    .eq("id", params.id)
    .single()

  return {
    title: cliente?.nombre || "Cliente",
  }
}

export default async function ClienteDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const isEditing = searchParams.editar === "true"

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !cliente) {
    notFound()
  }

  // Obtener facturas del cliente
  const { data: facturas } = await supabase
    .from("facturas")
    .select("id, numero, fecha, total, estado")
    .eq("cliente_id", params.id)
    .order("fecha", { ascending: false })
    .limit(5)

  if (isEditing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/clientes/${params.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar cliente</h1>
            <p className="text-muted-foreground">{cliente.nombre}</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="max-w-2xl">
          <ClienteForm cliente={cliente} />
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
            <Link href="/clientes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{cliente.nombre}</h1>
              <Badge variant={cliente.activo ? "cobrada" : "anulada"}>
                {cliente.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            {cliente.cif && (
              <p className="text-muted-foreground">CIF: {cliente.cif}</p>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href={`/clientes/${params.id}?editar=true`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Grid de información */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Datos de la empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Datos de la empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p className="mt-1">{cliente.nombre}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">CIF/NIF</p>
                <p className="mt-1">{cliente.cif || "No especificado"}</p>
              </div>
              {cliente.persona_contacto && (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Persona de contacto
                  </p>
                  <p className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {cliente.persona_contacto}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cliente.direccion || cliente.ciudad || cliente.provincia ? (
                <div className="space-y-1">
                  {cliente.direccion && <p>{cliente.direccion}</p>}
                  <p>
                    {[cliente.codigo_postal, cliente.ciudad, cliente.provincia]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">No especificada</p>
              )}
            </CardContent>
          </Card>

          {/* Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5" />
                Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                {cliente.telefono ? (
                  <a
                    href={`tel:${cliente.telefono}`}
                    className="mt-1 flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {cliente.telefono}
                  </a>
                ) : (
                  <p className="mt-1 text-muted-foreground">No especificado</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                {cliente.email ? (
                  <a
                    href={`mailto:${cliente.email}`}
                    className="mt-1 flex items-center gap-2 text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {cliente.email}
                  </a>
                ) : (
                  <p className="mt-1 text-muted-foreground">No especificado</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {cliente.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{cliente.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Últimas facturas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Últimas facturas</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/facturas?cliente=${params.id}`}>Ver todas</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {facturas && facturas.length > 0 ? (
                <div className="space-y-3">
                  {facturas.map((factura) => (
                    <Link
                      key={factura.id}
                      href={`/facturas/${factura.id}`}
                      className="flex items-center justify-between rounded-lg border p-2 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{factura.numero}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(factura.fecha)}
                        </p>
                      </div>
                      <Badge variant={factura.estado as "borrador" | "emitida" | "cobrada" | "anulada"}>
                        {factura.estado}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay facturas para este cliente
                </p>
              )}
            </CardContent>
          </Card>

          {/* Info adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado</span>
                <span>{formatDate(cliente.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actualizado</span>
                <span>{formatDate(cliente.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
