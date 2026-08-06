'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { FileX, Loader2 } from 'lucide-react'
import { crearFacturaRectificativa } from '@/lib/actions/facturas'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Factura, LineaFactura } from '@/types'

interface CrearRectificativaDialogProps {
  factura: Factura & { lineas?: LineaFactura[] }
}

const MOTIVOS_COMUNES = [
  'Devolución de mercancía',
  'Error en la facturación',
  'Descuento posterior',
  'Modificación de base imponible',
  'Duplicado',
]

export function CrearRectificativaDialog({ factura }: CrearRectificativaDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('')
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('')
  const [lineasModificadas, setLineasModificadas] = useState<Record<string, { cantidad: number; precio: number }>>({})
  const router = useRouter()

  // Inicializar cantidades negativas para devolución total
  const handleDevolucionCompleta = () => {
    const lineas: Record<string, { cantidad: number; precio: number }> = {}
    factura.lineas?.forEach(linea => {
      lineas[linea.id] = {
        cantidad: -linea.cantidad, // Negativo para devolución
        precio: linea.precio_unitario
      }
    })
    setLineasModificadas(lineas)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const motivo = motivoPersonalizado || motivoSeleccionado

    if (!motivo.trim()) {
      toast.error('Debes especificar el motivo de la rectificación')
      setLoading(false)
      return
    }

    // Validar que haya al menos una línea modificada
    const lineasArray = Object.entries(lineasModificadas).map(([lineaId, datos]) => ({
      linea_original_id: lineaId,
      cantidad: datos.cantidad,
      precio_unitario: datos.precio
    }))

    if (lineasArray.length === 0) {
      toast.error('Debes especificar al menos una línea a rectificar')
      setLoading(false)
      return
    }

    try {
      const result = await crearFacturaRectificativa({
        factura_original_id: factura.id,
        motivo: motivo.trim(),
        lineas: lineasArray
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Factura rectificativa creada correctamente')
        setOpen(false)
        router.push(`/facturas/${result.id}`)
        router.refresh()
      }
    } catch (error) {
      toast.error('Error al crear la factura rectificativa')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const actualizarLinea = (lineaId: string, campo: 'cantidad' | 'precio', valor: number) => {
    setLineasModificadas(prev => ({
      ...prev,
      [lineaId]: {
        ...prev[lineaId],
        [campo]: valor
      }
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileX className="mr-2 h-4 w-4" />
          Crear Rectificativa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Factura Rectificativa</DialogTitle>
          <DialogDescription>
            Crea una factura rectificativa (abono) para la factura {factura.numero}.
            Los importes negativos representan devoluciones al cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de la rectificación *</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {MOTIVOS_COMUNES.map(motivo => (
                <Button
                  key={motivo}
                  type="button"
                  variant={motivoSeleccionado === motivo ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setMotivoSeleccionado(motivo)
                    setMotivoPersonalizado('')
                  }}
                >
                  {motivo}
                </Button>
              ))}
            </div>
            <Textarea
              id="motivo"
              placeholder="O escribe un motivo personalizado..."
              value={motivoPersonalizado}
              onChange={(e) => {
                setMotivoPersonalizado(e.target.value)
                setMotivoSeleccionado('')
              }}
              rows={2}
            />
          </div>

          {/* Líneas de factura */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Líneas a rectificar</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDevolucionCompleta}
              >
                Devolución completa
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Producto</th>
                    <th className="text-right p-2">Cant. Original</th>
                    <th className="text-right p-2">Precio Original</th>
                    <th className="text-right p-2">Cantidad a Rectificar</th>
                    <th className="text-right p-2">Precio Unitario</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.lineas?.map(linea => (
                    <tr key={linea.id} className="border-t">
                      <td className="p-2">{linea.descripcion}</td>
                      <td className="text-right p-2">{linea.cantidad}</td>
                      <td className="text-right p-2">
                        {linea.precio_unitario.toFixed(2)} €
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          className="text-right"
                          value={lineasModificadas[linea.id]?.cantidad || ''}
                          onChange={(e) => actualizarLinea(linea.id, 'cantidad', parseFloat(e.target.value) || 0)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Negativo = devolución
                        </p>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={linea.precio_unitario.toFixed(2)}
                          className="text-right"
                          value={lineasModificadas[linea.id]?.precio || ''}
                          onChange={(e) => actualizarLinea(linea.id, 'precio', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Nota:</strong> Las cantidades negativas representan devoluciones.
                Por ejemplo, -10 unidades significa que el cliente devuelve 10 unidades.
              </p>
              <p className="text-sm text-muted-foreground">
                La factura rectificativa se generará con importes negativos y se descontará
                del total facturado al cliente.
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Factura Rectificativa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
