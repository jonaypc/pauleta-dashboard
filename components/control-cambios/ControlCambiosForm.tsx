"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Save, X, CalendarDays, ClipboardList, MessageSquare } from "lucide-react"
import { ClienteCombobox } from "@/components/clientes/ClienteCombobox"
import { LineasControlCambios } from "@/components/control-cambios/LineasControlCambios"
import type { Cliente, Producto, ControlCambio, LineaControlCambioFormData } from "@/types"

interface ControlCambiosFormProps {
  controlCambio?: ControlCambio
  clientes: Cliente[]
  productos: Producto[]
}

export function ControlCambiosForm({ controlCambio, clientes, productos }: ControlCambiosFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!controlCambio

  const [isLoading, setIsLoading] = useState(false)
  const [clienteId, setClienteId] = useState(controlCambio?.cliente_id || "")
  const [fecha, setFecha] = useState(
    controlCambio?.fecha || new Date().toISOString().split("T")[0]
  )
  const [observaciones, setObservaciones] = useState(controlCambio?.observaciones || "")
  const [lineas, setLineas] = useState<LineaControlCambioFormData[]>(
    controlCambio?.lineas?.map((l) => ({
      producto_id: l.producto_id || undefined,
      descripcion: l.descripcion,
      cantidad_retirada: l.cantidad_retirada,
      motivo: l.motivo || "Caducidad",
      cantidad_entregada: l.cantidad_entregada,
    })) || []
  )

  const totalRetirado = lineas.reduce((sum, l) => sum + l.cantidad_retirada, 0)
  const totalEntregado = lineas.reduce((sum, l) => sum + l.cantidad_entregada, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" })
      return
    }
    if (lineas.length === 0) {
      toast({ title: "Error", description: "Añade al menos una línea", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("control_cambios")
          .update({
            cliente_id: clienteId,
            fecha,
            observaciones: observaciones || null,
            total_retirado: totalRetirado,
            total_entregado: totalEntregado,
          })
          .eq("id", controlCambio.id)
        if (error) throw error

        await supabase
          .from("lineas_control_cambios")
          .delete()
          .eq("control_cambio_id", controlCambio.id)

        const { error: lineasError } = await supabase
          .from("lineas_control_cambios")
          .insert(
            lineas.map((l) => ({
              control_cambio_id: controlCambio.id,
              producto_id: l.producto_id || null,
              descripcion: l.descripcion,
              cantidad_retirada: l.cantidad_retirada,
              motivo: l.motivo || null,
              cantidad_entregada: l.cantidad_entregada,
            }))
          )
        if (lineasError) throw lineasError

        toast({
          title: "Actualizado",
          description: "El control de cambios se ha guardado correctamente",
          variant: "success",
        })
        router.push(`/control-cambios/${controlCambio.id}`)
      } else {
        const { data, error } = await supabase
          .from("control_cambios")
          .insert({
            cliente_id: clienteId,
            fecha,
            observaciones: observaciones || null,
            total_retirado: totalRetirado,
            total_entregado: totalEntregado,
          })
          .select("id")
          .single()
        if (error) throw error

        const { error: lineasError } = await supabase
          .from("lineas_control_cambios")
          .insert(
            lineas.map((l) => ({
              control_cambio_id: data.id,
              producto_id: l.producto_id || null,
              descripcion: l.descripcion,
              cantidad_retirada: l.cantidad_retirada,
              motivo: l.motivo || null,
              cantidad_entregada: l.cantidad_entregada,
            }))
          )
        if (lineasError) throw lineasError

        toast({
          title: "Creado",
          description: "El control de cambios se ha registrado correctamente",
          variant: "success",
        })
        router.push(`/control-cambios/${data.id}`)
      }

      router.refresh()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast({ title: "Error", description: errorMessage, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cliente y fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            Datos generales
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label required>Cliente</Label>
            <ClienteCombobox
              clientes={clientes}
              value={clienteId}
              onValueChange={setClienteId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha" required>Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Líneas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineasControlCambios
            lineas={lineas}
            productos={productos}
            onChange={setLineas}
          />
        </CardContent>
      </Card>

      {/* Resumen */}
      {lineas.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end gap-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total retirado</p>
                <p className="text-2xl font-bold text-red-600">{totalRetirado}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total entregado</p>
                <p className="text-2xl font-bold text-green-600">{totalEntregado}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Observaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas adicionales..."
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" loading={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? "Guardar cambios" : "Registrar"}
        </Button>
      </div>
    </form>
  )
}
