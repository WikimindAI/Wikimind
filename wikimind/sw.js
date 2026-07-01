// ══════════════════════════════════════════════════════════════════
// WikiMind — Service Worker PWA
// Met en cache l'app shell (pages HTML, logo, manifest) pour que le
// site fonctionne réellement hors-ligne une fois visité une première fois.
//
// IMPORTANT : ce fichier NE touche PAS au cache des modèles IA de
// WikiMind Offline. WebLLM gère ses propres caches ("webllm/model",
// "webllm/config", "webllm/wasm") indépendamment — on les laisse
// passer sans interférer, sinon les téléchargements de modèles
// deviennent lents ou incohérents.
// ══════════════════════════════════════════════════════════════════

const SCOPE = "/Wikimind/";
const CACHE_VERSION = "wm-shell-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

// Pages / fichiers essentiels à précacher pour que le site s'ouvre hors-ligne.
// Ajoute ici toute nouvelle page que tu veux disponible hors-ligne dès l'installation.
const APP_SHELL = [
  `${SCOPE}`,
  `${SCOPE}index.html`,
  `${SCOPE}wikimind.png`,
  `${SCOPE}wikimind/manifest.json`,
  `${SCOPE}apps/Wikimind_offline.html`,
];

// Hôtes gérés par WebLLM lui-même (poids de modèles) : on ne les met JAMAIS
// en cache ici, on laisse passer tel quel vers le réseau / cache WebLLM.
const MODEL_HOSTS = [
  "huggingface.co",
  "raw.githubusercontent.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // allSettled : une seule ressource manquante ne doit pas faire échouer toute l'install
      await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("wm-shell-") && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Laisse passer les téléchargements de poids de modèles sans interférer.
  if (MODEL_HOSTS.some((h) => url.hostname.endsWith(h))) return;

  // Navigation (ouverture d'une page HTML) : réseau d'abord, cache en secours.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Ressources same-origin (images, css, js du site) : cache d'abord, réseau en secours.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Ressources tierces (polices, icônes, CDN) : cache d'abord + revalidation en arrière-plan.
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Dernier recours hors-ligne : la page d'accueil, si dispo en cache.
    const fallback = await cache.match(`${SCOPE}index.html`);
    if (fallback) return fallback;
    return new Response("Hors-ligne et page non disponible en cache.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return new Response("", { status: 504 });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    })
    .catch(() => null);
  return cached || (await networkPromise) || new Response("", { status: 504 });
}

// Permet à une page de forcer l'activation immédiate d'une nouvelle version du SW.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
