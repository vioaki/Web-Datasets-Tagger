import type { Plugin } from 'vite'

export function pwa(): Plugin {
  return {
    name: 'tagger-offline',
    apply: 'build',
    generateBundle(_, bundle) {
      const assets = ['index.html', 'icon.svg', 'favicon.svg', 'manifest.webmanifest', ...Object.keys(bundle).filter((name) => /\.(?:js|mjs|css|woff2)$/.test(name))]
      const wasm = Object.keys(bundle).filter((name) => name.endsWith('.wasm'))
      let hash = 5381
      for (const char of assets.join('|') + Date.now()) hash = (hash * 33) ^ char.charCodeAt(0)
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify({
        id: './', name: 'Web Datasets Tagger', short_name: 'Tagger', start_url: './', scope: './',
        display: 'standalone', background_color: '#fbfaf8', theme_color: '#fbfaf8',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      }) })
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const PREFIX = 'tagger:' + self.registration.scope;
const CACHE = PREFIX + ':${hash >>> 0}';
const SHELL = ${JSON.stringify(assets)}.map(path => new URL(path, self.registration.scope).href);
const RUNTIME = ${JSON.stringify(wasm)}.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Hashed WASM URLs are immutable. Keep already-used runtimes across updates
    // so updating the UI doesn't make a cached model require a new download.
    for (const url of RUNTIME) {
      const existing = await caches.match(url);
      if (existing) await cache.put(url, existing);
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX + ':') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => { if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(SHELL[0])));
  } else if (SHELL.includes(url.href) || RUNTIME.includes(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone()).catch(() => {});
      return response;
    })());
  }
});
` })
    },
  }
}
