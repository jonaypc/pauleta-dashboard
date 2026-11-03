const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/whatsapp.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const mod = { exports: {} }
new Function('module', 'exports', 'require', compiled)(mod, mod.exports, require)
const { normalizePhone, authorizedBridge, incomingSchema, validateProposal, uniqueCustomer } = mod.exports

test('phone matching handles Spanish numbers, international prefixes and ambiguity', () => {
  assert.equal(normalizePhone('+34 600 111 222'), '34600111222')
  assert.equal(normalizePhone('0034 600111222'), '34600111222')
  assert.equal(normalizePhone('600111222'), '34600111222')
  assert.equal(normalizePhone('+44 7700 900123'), '447700900123')
  const customer = { id: 'a', telefono: '600111222' }
  assert.equal(uniqueCustomer([customer], '34600111222'), customer)
  assert.equal(uniqueCustomer([customer, { ...customer, id: 'b' }], '34600111222'), null)
})

test('bridge refuses absent, short and incorrect credentials', () => {
  const secret = 'a'.repeat(48)
  assert.equal(authorizedBridge(null, secret), false)
  assert.equal(authorizedBridge('Bearer short', 'short'), false)
  assert.equal(authorizedBridge(`Bearer ${'b'.repeat(48)}`, secret), false)
  assert.equal(authorizedBridge(`Bearer ${secret}`, secret), true)
})

test('intake rejects missing business IDs, oversized messages and injected fields', () => {
  const event = { message_id: 'wamid.test', phone_number_id: '12345678', from: '34600111222', type: 'text', text: '2 cajas de mango', timestamp: '1792770000' }
  assert.equal(incomingSchema.safeParse(event).success, true)
  assert.equal(incomingSchema.safeParse({ ...event, phone_number_id: '' }).success, false)
  assert.equal(incomingSchema.safeParse({ ...event, text: 'x'.repeat(4097) }).success, false)
  assert.equal(incomingSchema.safeParse({ ...event, cliente_id: 'injected' }).success, false)
})

test('AI cannot assign invented product IDs or silently convert boxes to units', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000'
  const proposal = { intent: 'pedido', summary: 'Dos cajas de mango', items: [{ product_id: id, description: 'Mango', quantity: 2, unit: 'caja' }], delivery: null, missing: [] }
  assert.equal(validateProposal(proposal, [{ id, unidad: 'unidad' }]).items[0].product_id, null)
  assert.equal(validateProposal(proposal, []).items[0].product_id, null)
  assert.equal(validateProposal(proposal, [{ id, unidad: 'caja' }]).items[0].product_id, id)
  assert.throws(() => validateProposal({ ...proposal, items: [{ ...proposal.items[0], quantity: -1 }] }, []))
  assert.throws(() => validateProposal({ ...proposal, intent: 'confirmado' }, []))
})

test('n8n ignores delivery receipts and handles multiple inbound messages without media downloads', () => {
  const code = fs.readFileSync(require('node:path').join(__dirname, '../integrations/n8n/normalize-whatsapp.js'), 'utf8')
  const run = new Function('$input', code)
  const result = run({ all: () => [
    { json: { statuses: [{ id: 'outbound', status: 'delivered' }] } },
    { json: { metadata: { phone_number_id: '12345678' }, contacts: [{ wa_id: '34600111222', profile: { name: 'Cliente' } }], messages: [
      { id: 'one', from: '34600111222', timestamp: '1792770000', type: 'text', text: { body: '2 cajas de mango' } },
      { id: 'two', from: '34600111222', timestamp: '1792770001', type: 'audio', audio: { id: 'media-secret' } },
    ] } },
  ] })
  assert.equal(result.length, 2)
  assert.equal(result[0].json.name, 'Cliente')
  assert.equal(result[0].json.text, '2 cajas de mango')
  assert.equal(result[1].json.type, 'audio')
  assert.equal(JSON.stringify(result).includes('media-secret'), false)
})

function intakeRoute(db) {
  const file = fs.readFileSync(require('node:path').join(__dirname, '../app/api/webhooks/whatsapp/route.ts'), 'utf8')
  const code = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', 'require', code)(module, module.exports, id => {
    if (id === '@/lib/whatsapp') return mod.exports
    if (id === '@/lib/whatsapp-server') return { bridgeEnabled: req => authorizedBridge(req.headers.get('authorization'), 's'.repeat(40)), whatsappDatabase: () => db }
    return require(id)
  })
  return module.exports.POST
}

test('intake rejects unauthorized callers and wrong business numbers, persists once, and ignores owner messages', async () => {
  const records = new Map()
  const post = intakeRoute({ from: () => ({ insert: async row => {
    if (records.has(row.message_id)) return { error: { code: '23505' } }
    records.set(row.message_id, row)
    return { error: null }
  } }) })
  const old = { phone: process.env.WHATSAPP_PHONE_NUMBER_ID, owner: process.env.WHATSAPP_OWNER_PHONE }
  process.env.WHATSAPP_PHONE_NUMBER_ID = '12345678'
  process.env.WHATSAPP_OWNER_PHONE = '34600999888'
  const event = { message_id: 'wamid.test', phone_number_id: '12345678', from: '34600111222', type: 'text', text: '2 cajas de mango', timestamp: '1792770000' }
  const request = (data, auth = true) => new Request('https://crm.example/api/webhooks/whatsapp', { method: 'POST', headers: auth ? { authorization: `Bearer ${'s'.repeat(40)}` } : {}, body: JSON.stringify(data) })
  try {
    assert.equal((await post(request(event, false))).status, 403)
    assert.equal((await post(request({ ...event, phone_number_id: '98765432' }))).status, 403)
    assert.equal(records.size, 0)
    assert.equal((await post(request(event))).status, 202)
    assert.equal((await (await post(request(event))).json()).duplicate, true)
    assert.equal(records.size, 1)
    assert.equal((await (await post(request({ ...event, message_id: 'owner-message', from: '34600999888' }))).json()).ignored, true)
    assert.equal(records.size, 1)
  } finally {
    if (old.phone === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID
    else process.env.WHATSAPP_PHONE_NUMBER_ID = old.phone
    if (old.owner === undefined) delete process.env.WHATSAPP_OWNER_PHONE
    else process.env.WHATSAPP_OWNER_PHONE = old.owner
  }
})
