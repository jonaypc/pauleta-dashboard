import { createClient } from "@/lib/supabase/server"
import { AnalisisRotacion } from "@/components/control-cambios/AnalisisRotacion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, TrendingUp } from "lucide-react"

interface SearchParams {
  cliente?: string
  desde?: string
  hasta?: string
}

export async function generateMetadata() {
  return { title: "Análisis de Rotación - Control de Cambios" }
}

export default async function RotacionPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const { cliente: clienteId, desde, hasta } = searchParams

  // Obtener clientes para el selector
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, persona_contacto")
    .eq("activo", true)
    .order("nombre")

  // Query para líneas de factura (productos entregados)
  let queryFacturas = supabase
    .from("lineas_factura")
    .select(`
      producto_id,
      descripcion,
      cantidad,
      factura:facturas!inner(cliente_id, fecha, estado)
    `)
    .neq("factura.estado", "anulada")

  if (clienteId) {
    queryFacturas = queryFacturas.eq("factura.cliente_id", clienteId)
  }
  if (desde) {
    queryFacturas = queryFacturas.gte("factura.fecha", desde)
  }
  if (hasta) {
    queryFacturas = queryFacturas.lte("factura.fecha", hasta)
  }

  const { data: lineasFacturas, error: errorFacturas } = await queryFacturas

  // Query para líneas de control de cambios (productos retirados)
  let queryRetiros = supabase
    .from("lineas_control_cambios")
    .select(`
      producto_id,
      descripcion,
      cantidad_retirada,
      cantidad_entregada,
      control_cambios!inner(cliente_id, fecha)
    `)

  if (clienteId) {
    queryRetiros = queryRetiros.eq("control_cambios.cliente_id", clienteId)
  }
  if (desde) {
    queryRetiros = queryRetiros.gte("control_cambios.fecha", desde)
  }
  if (hasta) {
    queryRetiros = queryRetiros.lte("control_cambios.fecha", hasta)
  }

  const { data: lineasRetiros, error: errorRetiros } = await queryRetiros

  if (errorFacturas || errorRetiros) {
    console.error("Error al cargar datos:", errorFacturas || errorRetiros)
  }

  // Función para convertir cajas a unidades individuales
  const procesarProducto = (descripcion: string, cantidad: number) => {
    const regex = /caja de (.+)/i
    const match = descripcion.match(regex)

    if (match) {
      // Es una caja, convertir a unidades individuales (1 caja = 20 unidades)
      const sabor = match[1].trim()
      return {
        descripcion: sabor,
        cantidad: cantidad * 20
      }
    }

    // No es una caja, devolver tal cual
    return {
      descripcion,
      cantidad
    }
  }

  // Agrupar por producto (descripción)
  const agregado = new Map<string, {
    producto_id: string | null
    descripcion: string
    entregado: number
    retirado: number
    ultima_entrega: string | null
    fechas_entrega: string[]
  }>()

  // Procesar líneas de facturas (entregado)
  lineasFacturas?.forEach((linea: any) => {
    const procesado = procesarProducto(linea.descripcion, linea.cantidad)
    const key = procesado.descripcion
    const existing = agregado.get(key)
    const fechaFactura = linea.factura.fecha

    if (existing) {
      existing.entregado += procesado.cantidad
      existing.fechas_entrega.push(fechaFactura)
      // Actualizar última entrega si esta es más reciente
      if (!existing.ultima_entrega || fechaFactura > existing.ultima_entrega) {
        existing.ultima_entrega = fechaFactura
      }
    } else {
      agregado.set(key, {
        producto_id: linea.producto_id,
        descripcion: procesado.descripcion,
        entregado: procesado.cantidad,
        retirado: 0,
        ultima_entrega: fechaFactura,
        fechas_entrega: [fechaFactura]
      })
    }
  })

  // Procesar líneas de retiros
  lineasRetiros?.forEach((linea: any) => {
    const procesado = procesarProducto(linea.descripcion, linea.cantidad_retirada)
    const key = procesado.descripcion
    const existing = agregado.get(key)

    if (existing) {
      existing.retirado += procesado.cantidad
    } else {
      // Producto retirado pero nunca entregado en el período
      agregado.set(key, {
        producto_id: linea.producto_id,
        descripcion: procesado.descripcion,
        entregado: 0,
        retirado: procesado.cantidad,
        ultima_entrega: null,
        fechas_entrega: []
      })
    }
  })

  // Convertir a array y calcular rotación con caducidad
  const productosRotacion = Array.from(agregado.values()).map(item => {
    const rotacion = item.entregado - item.retirado
    const porcentajeRotacion = item.entregado > 0
      ? ((rotacion / item.entregado) * 100)
      : 0

    // Calcular fecha de caducidad (6 meses desde última entrega)
    let fechaCaducidad: string | null = null
    let diasHastaCaducidad: number | null = null

    if (item.ultima_entrega) {
      const ultimaEntregaDate = new Date(item.ultima_entrega)
      const caducidadDate = new Date(ultimaEntregaDate)
      caducidadDate.setMonth(caducidadDate.getMonth() + 6)
      fechaCaducidad = caducidadDate.toISOString().split('T')[0]

      // Calcular días hasta caducidad
      const hoy = new Date()
      const diffTime = caducidadDate.getTime() - hoy.getTime()
      diasHastaCaducidad = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    return {
      producto_id: item.producto_id,
      descripcion: item.descripcion,
      entregado: item.entregado,
      retirado: item.retirado,
      rotacion,
      porcentaje_rotacion: Math.max(0, porcentajeRotacion),
      ultima_entrega: item.ultima_entrega,
      fecha_caducidad: fechaCaducidad,
      dias_hasta_caducidad: diasHastaCaducidad,
      stock_estimado: Math.max(0, rotacion) // Stock que queda en el punto de venta
    }
  })

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
            <TrendingUp className="h-6 w-6" />
            Análisis de Rotación de Productos
          </h1>
          <p className="text-muted-foreground">
            Compara productos entregados vs retirados para calcular la rotación real
          </p>
        </div>
      </div>

      {/* Componente de análisis */}
      <AnalisisRotacion
        productos={productosRotacion}
        clientes={clientes || []}
        clienteSeleccionado={clienteId}
        fechaDesde={desde}
        fechaHasta={hasta}
      />
    </div>
  )
}
