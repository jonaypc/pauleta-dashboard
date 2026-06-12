'use client'

import { useEffect, useState } from 'react'
import { InformeProduccionFacturas } from '@/lib/actions/informes-produccion'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function InformeProduccionThermalPage() {
  const [informe, setInforme] = useState<InformeProduccionFacturas | null>(null)
  const router = useRouter()

  useEffect(() => {
    const data = sessionStorage.getItem('informe_produccion')
    if (data) {
      setInforme(JSON.parse(data))
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    router.back()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (!informe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando informe...</p>
      </div>
    )
  }

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: 80mm auto;
          margin: 0 !important;
        }

        @media print {
          @page { margin: 0 !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-button-container { display: none !important; }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Courier New', Courier, monospace;
          background: #fff;
          width: 80mm;
        }

        .thermal-receipt {
          width: 80mm;
          padding: 3mm;
          background: white;
        }

        .company-name {
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1mm;
          text-transform: uppercase;
        }

        .company-details {
          font-size: 9px;
          text-align: center;
          line-height: 1.3;
          margin-bottom: 3mm;
        }

        .separator {
          border-top: 1px dashed #000;
          margin: 2mm 0;
        }

        .thick-separator {
          border-top: 2px solid #000;
          margin: 2mm 0;
        }

        .doc-header {
          text-align: center;
          margin-bottom: 3mm;
        }

        .doc-type {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 1mm;
        }

        .doc-date {
          font-size: 9px;
        }

        .section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 2mm 0 1mm;
          padding: 1mm;
          background: #000;
          color: #fff;
          text-align: center;
        }

        .facturas-list {
          font-size: 8px;
          line-height: 1.4;
          margin-bottom: 2mm;
          padding: 2mm;
          background: #f5f5f5;
          border: 1px solid #ddd;
        }

        .producto-row {
          margin-bottom: 2mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #ddd;
        }

        .producto-row:last-child {
          border-bottom: none;
        }

        .producto-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
        }

        .producto-nombre {
          font-size: 9px;
          font-weight: 700;
          flex: 1;
        }

        .producto-cantidad {
          font-size: 11px;
          font-weight: 700;
          padding: 1mm 2mm;
          background: #000;
          color: #fff;
          border-radius: 2mm;
        }

        .producto-codigo {
          font-size: 8px;
          color: #666;
        }

        .total-section {
          margin: 3mm 0;
          padding: 2mm;
          border: 2px solid #000;
          text-align: center;
        }

        .total-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .total-value {
          font-size: 16px;
          font-weight: 700;
          margin-top: 1mm;
        }

        .footer-info {
          font-size: 8px;
          text-align: center;
          line-height: 1.3;
          margin-top: 2mm;
          color: #666;
        }

        .print-button-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 100;
        }
      `}} />

      {/* Botones de acción - solo en pantalla */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-10 print-button-container">
        <Button onClick={handleBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button onClick={handlePrint} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div className="thermal-receipt">
        {/* HEADER */}
        <div className="company-name">Pauleta Canaria S.L.</div>
        <div className="company-details">
          CIF: B70853163
        </div>

        <div className="thick-separator"></div>

        {/* DOCUMENT INFO */}
        <div className="doc-header">
          <div className="doc-type">Informe de Producción</div>
          <div className="doc-date">{formatDate(informe.fecha_generacion)}</div>
        </div>

        <div className="separator"></div>

        {/* FACTURAS ORIGEN */}
        <div className="section-title">
          Facturas Origen ({informe.facturas.length})
        </div>
        <div className="facturas-list">
          {informe.facturas.map((factura, idx) => (
            <div key={idx} style={{ marginBottom: '1mm' }}>
              <strong>{factura.numero}</strong> - {factura.cliente}
            </div>
          ))}
        </div>

        <div className="separator"></div>

        {/* PRODUCTOS */}
        <div className="section-title">
          Productos a Producir
        </div>

        {informe.productos.map((producto, idx) => (
          <div key={idx} className="producto-row">
            <div className="producto-header">
              <div className="producto-nombre">{producto.nombre}</div>
              <div className="producto-cantidad">{producto.cantidad_total} ud.</div>
            </div>
            {producto.codigo_barras && (
              <div className="producto-codigo">Cód: {producto.codigo_barras}</div>
            )}
          </div>
        ))}

        <div className="thick-separator"></div>

        {/* TOTAL */}
        <div className="total-section">
          <div className="total-label">Total Unidades</div>
          <div className="total-value">
            {informe.productos.reduce((sum, p) => sum + p.cantidad_total, 0)} uds.
          </div>
        </div>

        <div className="separator"></div>

        <div className="footer-info">
          Documento generado automáticamente<br />
          Pauleta Canaria S.L.
        </div>
      </div>
    </div>
  )
}
