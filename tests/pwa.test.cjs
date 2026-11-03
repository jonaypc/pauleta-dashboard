const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function loadTypescript(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(name => dependencies[name], module, module.exports)
  return module.exports
}

test('installation assets bypass authentication while app pages and documents stay protected', () => {
  const { config } = loadTypescript('middleware.ts', { '@/lib/supabase/middleware': {} })
  const matches = path => config.matcher.some(pattern => new RegExp(`^${pattern}$`).test(path))
  for (const path of ['/manifest.webmanifest', '/sw.js', '/offline.html', '/icons/icon-192.png', '/_next/static/chunks/app.js']) {
    assert.equal(matches(path), false, path)
  }
  for (const path of ['/', '/clientes', '/facturas', '/gastos', '/print/facturas/123', '/api/facturas/123/pdf', '/sw.js/private']) {
    assert.equal(matches(path), true, path)
  }
})

test('manifest retains the app identity, covers all routes and uses icons of the declared size', () => {
  const manifest = loadTypescript('app/manifest.ts').default()
  assert.equal(manifest.id, '/')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  for (const icon of manifest.icons) {
    const png = fs.readFileSync(path.join(__dirname, '..', 'public', icon.src))
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes)
  }
})

function serviceWorker(fetchImplementation, { cacheUnavailable = false } = {}) {
  const handlers = {}
  const entries = new Map()
  const cache = {
    async match(request) { return entries.get(typeof request === 'string' ? request : request.url) },
    async put(request, response) { entries.set(request.url, response) },
    async keys() { return Array.from(entries.keys(), url => ({ url })) },
    async delete(request) { return entries.delete(request.url) },
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8'), {
    self: { location: { origin: 'https://pauleta.test' }, addEventListener(name, handler) { handlers[name] = handler } },
    caches: { async open() { if (cacheUnavailable) throw new Error('storage unavailable'); return cache }, async match() { return { offline: true } } },
    fetch: fetchImplementation,
    URL,
    Response,
  })
  async function request(path, options = {}) {
    let result
    const tasks = []
    handlers.fetch({
      request: { method: 'GET', mode: 'cors', cache: 'default', url: `https://pauleta.test${path}`, ...options },
      respondWith(promise) { result = promise },
      waitUntil(promise) { tasks.push(promise) },
    })
    const response = await result
    await Promise.all(tasks)
    return response
  }
  return { request, entries }
}

test('private data, PDFs, mutations and RSC responses never enter the service worker cache', async () => {
  const worker = serviceWorker(() => { throw new Error('private requests must pass through untouched') })
  for (const path of ['/', '/facturas', '/?'+ '_rsc=abc', '/print/facturas/123', '/api/facturas/123/pdf', '/api/productos']) {
    assert.equal(await worker.request(path), undefined)
  }
  assert.equal(await worker.request('/_next/static/chunks/app.js', { method: 'POST' }), undefined)
  assert.equal(await worker.request('/_next/static/chunks/app.js?preview=1'), undefined)
  assert.equal(await worker.request('/sw.js'), undefined)
  assert.equal(worker.entries.size, 0)
})

test('immutable build assets are reused but authenticated navigation always reaches the server', async () => {
  let requests = 0
  const response = { ok: true, type: 'basic', redirected: false, headers: new Headers({ 'cache-control': 'public, max-age=31536000, immutable' }), clone() { return this } }
  const worker = serviceWorker(async () => { requests++; return response })
  await worker.request('/_next/static/chunks/hash.js')
  await worker.request('/_next/static/chunks/hash.js')
  assert.equal(requests, 1)
  await worker.request('/facturas', { mode: 'navigate' })
  await worker.request('/facturas', { mode: 'navigate' })
  assert.equal(requests, 3)
  assert.equal(worker.entries.size, 1)
})

test('failed navigation shows the connection screen without serving stale financial data', async () => {
  const worker = serviceWorker(async () => { throw new Error('offline') })
  assert.deepEqual(await worker.request('/facturas', { mode: 'navigate' }), { offline: true })
  assert.equal(worker.entries.size, 0)
})

test('redirects and non-immutable build responses are not cached', async () => {
  for (const response of [
    { ok: true, type: 'basic', redirected: true },
    { ok: true, type: 'basic', redirected: false, headers: new Headers({ 'cache-control': 'private, no-store' }) },
  ]) {
    const worker = serviceWorker(async () => response)
    await worker.request('/_next/static/chunks/hash.js')
    assert.equal(worker.entries.size, 0)
  }
})

test('unavailable browser storage cannot prevent static assets from loading', async () => {
  const response = { ok: true }
  const worker = serviceWorker(async () => response, { cacheUnavailable: true })
  assert.equal(await worker.request('/_next/static/chunks/hash.js'), response)
})
