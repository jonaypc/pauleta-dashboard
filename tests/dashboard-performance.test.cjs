const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
process.env.TZ = 'UTC'

function load(file, client) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(name => {
    if (name === '@/lib/supabase/server') return { createClient: async () => client }
    if (name === 'next/cache') return { revalidatePath() {} }
    if (name === '@/lib/gocardless') return { gocardless: {} }
    throw new Error(`Unexpected dependency: ${name}`)
  }, module, module.exports)
  return module.exports
}

function deferredClient() {
  const pending = []
  return {
    pending,
    from(table) {
      const filters = []
      const query = new Proxy({}, {
        get(_, method) {
          if (method === 'then') return (resolve, reject) => new Promise(done => {
            pending.push({ table, filters, resolve: done })
          }).then(resolve, reject)
          return (...args) => { filters.push([method, ...args]); return query }
        },
      })
      return query
    },
  }
}

test('dashboard starts independent reads together and preserves totals, credit notes and rankings', async () => {
  const client = deferredClient()
  const { getDashboardData } = load('lib/dashboard-data.ts', client)
  const result = getDashboardData()
  await new Promise(setImmediate)
  assert.equal(client.pending.length, 12, 'all reads must start before any completes')
  const month = new Date().toISOString().slice(0, 7)
  const fixtures = [
    { data: [{ total: 100 }, { total: -20 }] },
    { data: [{ total: 60 }] },
    { data: [{ total: 100, fecha: `${month}-01` }] },
    { data: [{ importe: 40 }] },
    { count: 2 },
    { count: 3 },
    { data: [{ total: 100, fecha: `${month}-01` }, { total: -20, fecha: `${month}-02` }] },
    { data: [{ importe: 30, fecha: `${month}-01` }] },
    { data: [{ id: 'g1', fecha: `${month}-01`, importe: 30, numero: 'G1', proveedor: { nombre: 'Proveedor' } }] },
    { data: [{ cantidad: 20, descripcion: 'Mango' }, { cantidad: -2, descripcion: 'Mango' }] },
    { data: [{ id: 'f1', numero: 'F1', fecha: `${month}-01`, total: 100, estado: 'emitida', cliente_id: 'c1', clientes: { nombre: 'Cliente', persona_contacto: 'Tienda' } }] },
    { data: [{ cliente_id: 'c1', total: 100, clientes: { nombre: 'Cliente', persona_contacto: 'Tienda' } }, { cliente_id: 'c1', total: -20, clientes: { nombre: 'Cliente' } }] },
  ]
  client.pending.forEach((query, index) => query.resolve(fixtures[index]))
  const data = await result
  assert.equal(data.facturacionMes, 80)
  assert.equal(data.facturacionMesAnterior, 60)
  assert.equal(data.facturasEmitidas, 2)
  assert.equal(data.totalClientes, 3)
  assert.equal(data.cobrosPendientes, 100)
  assert.equal(data.cobrosMes, 40)
  assert.equal(data.totalGastosVariables, 30)
  assert.equal(data.comparativaMensual.at(-1).ingresos, 80)
  assert.equal(data.comparativaMensual.at(-1).gastos, 30)
  assert.deepEqual(data.topProductosMes, [{ nombre: 'Mango', cantidad: 18 }])
  assert.equal(data.topClientes[0].total_facturado, 80)
  assert.equal(data.topClientes[0].num_facturas, 2)
  assert.equal(data.ultimasFacturas[0].cliente.persona_contacto, 'Tienda')
})

test('treasury reads start together and preserve reconciliation and projection calculations', async () => {
  const client = deferredClient()
  const { getTreasuryStats } = load('lib/actions/tesoreria.ts', client)
  const result = getTreasuryStats()
  await new Promise(setImmediate)
  assert.equal(client.pending.length, 6)
  const fixtures = [
    { data: [{ importe: 200, estado: 'conciliado' }, { importe: -50, estado: 'conciliado' }, { importe: 900, estado: 'pendiente' }] },
    { data: [{ total: 100 }] },
    { data: [{ importe: 30 }] },
    { data: [{ total: 80 }] },
    { data: [{ importe: 20 }] },
    { count: 1 },
  ]
  client.pending.forEach((query, index) => query.resolve(fixtures[index]))
  const data = await result
  assert.equal(data.saldoActual, 150)
  assert.equal(data.ingresosPendientes, 100)
  assert.equal(data.gastosPendientes, 30)
  assert.equal(data.proyeccion30dias, 210)
  assert.equal(data.movimientosSinConciliar, 1)
  for (const index of [3, 4]) assert.equal(client.pending[index].filters.at(-1)[1], 'fecha_vencimiento')
})
