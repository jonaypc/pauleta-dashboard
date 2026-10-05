const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { NextRequest, NextResponse } = require('next/server')

const root = path.resolve(__dirname, '..')

// Run the actual TypeScript modules with isolated Auth/DB/email boundaries.
function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText
  const module = { exports: {} }
  const requireMock = name => {
    if (name in mocks) return mocks[name]
    if (name.startsWith('@/components/')) return { PrintButton: () => null }
    return require(name)
  }
  vm.runInNewContext(code, {
    module, exports: module.exports, require: requireMock,
    process: { env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
      RESEND_API_KEY: 'resend-test-key',
    } },
    console, Buffer, URL,
  }, { filename: file })
  return module.exports
}

const navigation = {
  redirect(url) { throw new Error(`REDIRECT:${url}`) },
  notFound() { throw new Error('NOT_FOUND') },
}

function server(client, keys = []) {
  return load('lib/supabase/server.ts', {
    '@supabase/ssr': { createServerClient(url, key) { keys.push(key); return client } },
    'next/headers': { cookies: () => ({ getAll: () => [], set() {} }) },
    'next/navigation': navigation,
  })
}

const documentPages = [
  'albaran/[id]', 'control-cambios/[clienteId]',
  'control-cambios/registro/[id]', 'facturas/[id]',
  'plantilla-albaran', 'relacion-facturas',
].flatMap(route => [`app/print/${route}/page.tsx`, `app/print/thermal/${route}/page.tsx`])

for (const state of ['anonymous', 'expired']) {
  test(`${state}: every server print page rejects before reading any table`, async () => {
    const client = {
      auth: { getUser: async () => ({
        data: { user: state === 'expired' ? { id: 'unverified' } : null },
        error: state === 'expired' ? new Error('invalid token') : null,
      }) },
      from() { assert.fail('Document data must never be read without verified Auth') },
    }
    const auth = server(client)
    for (const file of [...documentPages, 'app/print/layout.tsx']) {
      const page = load(file, {
        '@/lib/supabase/server': auth,
        'next/navigation': navigation,
      }).default
      await assert.rejects(page({
        params: { id: 'invoice-id', clienteId: 'client-id' },
        searchParams: { cif: 'B02973170', desde: '2025-10-01', hasta: '2026-09-30' },
        children: null,
      }), /REDIRECT:\/login/, file)
    }
  })
}

test('verified print client uses the session-aware anon key, never service role', async () => {
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'staff' } }, error: null }) } }
  const keys = []
  assert.equal(await server(client, keys).createAuthenticatedClient(), client)
  assert.deepEqual(keys, ['anon-test-key'])
})

for (const thermal of [false, true]) {
  test(`authorized ${thermal ? 'thermal' : 'A4'} relationship renders invoices and credits through RLS`, async () => {
    const calls = []
    const company = { nombre: 'Pauleta', cif: 'B70853163' }
    const customer = { id: 'client-id', nombre: 'Excodimo', cif: 'B02973170', persona_contacto: 'Tienda' }
    const invoices = [
      { id: '1', numero: 'F1', fecha: '2025-10-01', total: 103, cliente: customer },
      { id: '2', numero: 'R1', fecha: '2025-10-02', total: -10.3, cliente: customer },
    ]
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: 'staff' } }, error: null }) },
      from(table) {
        calls.push(['from', table])
        const result = { data: table === 'empresa' ? company : table === 'clientes' ? [customer] : invoices, error: null }
        const query = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) }
        for (const method of ['select', 'single', 'in', 'gte', 'lte', 'neq', 'order']) {
          query[method] = (...args) => { calls.push([method, ...args]); return query }
        }
        return query
      },
    }
    const file = `app/print/${thermal ? 'thermal/' : ''}relacion-facturas/page.tsx`
    const page = load(file, { '@/lib/supabase/server': server(client), 'next/navigation': navigation }).default
    const output = JSON.stringify(await page({ searchParams: {
      cif: 'B02973170', desde: '2025-10-01', hasta: '2026-09-30', periodo: 'mensual',
    } }))
    assert.match(output, /F1/)
    assert.match(output, /R1/)
    assert.match(output, thermal ? /92,70/ : /92\.70/)
    assert.ok(calls.some(c => c[0] === 'neq' && c[1] === 'estado' && c[2] === 'anulada'))
    assert.ok(calls.some(c => c[0] === 'gte' && c[2] === '2025-10-01'))
    assert.ok(calls.some(c => c[0] === 'lte' && c[2] === '2026-09-30'))
  })
}

test('middleware includes all print routes and retains query parameters and refreshed cookies on login', async () => {
  const { config } = load('middleware.ts', { '@/lib/supabase/middleware': {} })
  const matcher = new RegExp(`^${config.matcher[0]}$`)
  for (const file of documentPages) {
    assert.ok(matcher.test('/' + file.replace(/^app\//, '').replace(/\/page\.tsx$/, '')))
  }
  const url = 'https://pauleta.example/print/relacion-facturas?cif=B02973170&desde=2025-10-01&hasta=2026-09-30'
  const { updateSession } = load('lib/supabase/middleware.ts', {
    '@supabase/ssr': { createServerClient(url, key, options) { return {
      auth: { getUser: async () => {
        options.cookies.setAll([{ name: 'sb-test', value: 'cleared', options: { path: '/' } }])
        return { data: { user: null }, error: null }
      } },
    } } },
    'next/server': { NextResponse },
  })
  const response = await updateSession(new NextRequest(url))
  assert.equal(response.status, 307)
  const target = new URL(response.headers.get('location'))
  assert.equal(target.pathname, '/login')
  assert.equal(target.searchParams.get('redirect'), new URL(url).pathname + new URL(url).search)
  assert.equal(response.cookies.get('sb-test').value, 'cleared')
})

test('verified session with no RLS-visible customers cannot render the requested report', async () => {
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'restricted-user' } }, error: null }) },
    from(table) {
      const query = {
        select() { return query },
        single: async () => ({ data: null, error: null }),
        in: async () => ({ data: [], error: null }),
      }
      if (table === 'facturas') assert.fail('Cannot fetch invoices for invisible customers')
      return query
    },
  }
  for (const thermal of [false, true]) {
    const page = load(`app/print/${thermal ? 'thermal/' : ''}relacion-facturas/page.tsx`, {
      '@/lib/supabase/server': server(client), 'next/navigation': navigation,
    }).default
    await assert.rejects(page({ searchParams: {
      cif: 'B02973170', desde: '2025-10-01', hasta: '2026-09-30',
    } }), /NOT_FOUND/)
  }
})

test('invoice emails attach the PDF and expose no internal print link; missing PDF prevents sending', async () => {
  const sent = []
  const { sendInvoiceEmail } = load('lib/email.ts', {
    resend: { Resend: class { emails = { send: async input => { sent.push(input); return { data: { id: 'email-id' }, error: null } } } } },
  })
  const params = { to: 'client@example.test', facturaNumero: 'F1', clienteNombre: 'Excodimo', total: 103, fecha: '2026-09-01', empresaNombre: 'Pauleta' }
  await assert.rejects(sendInvoiceEmail(params), /sin el PDF adjunto/)
  await assert.rejects(sendInvoiceEmail({ ...params, pdfBuffer: Buffer.alloc(0) }), /sin el PDF adjunto/)
  assert.equal(sent.length, 0)
  const pdf = Buffer.from('%PDF-test')
  await sendInvoiceEmail({ ...params, pdfBuffer: pdf })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].attachments[0].content, pdf)
  assert.doesNotMatch(sent[0].html, /\/print\/|Ver factura completa/)
})
