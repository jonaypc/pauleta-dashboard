import { resumenMensual, sumarImportes } from '@/lib/relacion-facturas'

export function ResumenMensualPrint({ facturas, desde, hasta }: {
  facturas: { fecha: string; total: number }[]; desde: string; hasta: string
}) {
  const money = (total: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total)
  return (
    <section style={{ margin: '12px 0' }}>
      <h2 style={{ fontSize: 'inherit', marginBottom: '6px' }}>Resumen mensual · Importes con IGIC</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>Mes</th><th className="right" style={{ textAlign: 'right' }}>Facturas</th><th className="right" style={{ textAlign: 'right' }}>Total</th></tr></thead>
        <tbody>
          {resumenMensual(facturas, desde, hasta).map(mes => (
            <tr key={mes.mes} style={{ breakInside: 'avoid' }}><td>{mes.label}</td><td className="right" style={{ textAlign: 'right' }}>{mes.cantidad}</td><td className="right" style={{ textAlign: 'right' }}>{money(mes.total)}</td></tr>
          ))}
          <tr style={{ fontWeight: 700 }}><td>Total del periodo</td><td className="right" style={{ textAlign: 'right' }}>{facturas.length}</td><td className="right" style={{ textAlign: 'right' }}>{money(sumarImportes(facturas))}</td></tr>
        </tbody>
      </table>
    </section>
  )
}
