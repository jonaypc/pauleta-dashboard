import { createClient } from "@/lib/supabase/server"
import { ClientesTable } from "@/components/clientes/ClientesTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Plus, Search, Users } from "lucide-react"

export const metadata = {
  title: "Clientes",
}

interface PageProps {
  searchParams: { q?: string; activo?: string }
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const busqueda = searchParams.q || ""
  const soloActivos = searchParams.activo !== "false"

  let query = supabase
    .from("clientes")
    .select("*")
    .order("nombre", { ascending: true })

  if (soloActivos) {
    query = query.eq("activo", true)
  }

  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,cif.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
  }

  const { data: clientes, error } = await query

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona los clientes de Pauleta Canaria
          </p>
        </div>
        <Button asChild>
          <Link href="/clientes/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            placeholder="Buscar por nombre, CIF o email..."
            defaultValue={busqueda}
            className="pl-9"
          />
        </form>
      </div>

      {/* Tabla o estado vacío */}
      {clientes && clientes.length > 0 ? (
        <ClientesTable clientes={clientes} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="rounded-full bg-muted p-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No hay clientes</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {busqueda
              ? "No se encontraron clientes con esa búsqueda"
              : "Empieza creando tu primer cliente"}
          </p>
          {!busqueda && (
            <Button asChild className="mt-4">
              <Link href="/clientes/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Crear cliente
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
