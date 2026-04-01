"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"

interface ProductoRotacion {
  producto_id: string | null
  descripcion: string
  entregado: number
  retirado: number
  rotacion: number
  porcentaje_rotacion: number
  ultima_entrega: string | null
  fecha_caducidad: string | null
  dias_hasta_caducidad: number | null
  stock_estimado: number
}

interface Cliente {
  id: string
  nombre: string
  persona_contacto: string | null
}

interface AnalisisRotacionProps {
  productos: ProductoRotacion[]
  clientes: Cliente[]
  clienteSeleccionado?: string
  fechaDesde?: string
  fechaHasta?: string
}

export function AnalisisRotacion({
  productos: productosIniciales,
  clientes,
  clienteSeleccionado: clienteInicial,
  fechaDesde: fechaDesdeInicial,
  fechaHasta: fechaHastaInicial
}: AnalisisRotacionProps) {
  const [clienteId, setClienteId] = useState(clienteInicial || "all")
  const [fechaDesde, setFechaDesde] = useState(fechaDesdeInicial || "")
  const [fechaHasta, setFechaHasta] = useState(fechaHastaInicial || "")

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const totalEntregado = productosIniciales.reduce((sum, p) => sum + p.entregado, 0)
    const totalRetirado = productosIniciales.reduce((sum, p) => sum + p.retirado, 0)
    const rotacionNeta = totalEntregado - totalRetirado
    const porcentajeRotacionGlobal = totalEntregado > 0 ? ((rotacionNeta / totalEntregado) * 100) : 0

    const productosBajaRotacion = productosIniciales.filter(p => p.porcentaje_rotacion < 50).length
    const productosAltaRotacion = productosIniciales.filter(p => p.porcentaje_rotacion >= 80).length

    // Alertas de caducidad
    const productosCriticos = productosIniciales.filter(p => p.dias_hasta_caducidad !== null && p.dias_hasta_caducidad <= 30 && p.stock_estimado > 0)
    const productosProximoVencer = productosIniciales.filter(p => p.dias_hasta_caducidad !== null && p.dias_hasta_caducidad > 30 && p.dias_hasta_caducidad <= 60 && p.stock_estimado > 0)

    return {
      totalEntregado,
      totalRetirado,
      rotacionNeta,
      porcentajeRotacionGlobal,
      productosBajaRotacion,
      productosAltaRotacion,
      productosCriticos,
      productosProximoVencer
    }
  }, [productosIniciales])

  // Preparar datos para gráfico
  const datosGrafico = useMemo(() => {
    return productosIniciales
      .sort((a, b) => b.entregado - a.entregado)
      .slice(0, 10)
      .map(p => ({
        nombre: p.descripcion.length > 20 ? p.descripcion.substring(0, 20) + '...' : p.descripcion,
        nombreCompleto: p.descripcion,
        entregado: p.entregado,
        retirado: p.retirado,
        rotacion: p.rotacion
      }))
  }, [productosIniciales])

  const handleFiltrar = () => {
    const params = new URLSearchParams()
    if (clienteId && clienteId !== "all") params.set("cliente", clienteId)
    if (fechaDesde) params.set("desde", fechaDesde)
    if (fechaHasta) params.set("hasta", fechaHasta)
    window.location.href = `/control-cambios/rotacion?${params.toString()}`
  }

  const handleLimpiar = () => {
    window.location.href = "/control-cambios/rotacion"
  }

  const getRotacionColor = (porcentaje: number) => {
    if (porcentaje >= 80) return "text-green-600"
    if (porcentaje >= 50) return "text-amber-600"
    return "text-red-600"
  }

  const getRotacionIcon = (porcentaje: number) => {
    if (porcentaje >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (porcentaje >= 50) return <TrendingUp className="h-4 w-4 text-amber-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const getCaducidadColor = (dias: number | null) => {
    if (dias === null) return "text-muted-foreground"
    if (dias < 0) return "text-gray-400" // Ya caducado
    if (dias <= 30) return "text-red-600 font-bold" // Crítico: menos de 1 mes
    if (dias <= 60) return "text-amber-600" // Advertencia: menos de 2 meses
    return "text-green-600"
  }

  const getCaducidadBadge = (dias: number | null) => {
    if (dias === null) return null
    if (dias < 0) return <Badge variant="secondary">Caducado</Badge>
    if (dias <= 30) return <Badge variant="destructive" className="animate-pulse">¡{dias}d!</Badge>
    if (dias <= 60) return <Badge variant="outline" className="border-amber-600 text-amber-600">{dias}d</Badge>
    return <Badge variant="outline" className="border-green-600 text-green-600">{dias}d</Badge>
  }

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "—"
    return new Date(fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
  }

  const clienteNombre = clientes.find(c => c.id === clienteId)

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Cliente / Establecimiento</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.persona_contacto || c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleFiltrar}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
            {((clienteId && clienteId !== "all") || fechaDesde || fechaHasta) && (
              <Button variant="outline" onClick={handleLimpiar}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertas de caducidad */}
      {(estadisticas.productosCriticos.length > 0 || estadisticas.productosProximoVencer.length > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Caducidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {estadisticas.productosCriticos.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">
                    ¡{estadisticas.productosCriticos.length} producto{estadisticas.productosCriticos.length > 1 ? "s" : ""} crítico{estadisticas.productosCriticos.length > 1 ? "s" : ""}!
                  </p>
                  <p className="text-sm text-red-700">
                    Caduca{estadisticas.productosCriticos.length > 1 ? "n" : ""} en menos de 30 días con stock pendiente en punto de venta
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {estadisticas.productosCriticos.slice(0, 3).map((p, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">
                        {p.descripcion} ({p.stock_estimado} uds, {p.dias_hasta_caducidad}d)
                      </Badge>
                    ))}
                    {estadisticas.productosCriticos.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{estadisticas.productosCriticos.length - 3} más
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            {estadisticas.productosProximoVencer.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                <TrendingDown className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">
                    {estadisticas.productosProximoVencer.length} producto{estadisticas.productosProximoVencer.length > 1 ? "s" : ""} próximo{estadisticas.productosProximoVencer.length > 1 ? "s" : ""} a vencer
                  </p>
                  <p className="text-sm text-amber-700">
                    Caduca{estadisticas.productosProximoVencer.length > 1 ? "n" : ""} en 31-60 días
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entregado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{estadisticas.totalEntregado}</div>
            <p className="text-xs text-muted-foreground">unidades facturadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Retirado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{estadisticas.totalRetirado}</div>
            <p className="text-xs text-muted-foreground">unidades devueltas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rotación Neta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estadisticas.rotacionNeta}</div>
            <p className="text-xs text-muted-foreground">
              {estadisticas.porcentajeRotacionGlobal.toFixed(1)}% efectivo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-green-600 font-bold">{estadisticas.productosAltaRotacion}</div>
              <span className="text-xs text-muted-foreground">alta</span>
              <div className="text-red-600 font-bold">{estadisticas.productosBajaRotacion}</div>
              <span className="text-xs text-muted-foreground">baja</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Productos - Entregado vs Retirado</CardTitle>
          <CardDescription>
            {clienteNombre ? `Cliente: ${clienteNombre.persona_contacto || clienteNombre.nombre}` : "Todos los clientes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium mb-2">{payload[0].payload.nombreCompleto}</p>
                        <p className="text-sm text-blue-600">Entregado: {payload[0]?.value}</p>
                        <p className="text-sm text-red-600">Retirado: {payload[1]?.value}</p>
                        <p className="text-sm text-green-600 font-bold">Rotación: {payload[2]?.value}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Bar dataKey="entregado" fill="#3b82f6" name="Entregado" />
              <Bar dataKey="retirado" fill="#ef4444" name="Retirado" />
              <Bar dataKey="rotacion" fill="#22c55e" name="Rotación" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Rotación por Producto</CardTitle>
          <CardDescription>
            Análisis completo de entregado vs retirado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Entregado</TableHead>
                  <TableHead className="text-center">Retirado</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">% Rotación</TableHead>
                  <TableHead className="text-center">Última Entrega</TableHead>
                  <TableHead className="text-center">Caducidad</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosIniciales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No hay datos para el período seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  productosIniciales
                    .sort((a, b) => {
                      // Ordenar por días hasta caducidad primero (más urgente primero), luego por cantidad entregada
                      if (a.dias_hasta_caducidad !== null && b.dias_hasta_caducidad !== null) {
                        if (a.dias_hasta_caducidad <= 60 || b.dias_hasta_caducidad <= 60) {
                          return a.dias_hasta_caducidad - b.dias_hasta_caducidad
                        }
                      }
                      return b.entregado - a.entregado
                    })
                    .map((producto, idx) => (
                      <TableRow key={idx} className={producto.dias_hasta_caducidad !== null && producto.dias_hasta_caducidad <= 30 ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">{producto.descripcion}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50">{producto.entregado}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{producto.retirado}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={producto.stock_estimado > 0 ? "bg-amber-50" : ""}>
                            {producto.stock_estimado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${getRotacionColor(producto.porcentaje_rotacion)}`}>
                            {producto.porcentaje_rotacion.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {formatFecha(producto.ultima_entrega)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs ${getCaducidadColor(producto.dias_hasta_caducidad)}`}>
                              {formatFecha(producto.fecha_caducidad)}
                            </span>
                            {getCaducidadBadge(producto.dias_hasta_caducidad)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {getRotacionIcon(producto.porcentaje_rotacion)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Leyendas */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">≥80% Excelente rotación</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span className="text-muted-foreground">50-79% Rotación aceptable</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-muted-foreground">&lt;50% Baja rotación - revisar</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm pt-2 border-t">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-red-100 border border-red-200"></div>
                <span className="text-muted-foreground">Fila roja: Caduca en ≤30 días (crítico)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-amber-600 text-amber-600 h-5 text-xs">60d</Badge>
                <span className="text-muted-foreground">Badge ámbar: Caduca en 31-60 días</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-green-600 text-green-600 h-5 text-xs">90d</Badge>
                <span className="text-muted-foreground">Badge verde: &gt;60 días</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
