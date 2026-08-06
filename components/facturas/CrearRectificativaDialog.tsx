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
import { toast } from '@/hooks/use-toast'
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
      toast({
        title: 'Error',
        description: 'Debes especificar el motivo de la rectificación',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Validar que haya al menos una línea modificada
    const lineasArray = Object.entries(lineasModificadas).map(([lineaId, datos]) => {
      // Buscar la línea original para obtener el precio si no se especificó
      const lineaOriginal = factura.lineas?.find(l => l.id === lineaId)

      return {
        linea_original_id: lineaId,
        cantidad: datos.cantidad || 0,
        precio_unitario: datos.precio || lineaOriginal?.precio_unitario || 0
      }
    }).filter(linea => linea.cantidad !== 0) // Solo enviar líneas con cantidad

    if (lineasArray.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes especificar al menos una línea a rectificar',
        variant: 'destructive',
      })
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
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Éxito',
          description: 'Factura rectificativa creada correctamente',
          variant: 'success',
        })
        setOpen(false)
        router.push(`/facturas/${result.id}`)
        router.refresh()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al crear la factura rectificativa',
        variant: 'destructive',
      })
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
                          placeholder="ej: -24"
                          className="text-right"
                          value={lineasModificadas[linea.id]?.cantidad || ''}
                          onChange={(e) => actualizarLinea(linea.id, 'cantidad', parseFloat(e.target.value) || 0)}
                        />
                        <p className="text-xs text-red-600 font-medium mt-1">
                          ⚠️ Usa SIGNO NEGATIVO: -24
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

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm text-red-900 font-semibold mb-2">
                ⚠️ IMPORTANTE: Para devoluciones, usa cantidades NEGATIVAS
              </p>
              <p className="text-sm text-red-800 mb-2">
                <strong>Ejemplo correcto:</strong> Si devuelven 10 polos → escribe <code className="bg-red-100 px-1 rounded">-10</code>
              </p>
              <p className="text-sm text-red-800 mb-2">
                <strong>Ejemplo INCORRECTO:</strong> NO escribas <code className="bg-red-100 px-1 rounded line-through">10</code> (sin signo negativo)
              </p>
              <p className="text-sm text-muted-foreground">
                El precio unitario siempre es positivo. Solo la cantidad lleva signo negativo.
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
