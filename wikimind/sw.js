// ══ WikiMind PWA Service Worker ══
// Cache strategy: Cache First for assets, Network First for HTML

const CACHE_NAME   = 'wikimind-v1';
const ASSETS_CACHE = 'wikimind-assets-v1';
const IMG_CACHE    = 'wikimind-images-v1';

// Shell — always cached immediately on install
const SHELL = [
  '/WikiMind/',
  '/WikiMind/index.html',
  '/WikiMind/wikimind.png',
];

// Provider logos — cached on install
const PROVIDER_ASSETS = [
  '/WikiMind/providers/groqlogo.png',
  '/WikiMind/providers/mistrallogo.png',
  '/WikiMind/providers/cerebraslogo.png',
  '/WikiMind/providers/sambanovalogo.png',
  '/WikiMind/providers/coherelogo.png',
  '/WikiMind/providers/pollinationai.png',
  '/WikiMind/providers/openailogo.png',
  '/WikiMind/providers/firebaselogo.png',
  '/WikiMind/exemples/frenchlogo.png',
];

// Example images — cached lazily as they're viewed
const EXAMPLE_IMGS = Array.from({ length: 30 }, (_, i) =>
  `/WikiMind/exemples/${i + 1}.png`
);

// ── INSTALL : cache shell + providers immediately ──
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const shell   = await caches.open(CACHE_NAME);
    const assets  = await caches.open(ASSETS_CACHE);

    await shell.addAll(SHELL).catch(() => {});
    await assets.addAll(PROVIDER_ASSETS).catch(() => {});

    // Pre-cache example images in background (non-blocking)
    caches.open(IMG_CACHE).then(c =>
      Promise.allSettled(EXAMPLE_IMGS.map(url =>
        fetch(url).then(r => r.ok ? c.put(url, r) : null).catch(() => {})
      ))
    );

    self.skipWaiting();
  })());
});

// ── ACTIVATE : clean old caches ──
self.addEventListener('activate', e => {
  const VALID = [CACHE_NAME, ASSETS_CACHE, IMG_CACHE];
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !VALID.includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH : smart routing ──
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (Firebase, Google Fonts, CDN)
  if (request.method !== 'GET') return;
  if (!url.origin.includes(self.location.hostname)) return;

  const path = url.pathname;

  // HTML → Network First (always fresh)
  if (path.endsWith('.html') || path.endsWith('/')) {
    e.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // Example images → Cache First + lazy cache
  if (path.includes('/exemples/')) {
    e.respondWith(cacheFirstLazy(request, IMG_CACHE));
    return;
  }

  // Provider logos, wikimind.png → Cache First
  if (path.includes('/providers/') || path.includes('wikimind.png')) {
    e.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // Everything else → Network with fallback
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Strategies ──

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response('Hors ligne — WikiMind', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function cacheFirstLazy(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
      return res.clone();
    }
    return res;
  } catch {
    return new Response('', { status: 408 });
  }
}
