const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const ts=require('typescript')
const m={exports:{}}
const compiled=ts.transpileModule(fs.readFileSync('lib/invoice-filters.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
new Function('module','exports',compiled)(m,m.exports)
const {invoiceStatusHref}=m.exports
for(const estado of ['', 'emitida', 'borrador', 'cobrada', 'anulada']) {
  test(`status ${estado || 'Todos'} retains client, dates, search and size and resets pagination`,()=>{
    const query={cliente:'cliente-1',estado:'emitida',q:'F 12&3',from:'2026-01-01',to:'2026-11-03',page:'4',limit:'50'}
    const params=new URL(invoiceStatusHref(query,estado),'https://example.test').searchParams
    assert.equal(params.get('cliente'),query.cliente)
    assert.equal(params.get('estado'),estado)
    assert.equal(params.has('estado'),true)
    for(const key of ['q','from','to','limit'])assert.equal(params.get(key),query[key])
    assert.equal(params.has('page'),false)
    assert.equal(query.page,'4')
  })
}
test('Todos stays explicit even when no other filters are selected',()=>{
  assert.equal(invoiceStatusHref({},''),'/facturas?estado=')
})
