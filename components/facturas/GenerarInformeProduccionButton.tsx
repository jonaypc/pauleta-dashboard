'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Factory, Loader2 } from 'lucide-react'
import { generarInformeProduccionFacturas } from '@/lib/actions/informes-produccion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  facturasSeleccionadas: string[]
}

export function GenerarInformeProduccionButton({ facturasSeleccionadas }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGenerar = async () => {
    if (facturasSeleccionadas.length === 0) {
      toast.error('Selecciona al menos una factura')
      return
    }

    setLoading(true)
    try {
      const result = await generarInformeProduccionFacturas(facturasSeleccionadas)

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Guardar en sessionStorage para la página de impresión
      sessionStorage.setItem('informe_produccion', JSON.stringify(result.data))

      // Abrir en modal/dialog en lugar de nueva ventana (iPad PWA)
      router.push('/print/informe-produccion')
    } catch (error) {
      console.error(error)
      toast.error('Error al generar informe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGenerar}
      disabled={facturasSeleccionadas.length === 0 || loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <Factory className="mr-2 h-4 w-4" />
          Informe Producción ({facturasSeleccionadas.length})
        </>
      )}
    </Button>
  )
}
