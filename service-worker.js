// AI MatchLab ULTRA — SERVICE WORKER RESET (kill switch)

self.addEventListener("install", () => {
  // Activate immediately and override older SWs
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Claim all tabs immediately to override old SW versions
    self.clients.claim().then(async () => {
      // Delete all caches so the UI loads fresh
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    })
  );
});
