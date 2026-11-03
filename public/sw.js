// Only public assets are stored here. Never cache HTML, RSC, APIs or documents.
const CACHE_PREFIX = 'pauleta-static-'
const CACHE_NAME = `${CACHE_PREFIX}v1`
const MAX_ENTRIES = 96
const PUBLIC_ASSETS = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png']

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(PUBLIC_ASSETS)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))
    // Claim existing tabs without reloading them or interrupting open forms.
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      return (await caches.match('/offline.html')) || Response.error()
    }))
    return
  }

  const isBuildAsset = url.pathname.startsWith('/_next/static/')
  if (!isBuildAsset && !PUBLIC_ASSETS.includes(url.pathname)) return
  if (url.search || request.cache === 'no-store') return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached

    const response = await fetch(request)
    if (response.ok && response.type === 'basic' && !response.redirected &&
        (!isBuildAsset || (response.headers.get('cache-control') || '').includes('immutable'))) {
      const copy = response.clone()
      event.waitUntil((async () => {
        await cache.put(request, copy)
        const keys = await cache.keys()
        const buildKeys = keys.filter(key => new URL(key.url).pathname.startsWith('/_next/static/'))
        await Promise.all(buildKeys.slice(0, Math.max(0, buildKeys.length - MAX_ENTRIES)).map(key => cache.delete(key)))
      })().catch(() => { /* Storage can be unavailable or full; network delivery still succeeds. */ }))
    }
    return response
  })())
})
