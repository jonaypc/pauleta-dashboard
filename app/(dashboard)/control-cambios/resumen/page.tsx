import { createClient } from "@/lib/supabase/server"
import { ResumenReposicion } from "@/components/control-cambios/ResumenReposicion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"

interface SearchParams {
  desde?: string
  hasta?: string
}

export async function generateMetadata() {
  return { title: "Resumen de Reposición - Control de Cambios" }
}

export default async function ResumenReposicionPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const { desde, hasta } = searchParams

  // Construir query para filtrar por fecha si se especifica
  let query = supabase
    .from("lineas_control_cambios")
    .select(`
      producto_id,
      descripcion,
      cantidad_retirada,
      cantidad_entregada,
      control_cambio_id,
      control_cambios!inner(fecha)
    `)

  // Aplicar filtros de fecha si existen
  if (desde) {
    query = query.gte("control_cambios.fecha", desde)
  }
  if (hasta) {
    query = query.lte("control_cambios.fecha", hasta)
  }

  const { data: lineas, error } = await query

  if (error) {
    console.error("Error al cargar líneas:", error)
  }

  // Función para convertir cajas a unidades individuales
  const procesarProducto = (descripcion: string, cantidadRetirada: number, cantidadEntregada: number) => {
    const regex = /caja de (.+)/i
    const match = descripcion.match(regex)

    if (match) {
      // Es una caja, convertir a unidades individuales (1 caja = 20 unidades)
      const sabor = match[1].trim()
      return {
        descripcion: sabor,
        cantidadRetirada: cantidadRetirada * 20,
        cantidadEntregada: cantidadEntregada * 20
      }
    }

    // No es una caja, devolver tal cual
    return {
      descripcion,
      cantidadRetirada,
      cantidadEntregada
    }
  }

  // Agregar por producto
  const agregado = new Map<string, {
    producto_id: string | null
    descripcion: string
    total_retirado: number
    total_entregado: number
    num_registros: number
    control_cambio_ids: Set<string>
  }>()

  lineas?.forEach((linea: any) => {
    const procesado = procesarProducto(linea.descripcion, linea.cantidad_retirada, linea.cantidad_entregada)
    const key = procesado.descripcion
    const existing = agregado.get(key)

    if (existing) {
      existing.total_retirado += procesado.cantidadRetirada
      existing.total_entregado += procesado.cantidadEntregada
      existing.control_cambio_ids.add(linea.control_cambio_id)
    } else {
      agregado.set(key, {
        producto_id: linea.producto_id,
        descripcion: procesado.descripcion,
        total_retirado: procesado.cantidadRetirada,
        total_entregado: procesado.cantidadEntregada,
        num_registros: 1,
        control_cambio_ids: new Set([linea.control_cambio_id])
      })
    }
  })

  // Convertir a array y calcular número real de registros
  const lineasAgregadas = Array.from(agregado.values()).map(item => ({
    ...item,
    num_registros: item.control_cambio_ids.size,
    control_cambio_ids: undefined // Eliminar del objeto final
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/control-cambios">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Resumen de Reposición
          </h1>
          <p className="text-muted-foreground">
            Vista consolidada de todos los controles de cambio
            {desde && hasta && ` del ${new Date(desde).toLocaleDateString("es-ES")} al ${new Date(hasta).toLocaleDateString("es-ES")}`}
            {desde && !hasta && ` desde ${new Date(desde).toLocaleDateString("es-ES")}`}
            {!desde && hasta && ` hasta ${new Date(hasta).toLocaleDateString("es-ES")}`}
          </p>
        </div>
      </div>

      {/* Componente con visualización */}
      <ResumenReposicion
        lineas={lineasAgregadas}
        fechaDesde={desde}
        fechaHasta={hasta}
      />
    </div>
  )
}
