'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Factory, Loader2 } from 'lucide-react'
import { generarInformeProduccionFacturas } from '@/lib/actions/informes-produccion'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

interface Props {
  facturasSeleccionadas: string[]
}

export function GenerarInformeProduccionButton({ facturasSeleccionadas }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGenerar = async () => {
    if (facturasSeleccionadas.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos una factura',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Generar y guardar informe en BD
      const result = await generarInformeProduccionFacturas(facturasSeleccionadas, true)

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Informe generado',
        description: `Informe ${result.data?.numero} creado correctamente`,
        variant: 'success',
      })

      // Guardar en sessionStorage para la página de impresión
      sessionStorage.setItem('informe_produccion', JSON.stringify(result.data))

      // Abrir en modal/dialog en lugar de nueva ventana (iPad PWA)
      router.push('/print/informe-produccion')
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Error al generar informe',
        variant: 'destructive',
      })
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
