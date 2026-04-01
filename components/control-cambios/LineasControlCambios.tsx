"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Producto, LineaControlCambioFormData } from "@/types"

interface LineasControlCambiosProps {
  lineas: LineaControlCambioFormData[]
  productos: Producto[]
  onChange: (lineas: LineaControlCambioFormData[]) => void
  disabled?: boolean
}

const MOTIVOS = [
  "Caducidad",
  "Defecto",
  "Deterioro",
  "Otro",
]

export function LineasControlCambios({
  lineas,
  productos,
  onChange,
  disabled = false,
}: LineasControlCambiosProps) {
  const handleAddLinea = () => {
    onChange([
      ...lineas,
      {
        producto_id: undefined,
        descripcion: "",
        cantidad_retirada: 0,
        motivo: "Caducidad",
        cantidad_entregada: 0,
      },
    ])
  }

  const handleRemoveLinea = (index: number) => {
    onChange(lineas.filter((_, i) => i !== index))
  }

  const handleLineaChange = (
    index: number,
    field: keyof LineaControlCambioFormData,
    value: string | number
  ) => {
    const newLineas = [...lineas]
    newLineas[index] = { ...newLineas[index], [field]: value }
    onChange(newLineas)
  }

  const handleProductoSelect = (index: number, productoId: string) => {
    const producto = productos.find((p) => p.id === productoId)
    if (producto) {
      const newLineas = [...lineas]
      newLineas[index] = {
        ...newLineas[index],
        producto_id: productoId,
        descripcion: producto.nombre,
      }
      onChange(newLineas)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Productos</Label>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLinea}
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir línea
          </Button>
        )}
      </div>

      {lineas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No hay líneas. Añade productos retirados.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header - desktop */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Producto</div>
            <div className="col-span-2 text-center">Retirado</div>
            <div className="col-span-3">Motivo</div>
            <div className="col-span-2 text-center">Entregado</div>
            <div className="col-span-1"></div>
          </div>

          {lineas.map((linea, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border p-3 bg-card"
            >
              {/* Producto */}
              <div className="sm:col-span-4">
                <Label className="sm:hidden text-xs text-muted-foreground">Producto</Label>
                <Select
                  value={linea.producto_id || ""}
                  onValueChange={(value) => handleProductoSelect(index, value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map((producto) => (
                      <SelectItem key={producto.id} value={producto.id}>
                        {producto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={linea.descripcion}
                  onChange={(e) => handleLineaChange(index, "descripcion", e.target.value)}
                  placeholder="Descripción"
                  className="mt-2 text-xs"
                  disabled={disabled}
                />
              </div>

              {/* Cantidad retirada */}
              <div className="sm:col-span-2">
                <Label className="sm:hidden text-xs text-muted-foreground">Retirado</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={linea.cantidad_retirada}
                  onChange={(e) =>
                    handleLineaChange(index, "cantidad_retirada", parseFloat(e.target.value) || 0)
                  }
                  className="text-center"
                  disabled={disabled}
                />
              </div>

              {/* Motivo */}
              <div className="sm:col-span-3">
                <Label className="sm:hidden text-xs text-muted-foreground">Motivo</Label>
                <Select
                  value={linea.motivo}
                  onValueChange={(value) => handleLineaChange(index, "motivo", value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS.map((motivo) => (
                      <SelectItem key={motivo} value={motivo}>
                        {motivo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cantidad entregada */}
              <div className="sm:col-span-2">
                <Label className="sm:hidden text-xs text-muted-foreground">Entregado</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={linea.cantidad_entregada}
                  onChange={(e) =>
                    handleLineaChange(index, "cantidad_entregada", parseFloat(e.target.value) || 0)
                  }
                  className="text-center"
                  disabled={disabled}
                />
              </div>

              {/* Eliminar */}
              <div className="sm:col-span-1 flex justify-end">
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLinea(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
