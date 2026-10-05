const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, require: name =>
    name === '@/lib/relacion-facturas' ? load('lib/relacion-facturas.ts') : require(name), Date, console })
  return module.exports
}
const { calcularRango, validarRango, ultimosDoceMeses, resumenMensual, sumarImportes, obtenerFacturasRelacion } = load('lib/relacion-facturas.ts')
const filtros = { periodo: 'personalizado', mes: '2026-10', anio: '2026', desde: '2025-10-01', hasta: '2026-09-30' }

test('annual and cross-year ranges include both boundaries; leap February and quincenas remain valid', () => {
  for (const [params, desde, hasta] of [
    [filtros, '2025-10-01', '2026-09-30'],
    [{ ...filtros, periodo: 'anual' }, '2026-01-01', '2026-12-31'],
    [{ ...filtros, periodo: 'mensual', mes: '2024-02' }, '2024-02-01', '2024-02-29'],
    [{ ...filtros, periodo: '1', mes: '2025-02' }, '2025-02-01', '2025-02-15'],
    [{ ...filtros, periodo: '2', mes: '2025-02' }, '2025-02-16', '2025-02-28'],
  ]) {
    const rango = calcularRango(params)
    assert.equal(rango.desde, desde)
    assert.equal(rango.hasta, hasta)
  }
  assert.equal(calcularRango({ ...filtros, periodo: 'anual' }).label, 'Año completo')
})

test('invalid, missing and reversed dates never become a database query', () => {
  for (const [desde, hasta] of [['', '2026-09-30'], ['2025-02-29', '2026-09-30'], ['2026-10-01', '2026-09-30'], ['2026-13-01', '2026-14-01']]) {
    assert.throws(() => validarRango(desde, hasta))
  }
  assert.throws(() => calcularRango({ ...filtros, periodo: 'mensual', mes: '' }))
  assert.throws(() => calcularRango({ ...filtros, periodo: 'anual', anio: 'NaN' }))
})

test('last twelve complete months select the requested October 2025–September 2026 interval', () => {
  const range = ultimosDoceMeses(new Date(2026, 9, 5))
  assert.equal(range.desde, '2025-10-01')
  assert.equal(range.hasta, '2026-09-30')
  const january = ultimosDoceMeses(new Date(2026, 0, 5))
  assert.equal(january.desde, '2025-01-01')
  assert.equal(january.hasta, '2025-12-31')
})

test('monthly totals include zero months, negative credits, exact cents and only in-range invoices', () => {
  const invoices = [
    { fecha: '2025-10-01', total: 100.1 }, { fecha: '2025-10-31', total: 0.2 },
    { fecha: '2026-09-30', total: -10.3 }, { fecha: '2026-10-01', total: 999 },
  ]
  const months = resumenMensual(invoices, filtros.desde, filtros.hasta)
  assert.equal(months.length, 12)
  assert.equal(months[0].mes, '2025-10')
  assert.equal(months[0].cantidad, 2)
  assert.equal(months[0].total, 100.3)
  assert.equal(months[1].cantidad, 0)
  assert.equal(months[1].total, 0)
  assert.equal(months[11].mes, '2026-09')
  assert.equal(months[11].total, -10.3)
  assert.equal(sumarImportes(months), 90)
  assert.equal(sumarImportes([{ total: 0.1 }, { total: 0.2 }, { total: -0.3 }]), 0)
})

function database(rows, failAt, serverLimit = 500) {
  const calls = []
  return { calls, from(table) {
    assert.equal(table, 'facturas')
    const query = {}
    for (const method of ['select', 'in', 'gte', 'lte', 'neq', 'order']) {
      query[method] = (...args) => { calls.push([method, ...args]); return query }
    }
    query.range = async (start, end) => {
      calls.push(['range', start, end])
      return start >= failAt ? { data: null, error: new Error('Database unavailable') }
        : { data: rows.slice(start, Math.min(end + 1, start + serverLimit)), error: null, count: rows.length }
    }
    return query
  } }
}

test('all 1,205 invoices are retrieved, including with a server page cap below 500', async () => {
  const rows = Array.from({ length: 1205 }, (_, i) => ({ id: String(i), cliente_id: i % 2 ? 'branch-1' : 'branch-2', fecha: '2026-01-01', total: '0.10', cliente: { nombre: 'Excodimo', cif: 'B02973170', persona_contacto: null } }))
  for (const limit of [500, 100]) {
    const db = database(rows, Infinity, limit)
    const result = await obtenerFacturasRelacion(db, ['branch-1', 'branch-2'], filtros.desde, filtros.hasta)
    assert.equal(result.length, 1205)
    assert.equal(new Set(result.map(f => f.id)).size, 1205)
    assert.equal(sumarImportes(result), 120.5)
    assert.ok(db.calls.some(c => c[0] === 'neq' && c[1] === 'estado' && c[2] === 'anulada'))
    assert.ok(db.calls.some(c => c[0] === 'order' && c[1] === 'id'))
    assert.ok(db.calls.some(c => c[0] === 'in' && c[1] === 'cliente_id' && c[2].length === 2))
  }
})

test('a later page failure rejects the whole report instead of showing a partial annual total', async () => {
  const db = database(Array.from({ length: 600 }, (_, i) => ({ id: String(i), total: 1 })), 500)
  await assert.rejects(obtenerFacturasRelacion(db, ['branch-1'], filtros.desde, filtros.hasta), /Database unavailable/)
})

test('printed monthly summary contains twelve months and the same net period total', () => {
  const { ResumenMensualPrint } = load('components/informes/ResumenMensualPrint.tsx')
  const html = renderToStaticMarkup(ResumenMensualPrint({
    facturas: [{ fecha: '2025-10-01', total: 103 }, { fecha: '2026-09-30', total: -10.3 }],
    desde: filtros.desde, hasta: filtros.hasta,
  }))
  assert.match(html, /octubre de 2025/)
  assert.match(html, /septiembre de 2026/)
  assert.match(html, /Total del periodo/)
  assert.match(html, /92,70/)
  assert.equal((html.match(/<tr/g) || []).length, 14)
})
