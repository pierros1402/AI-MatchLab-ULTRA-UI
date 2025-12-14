/* AI MatchLab ULTRA — SAFE SW (NO CACHE)
   Purpose: installability + lifecycle only
   - No precache
   - No runtime caching
   - No fetch interception
*/

self.addEventListener("install", (event) => {
  // activate immediately (no waiting)
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // take control of existing clients
  event.waitUntil(self.clients.claim());
});

// IMPORTANT: no "fetch" handler -> network behaves exactly as before
