// ══ WikiMind PWA Service Worker ══
const BASE = 'https://wikimindai.github.io/Wikimind';
const CACHE_NAME   = 'wikimind-v1';
const ASSETS_CACHE = 'wikimind-assets-v1';
const IMG_CACHE    = 'wikimind-images-v1';

const SHELL = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/wikimind.png`,
];

const PROVIDER_ASSETS = [
  `${BASE}/providers/groqlogo.png`,
  `${BASE}/providers/mistrallogo.png`,
  `${BASE}/providers/cerebraslogo.png`,
  `${BASE}/providers/sambanovalogo.png`,
  `${BASE}/providers/coherelogo.png`,
  `${BASE}/providers/pollinationai.png`,
  `${BASE}/providers/openailogo.png`,
  `${BASE}/providers/firebaselogo.png`,
  `${BASE}/exemples/frenchlogo.png`,
];

const EXAMPLE_IMGS = Array.from({ length: 30 }, (_, i) =>
  `${BASE}/exemples/${i + 1}.png`
);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const shell  = await caches.open(CACHE_NAME);
    const assets = await caches.open(ASSETS_CACHE);
    await shell.addAll(SHELL).catch(() => {});
    await assets.addAll(PROVIDER_ASSETS).catch(() => {});
    caches.open(IMG_CACHE).then(c =>
      Promise.allSettled(EXAMPLE_IMGS.map(url =>
        fetch(url).then(r => r.ok ? c.put(url, r) : null).catch(() => {})
      ))
    );
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  const VALID = [CACHE_NAME, ASSETS_CACHE, IMG_CACHE];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !VALID.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.href.startsWith(BASE)) return;
  const path = url.pathname;

  if (path.endsWith('.html') || path.endsWith('/')) {
    e.respondWith(networkFirst(request, CACHE_NAME));
  } else if (path.includes('/exemples/')) {
    e.respondWith(cacheFirstLazy(request, IMG_CACHE));
  } else if (path.includes('/providers/') || path.includes('wikimind.png')) {
    e.respondWith(cacheFirst(request, ASSETS_CACHE));
  } else {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});

async function networkFirst(req, name) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(name)).put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req)) || new Response('Hors ligne', { headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(req, name) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(name)).put(req, res.clone());
    return res;
  } catch { return new Response('', { status: 408 }); }
}

async function cacheFirstLazy(req, name) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) { (await caches.open(name)).put(req, res.clone()); return res.clone(); }
    return res;
  } catch { return new Response('', { status: 408 }); }
}
