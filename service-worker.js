// ======================================================================
// AI MatchLab ULTRA — SERVICE WORKER (v1.0.0 FINAL)
// - PWA shell caching (index, CSS, JS, icons, manifest)
// - Δεν κάνει cache τα live δεδομένα (worker /live-ultra κλπ.)
// - Υποστηρίζει SKIP_WAITING + update bar
// ======================================================================

const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE = `aiml-ultra-static-${CACHE_VERSION}`;

// Βασικά assets του UI (app shell)
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/assets/css/theme.css",
  "/assets/js/app.js",
  "/manifest.webmanifest",
  // Icons
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/maskable.png",
  "/assets/icons/apple-touch-icon.png",
  "/assets/icons/favicon.ico",
  "/assets/icons/logo.svg",
];

// ----------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  // Αν είναι ΟΚ η απάντηση, την βάζουμε στο cache
  if (response && response.status === 200 && request.method === "GET") {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && request.method === "GET") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

// ----------------------------------------------------------------------
// INSTALL
// ----------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => {
        // Δεν θέλουμε να αποτύχει ολόκληρο το SW λόγω 1 asset
        console.warn("[AI MatchLab SW] CORE_ASSETS cache error:", err);
      })
  );

  // Να γίνει άμεσα ενεργό το νέο SW
  self.skipWaiting();
});

// ----------------------------------------------------------------------
// ACTIVATE
// ----------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          // Καθαρίζουμε παλιές εκδόσεις SW
          if (key.startsWith("aiml-ultra-static-") && key !== STATIC_CACHE) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );

  self.clients.claim();
});

// ----------------------------------------------------------------------
// MESSAGE (για SKIP_WAITING από update bar)
// ----------------------------------------------------------------------

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ----------------------------------------------------------------------
// FETCH
// ----------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1) Εξαιρούμε *τελείως* άλλα origin (π.χ. Cloudflare worker, APIs κλπ.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2) Δεν πειράζουμε non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // 3) Εξαίρεση για live endpoints (αν ποτέ περάσουν από το ίδιο origin)
  if (
    url.pathname.startsWith("/live-ultra") ||
    url.pathname.startsWith("/status") ||
    url.pathname.startsWith("/health")
  ) {
    // ΠΟΤΕ cache στα live δεδομένα
    event.respondWith(fetch(request));
    return;
  }

  // 4) Navigation requests (HTML σελίδες)
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          // Προσπαθούμε πρώτα από δίκτυο (νέα έκδοση UI)
          const networkResponse = await fetch(request);
          const cache = await caches.open(STATIC_CACHE);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Offline fallback σε ό,τι έχουμε στο cache
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match("/index.html");
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  // 5) Static assets (CSS / JS / icons / manifest) → cache-first
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 6) JSON / config αρχείο (π.χ. global_leagues_master.json)
  if (url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 7) Default συμπεριφορά → cache-first (για οτιδήποτε άλλο static)
  event.respondWith(cacheFirst(request));
});
