import { createClient } from "@/lib/supabase/server"

export async function getDashboardData() {
  // Default safe data
  const defaultData = {
    facturacionMes: 0,
    facturacionMesAnterior: 0,
    cobrosPendientes: 0,
    cobrosMes: 0,
    facturasEmitidas: 0,
    totalClientes: 0,
    ultimasFacturas: [],
    gastosPendientes: [],
    topClientes: [],
    numFacturasPendientes: 0,
    diasPromedioPendiente: 0,
    comparativaMensual: [],
    topProductosMes: [],
    nombreMes: new Date().toLocaleDateString('es-ES', { month: 'long' }),
    totalGastosFijos: 0,
    totalGastosVariables: 0,
  }

  try {
    const supabase = await createClient()

    const now = new Date()
    const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
    const hace6Meses = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]
    const nombreMes = now.toLocaleDateString('es-ES', { month: 'long' })

    // Independent queries share this request's authenticated client and run together.
    const [
      { data: facturasMes },
      { data: facturasMesAnterior },
      { data: facturasPendientes },
      { data: cobrosMesData },
      { count: facturasEmitidasCount },
      { count: totalClientesCount },
      { data: facturas6Meses },
      { data: gastos6Meses },
      { data: gastosPendientes },
      { data: lineasMes },
      { data: ultimasFacturas },
      { data: facturasClientes },
    ] = await Promise.all([
      supabase
        .from('facturas')
        .select('total')
        .gte('fecha', primerDiaMes)
        .neq('estado', 'anulada'),
      supabase
        .from('facturas')
        .select('total')
        .gte('fecha', primerDiaMesAnterior)
        .lte('fecha', ultimoDiaMesAnterior)
        .neq('estado', 'anulada'),
      supabase
        .from('facturas')
        .select('total, fecha')
        .eq('estado', 'emitida'),
      supabase
        .from('cobros')
        .select('importe')
        .gte('fecha', primerDiaMes),
      supabase
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', primerDiaMes)
        .neq('estado', 'anulada'),
      supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true),
      supabase
        .from('facturas')
        .select('fecha, total')
        .gte('fecha', hace6Meses)
        .neq('estado', 'anulada'),
      supabase
        .from('gastos')
        .select('fecha, importe')
        .gte('fecha', hace6Meses),
      supabase
        .from('gastos')
        .select(`
              id, fecha, importe, numero,
              proveedor:proveedores(nombre)
          `)
        .eq('estado', 'pendiente')
        .order('fecha', { ascending: true }) // Oldest first (most urgent)
        .limit(5),
      supabase
        .from('lineas_factura')
        .select(`
          cantidad, descripcion,
          factura:facturas!inner(fecha, estado)
        `)
        .gte('factura.fecha', primerDiaMes)
        .neq('factura.estado', 'anulada'),
      supabase
        .from('facturas')
        .select(`
          id,
          numero,
          fecha,
          total,
          estado,
          cliente_id,
          clientes (nombre, persona_contacto)
        `)
        .order('fecha', { ascending: false })
        .order('numero', { ascending: false })
        .limit(5),
      supabase
        .from('facturas')
        .select(`
          cliente_id,
          total,
          clientes (nombre, persona_contacto)
        `)
        .neq('estado', 'anulada'),
    ])

    const facturacionMes = facturasMes?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

    const facturacionMesAnterior = facturasMesAnterior?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

    const cobrosPendientes = facturasPendientes?.reduce((sum, f) => sum + (f.total || 0), 0) || 0
    const numFacturasPendientes = facturasPendientes?.length || 0

    // Calcular días promedio de antigüedad de facturas pendientes
    const facturasValidas = facturasPendientes?.filter(f => f.fecha && !isNaN(new Date(f.fecha).getTime())) || []
    const diasPromedioPendienteTotal = facturasValidas.length
      ? facturasValidas.reduce((sum, f) => {
        const dias = Math.floor((now.getTime() - new Date(f.fecha).getTime()) / (1000 * 60 * 60 * 24))
        return sum + Math.max(0, dias)
      }, 0) / facturasValidas.length
      : 0

    const diasPromedioPendiente = isNaN(diasPromedioPendienteTotal) ? 0 : Math.round(diasPromedioPendienteTotal)

    const cobrosMes = cobrosMesData?.reduce((sum, c) => sum + (c.importe || 0), 0) || 0

    // 3. (REMOVED) Fetch Fixed Payments - Now using only REAL expenses from 'gastos' table
    const totalGastosFijos = 0

    const comparativaMensual: { mes: string; ingresos: number; gastos: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      const nombreMesGraph = fecha.toLocaleDateString('es-ES', { month: 'short' })

      const ingresos = (facturas6Meses || [])
        .filter(f => f.fecha && typeof f.fecha === 'string' && f.fecha.startsWith(mesKey))
        .reduce((sum, f) => sum + (f.total || 0), 0) || 0

      const gastosTotalesMes = (gastos6Meses || [])
        .filter(g => g.fecha && typeof g.fecha === 'string' && g.fecha.startsWith(mesKey))
        .reduce((sum, g) => sum + (g.importe || 0), 0) || 0

      comparativaMensual.push({
        mes: nombreMesGraph,
        ingresos,
        gastos: gastosTotalesMes
      })
    }

    const productosVendidos: Record<string, { nombre: string; cantidad: number }> = {}
    lineasMes?.forEach((l: any) => {
      const key = l.descripcion || "Sin descripción"
      if (!productosVendidos[key]) {
        productosVendidos[key] = { nombre: key, cantidad: 0 }
      }
      productosVendidos[key].cantidad += Number(l.cantidad || 0)
    })
    const topProductosMes = Object.values(productosVendidos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    const facturasFormateadas = ultimasFacturas?.map(f => {
      const clienteData = f.clientes as any
      let clienteNombre = 'Sin nombre'
      let clienteContacto = undefined

      if (clienteData) {
        if (Array.isArray(clienteData) && clienteData[0]) {
          clienteNombre = clienteData[0].nombre
          clienteContacto = clienteData[0].persona_contacto
        } else if (typeof clienteData === 'object') {
          clienteNombre = clienteData.nombre
          clienteContacto = clienteData.persona_contacto
        }
      }

      return {
        id: f.id,
        numero: f.numero,
        fecha: f.fecha,
        total: f.total,
        estado: f.estado,
        cliente_id: f.cliente_id,
        cliente: {
          nombre: clienteNombre,
          persona_contacto: clienteContacto
        }
      }
    }) || []

    const totalGastosVariables = (gastos6Meses || [])
      .filter(g => g.fecha && typeof g.fecha === 'string' && g.fecha.startsWith(primerDiaMes.slice(0, 7)))
      .reduce((sum, g) => sum + (g.importe || 0), 0) || 0

    const clienteStats: Record<string, { cliente_id: string; nombre: string; total_facturado: number; num_facturas: number }> = {}

    facturasClientes?.forEach(factura => {
      if (!factura.cliente_id) return
      const clienteData = factura.clientes as any
      let clienteNombre = 'Sin nombre'

      if (clienteData) {
        if (Array.isArray(clienteData) && clienteData[0]) {
          clienteNombre = clienteData[0].persona_contacto || clienteData[0].nombre
        } else if (typeof clienteData === 'object') {
          clienteNombre = clienteData.persona_contacto || clienteData.nombre
        }
      }

      if (!clienteStats[factura.cliente_id]) {
        clienteStats[factura.cliente_id] = {
          cliente_id: factura.cliente_id,
          nombre: clienteNombre,
          total_facturado: 0,
          num_facturas: 0,
        }
      }
      clienteStats[factura.cliente_id].total_facturado += factura.total || 0
      clienteStats[factura.cliente_id].num_facturas += 1
    })
    const topClientesList = Object.values(clienteStats)
      .sort((a, b) => b.total_facturado - a.total_facturado)
      .slice(0, 5)

    const result = {
      facturacionMes,
      facturacionMesAnterior,
      cobrosPendientes,
      cobrosMes,
      facturasEmitidas: facturasEmitidasCount || 0,
      totalClientes: totalClientesCount || 0,
      ultimasFacturas: facturasFormateadas,
      gastosPendientes: gastosPendientes || [],
      topClientes: topClientesList,
      numFacturasPendientes,
      diasPromedioPendiente,
      comparativaMensual,
      topProductosMes,
      nombreMes,
      totalGastosFijos,
      totalGastosVariables,
    }

    // Sanitizar números para evitar errores de serialización (NaN/Infinity)
    const sanitizeNumber = (n: any) => {
      const num = Number(n)
      return (typeof num === 'number' && isFinite(num)) ? num : 0
    }

    return {
      ...result,
      facturacionMes: sanitizeNumber(result.facturacionMes),
      facturacionMesAnterior: sanitizeNumber(result.facturacionMesAnterior),
      cobrosPendientes: sanitizeNumber(result.cobrosPendientes),
      cobrosMes: sanitizeNumber(result.cobrosMes),
      numFacturasPendientes: sanitizeNumber(result.numFacturasPendientes),
      diasPromedioPendiente: sanitizeNumber(result.diasPromedioPendiente),
      totalGastosFijos: sanitizeNumber(result.totalGastosFijos),
      totalGastosVariables: sanitizeNumber(result.totalGastosVariables),
      comparativaMensual: result.comparativaMensual.map((v: any) => ({
        ...v,
        ingresos: sanitizeNumber(v.ingresos),
        gastos: sanitizeNumber(v.gastos)
      })),
      topClientes: result.topClientes.map(c => ({
        ...c,
        total_facturado: sanitizeNumber(c.total_facturado)
      })),
      topProductosMes: result.topProductosMes.map(p => ({
        ...p,
        cantidad: sanitizeNumber(p.cantidad)
      })),
      ultimasFacturas: result.ultimasFacturas.map(f => ({
        ...f,
        total: sanitizeNumber(f.total)
      })),
      gastosPendientes: result.gastosPendientes.map(g => ({
        ...g,
        id: g.id,
        fecha: g.fecha,
        importe: sanitizeNumber(g.importe),
        numero: g.numero || '',
        proveedor: g.proveedor ? { nombre: (g.proveedor as any).nombre } : null
      }))
    }
  } catch (error) {
    console.error('CRITICAL ERROR IN GETDASHBOARDDATA:', error)
    // Return safe defaults instead of crashing the whole tree
    return defaultData
  }
}
