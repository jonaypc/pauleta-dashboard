import { createClient } from "@/lib/supabase/server"
import { FacturasTable } from "@/components/facturas/FacturasTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, Search, FileText } from "lucide-react"
import { FacturasFilter } from "@/components/facturas/FacturasFilter"
import { ClientFilter } from "@/components/facturas/ClientFilter"
import { PaginationControls } from "@/components/ui/pagination-controls"
import type { EstadoFactura } from "@/types"

export const metadata = {
    title: "Facturas",
}

interface PageProps {
    searchParams: { q?: string; estado?: EstadoFactura; from?: string; to?: string; cliente?: string; page?: string; limit?: string }
}

export default async function FacturasPage({ searchParams }: PageProps) {
    const supabase = await createClient()
    const busqueda = searchParams.q || ""
    const estadoFiltro = searchParams.estado
    const dateFrom = searchParams.from
    const dateTo = searchParams.to
    const clienteFiltro = searchParams.cliente

    // Paginación
    const page = Number(searchParams.page) || 1
    const limit = Number(searchParams.limit) || 10
    const from = (page - 1) * limit
    const to = from + limit - 1

    // 1. Query de Facturas
    let query = supabase
        .from("facturas")
        .select("*, cliente:clientes(nombre, persona_contacto, email), email_tracking(*)", { count: "exact" })
        .order("fecha", { ascending: false })
        .order("numero", { ascending: false })
        .range(from, to)

    if (estadoFiltro) {
        query = query.eq("estado", estadoFiltro)
    }

    if (busqueda) {
        query = query.or(`numero.ilike.%${busqueda}%`)
    }

    if (dateFrom) {
        query = query.gte("fecha", dateFrom)
    }

    if (dateTo) {
        query = query.lte("fecha", dateTo)
    }

    if (clienteFiltro) {
        query = query.eq("cliente_id", clienteFiltro)
    }

    const { data: facturasRaw, error, count } = await query

    // Ordenar borradores primero (client-side)
    const facturas = facturasRaw?.sort((a: any, b: any) => {
        if (a.estado === 'borrador' && b.estado !== 'borrador') return -1
        if (a.estado !== 'borrador' && b.estado === 'borrador') return 1
        return 0 // Mantener orden original (por fecha) para el resto
    }) || []

    // 2. Fetch de Clientes para el filtro (solo nombre y contacto)
    const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nombre, persona_contacto")
        .eq("activo", true)
        .order("nombre", { ascending: true })

    const estados: { value: EstadoFactura | ""; label: string }[] = [
        { value: "", label: "Todos" },
        { value: "borrador", label: "Borrador" },
        { value: "emitida", label: "Emitida" },
        { value: "cobrada", label: "Cobrada" },
        { value: "anulada", label: "Anulada" },
    ]

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
                    <p className="text-muted-foreground">
                        Gestiona las facturas de Pauleta Canaria
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href="/facturas/importar">
                            Importar Excel
                        </Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/facturas/importar-pdf">
                            Importar PDF
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/facturas/nueva">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Factura
                        </Link>
                    </Button>
                </div>
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
                    <FacturasFilter />
                    <ClientFilter clientes={clientes || []} />
                </div>

                <div className="flex flex-wrap gap-2">
                    {estados.map((estado) => (
                        <Link
                            key={estado.value}
                            href={
                                estado.value
                                    ? `/facturas?estado=${estado.value}`
                                    : "/facturas"
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
            {facturas && facturas.length > 0 ? (
                <>
                    <FacturasTable facturas={facturas} />
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
                    <h3 className="mt-4 text-lg font-semibold">No hay facturas</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {busqueda || estadoFiltro
                            ? "No se encontraron facturas con esos filtros"
                            : "Empieza creando tu primera factura"}
                    </p>
                    {!busqueda && !estadoFiltro && (
                        <Button asChild className="mt-4">
                            <Link href="/facturas/nueva">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear factura
                            </Link>
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

