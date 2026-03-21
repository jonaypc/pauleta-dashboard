import { createClient } from "@/lib/supabase/server"
import { PresupuestosTable } from "@/components/presupuestos/PresupuestosTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, Search, FileText } from "lucide-react"
import { ClientFilter } from "@/components/facturas/ClientFilter"
import { PaginationControls } from "@/components/ui/pagination-controls"
import type { EstadoPresupuesto } from "@/types"

export const metadata = {
    title: "Presupuestos",
}

interface PageProps {
    searchParams: { q?: string; estado?: EstadoPresupuesto; from?: string; to?: string; cliente?: string; page?: string; limit?: string }
}

export default async function PresupuestosPage({ searchParams }: PageProps) {
    const supabase = await createClient()
    const busqueda = searchParams.q || ""
    const estadoFiltro = searchParams.estado
    const clienteFiltro = searchParams.cliente

    const page = Number(searchParams.page) || 1
    const limit = Number(searchParams.limit) || 10
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
        .from("presupuestos")
        .select("*, cliente:clientes(nombre, persona_contacto, email)", { count: "exact" })
        .order("fecha", { ascending: false })
        .order("numero", { ascending: false })
        .range(from, to)

    if (estadoFiltro) {
        query = query.eq("estado", estadoFiltro)
    }

    if (busqueda) {
        query = query.or(`numero.ilike.%${busqueda}%`)
    }

    if (clienteFiltro) {
        query = query.eq("cliente_id", clienteFiltro)
    }

    const { data: presupuestosRaw, count } = await query

    const presupuestos = presupuestosRaw?.sort((a: any, b: any) => {
        if (a.estado === 'borrador' && b.estado !== 'borrador') return -1
        if (a.estado !== 'borrador' && b.estado === 'borrador') return 1
        return 0
    }) || []

    const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nombre, persona_contacto")
        .eq("activo", true)
        .order("nombre", { ascending: true })

    const estados: { value: EstadoPresupuesto | ""; label: string }[] = [
        { value: "", label: "Todos" },
        { value: "borrador", label: "Borrador" },
        { value: "enviado", label: "Enviado" },
        { value: "aceptado", label: "Aceptado" },
        { value: "rechazado", label: "Rechazado" },
        { value: "facturado", label: "Facturado" },
    ]

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Presupuestos</h1>
                    <p className="text-muted-foreground">
                        Gestiona los presupuestos para tus clientes
                    </p>
                </div>
                <Button asChild>
                    <Link href="/presupuestos/nuevo">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Presupuesto
                    </Link>
                </Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <form className="relative flex-1 sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            name="q"
                            placeholder="Buscar por número..."
                            defaultValue={busqueda}
                            className="pl-9"
                        />
                    </form>
                    <ClientFilter clientes={clientes || []} />
                </div>

                <div className="flex flex-wrap gap-2">
                    {estados.map((estado) => (
                        <Link
                            key={estado.value}
                            href={
                                estado.value
                                    ? `/presupuestos?estado=${estado.value}`
                                    : "/presupuestos"
                            }
                        >
                            <Badge
                                variant={
                                    estadoFiltro === estado.value ||
                                        (!estadoFiltro && estado.value === "")
                                        ? "default"
                                        : "outline"
                                }
                                className="cursor-pointer"
                            >
                                {estado.label}
                            </Badge>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Tabla o estado vacío */}
            {presupuestos && presupuestos.length > 0 ? (
                <>
                    <PresupuestosTable presupuestos={presupuestos} />
                    <PaginationControls
                        currentPage={page}
                        totalCount={totalCount}
                        pageSize={limit}
                        hasNextPage={page < totalPages}
                        hasPrevPage={page > 1}
                    />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                    <div className="rounded-full bg-muted p-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No hay presupuestos</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {busqueda || estadoFiltro
                            ? "No se encontraron presupuestos con esos filtros"
                            : "Empieza creando tu primer presupuesto"}
                    </p>
                    {!busqueda && !estadoFiltro && (
                        <Button asChild className="mt-4">
                            <Link href="/presupuestos/nuevo">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear presupuesto
                            </Link>
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
