"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Package, TrendingUp, Calendar, RefreshCw } from "lucide-react"

interface LineaAgregada {
  producto_id: string | null
  descripcion: string
  total_retirado: number
  total_entregado: number
  num_registros: number
}

interface ResumenReposicionProps {
  lineas: LineaAgregada[]
  fechaDesde?: string
  fechaHasta?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0']

export function ResumenReposicion({ lineas: lineasIniciales, fechaDesde: fechaDesdeInicial, fechaHasta: fechaHastaInicial }: ResumenReposicionProps) {
  const [fechaDesde, setFechaDesde] = useState(fechaDesdeInicial || "")
  const [fechaHasta, setFechaHasta] = useState(fechaHastaInicial || "")

  // Calcular totales
  const totales = useMemo(() => {
    const totalEntregado = lineasIniciales.reduce((sum, l) => sum + l.total_entregado, 0)
    const totalRetirado = lineasIniciales.reduce((sum, l) => sum + l.total_retirado, 0)
    const numProductos = lineasIniciales.length
    const numRegistros = lineasIniciales.reduce((sum, l) => sum + l.num_registros, 0)

    return {
      totalEntregado,
      totalRetirado,
      numProductos,
      numRegistros
    }
  }, [lineasIniciales])

  // Preparar datos para el gráfico de barras
  const datosGrafico = useMemo(() => {
    return lineasIniciales
      .sort((a, b) => b.total_entregado - a.total_entregado)
      .slice(0, 15) // Top 15 productos
      .map(l => ({
        nombre: l.descripcion.length > 25 ? l.descripcion.substring(0, 25) + '...' : l.descripcion,
        nombreCompleto: l.descripcion,
        retirado: l.total_retirado,
        entregado: l.total_entregado
      }))
  }, [lineasIniciales])

  // Preparar datos para el gráfico de pastel (top 8)
  const datosPie = useMemo(() => {
    const top8 = lineasIniciales
      .sort((a, b) => b.total_entregado - a.total_entregado)
      .slice(0, 8)

    const otros = lineasIniciales
      .slice(8)
      .reduce((sum, l) => sum + l.total_entregado, 0)

    const datos = top8.map(l => ({
      name: l.descripcion,
      value: l.total_entregado
    }))

    if (otros > 0) {
      datos.push({ name: "Otros", value: otros })
    }

    return datos
  }, [lineasIniciales])

  const handleFiltrar = () => {
    const params = new URLSearchParams()
    if (fechaDesde) params.set("desde", fechaDesde)
    if (fechaHasta) params.set("hasta", fechaHasta)
    window.location.href = `/control-cambios/resumen?${params.toString()}`
  }

  const handleLimpiarFiltros = () => {
    window.location.href = "/control-cambios/resumen"
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <Button onClick={handleFiltrar}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aplicar
            </Button>
            {(fechaDesde || fechaHasta) && (
              <Button variant="outline" onClick={handleLimpiarFiltros}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Reponer</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totales.totalEntregado}</div>
            <p className="text-xs text-muted-foreground">unidades entregadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retirado</CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totales.totalRetirado}</div>
            <p className="text-xs text-muted-foreground">unidades retiradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Diferentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totales.numProductos}</div>
            <p className="text-xs text-muted-foreground">sabores únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros</CardTitle>
            <RefreshCw className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totales.numRegistros}</div>
            <p className="text-xs text-muted-foreground">controles de cambio</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de barras */}
        <Card>
          <CardHeader>
            <CardTitle>Top 15 Productos a Reponer</CardTitle>
            <CardDescription>Cantidad de unidades por sabor</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={datosGrafico} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="nombre" type="category" width={120} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium mb-2">{payload[0].payload.nombreCompleto}</p>
                          <p className="text-sm text-green-600">Entregado: {payload[1]?.value}</p>
                          <p className="text-sm text-red-600">Retirado: {payload[0]?.value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar dataKey="retirado" fill="#ef4444" name="Retirado" />
                <Bar dataKey="entregado" fill="#22c55e" name="Entregado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pastel */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Reposición</CardTitle>
            <CardDescription>Porcentaje por producto (top 8)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={datosPie}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {datosPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle Completo de Reposición</CardTitle>
          <CardDescription>Todos los productos ordenados por cantidad a reponer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto / Sabor</TableHead>
                  <TableHead className="text-center">Total Retirado</TableHead>
                  <TableHead className="text-center">Total a Reponer</TableHead>
                  <TableHead className="text-center">Diferencia</TableHead>
                  <TableHead className="text-center">Nº Registros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineasIniciales
                  .sort((a, b) => b.total_entregado - a.total_entregado)
                  .map((linea, idx) => {
                    const diferencia = linea.total_entregado - linea.total_retirado
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{linea.descripcion}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{linea.total_retirado}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="cobrada" className="text-base font-bold">
                            {linea.total_entregado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={diferencia >= 0 ? "outline" : "secondary"}>
                            {diferencia > 0 ? '+' : ''}{diferencia}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {linea.num_registros}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
