/* =====================================================
   FIXTURES LOADER — SINGLE SOURCE EMITTER (POLLING)
   -----------------------------------------------------
   Fetches /fixtures and emits TODAY events.
   - Polls on an interval to avoid "works by magic" reloads
   - Adds cache-bust query param to bypass intermediate caches
   - Caches last payload for late subscribers
===================================================== */

(function () {
  if (typeof emit !== "function") {
    console.warn("[fixtures-loader] event bus not ready");
    return;
  }

  const cfg = window.AIML_LIVE_CFG || {};
  const base = cfg.fixturesBase;
  const path = cfg.fixturesPath || "/fixtures";
  const scope = (cfg.fixturesScope || "all").toLowerCase();
  const tz = cfg.timezone || "Europe/Athens";

  if (!base) {
    console.warn("[fixtures-loader] AIML_LIVE_CFG.fixturesBase missing");
    emit("today-matches:loaded", { source: "fixtures", matches: [] });
    return;
  }

  const POLL_MS = Number(cfg.fixturesPollMs || 60000);

  function buildUrl() {
    const u = new URL(base.replace(/\/$/, "") + path);
    u.searchParams.set("scope", scope === "top" ? "top" : "all");
    u.searchParams.set("tz", tz);
    // cache-bust (also helps CF edge caches & SW caches)
    u.searchParams.set("_t", String(Date.now()));
    return u.toString();
  }

  async function tick() {
    const url = buildUrl();
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      const matches = Array.isArray(j?.matches) ? j.matches : [];
      const payload = {
        source: "fixtures",
        ok: j?.ok !== false,
        date: j?.date || "",
        createdAt: j?.createdAt || Date.now(),
        matches
      };

      // cache last payload for late subscribers
      window.__AIML_LAST_TODAY__ = payload;

      emit("today-matches:loaded", payload);
    } catch (err) {
      console.error("[fixtures-loader] fetch failed", err);
      const payload = { source: "fixtures", ok: false, matches: [] };
      window.__AIML_LAST_TODAY__ = payload;
      emit("today-matches:loaded", payload);
    }
  }

  // first run immediately
  tick();

  // then poll
  if (POLL_MS > 0) {
    setInterval(tick, POLL_MS);
  }
})();