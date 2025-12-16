/* =========================================================
   AI MatchLab ULTRA — Odds Radar (Right Panel + Intensity)
   ---------------------------------------------------------
   Listens:
     - radar-moves:update  (Today overview moves array)
   Renders into:
     - #panel-radar (or fallback #radar-list)
========================================================= */

(function () {
  "use strict";

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  // Containers (index-compatible)
  const elPanel = $("#panel-radar") || $("#radar-list");
  const elList = $("#radar-list") || elPanel;
  const elMeta = $("#radar-meta");

  if (!elPanel) {
    console.warn("[odds-radar] #panel-radar not found.");
    return;
  }

  const state = {
    bestByMatch: Object.create(null),
    market: "1X2",
    threshold: 0.20
  };

  function setMeta(text) {
    if (elMeta) elMeta.textContent = text;
  }

  function formatDelta(d) {
    const n = Number(d);
    if (!Number.isFinite(n)) return "0.00";
    const sign = n >= 0 ? "+" : "";
    return sign + n.toFixed(2);
  }

  function pickTitle(it) {
    if (it && it.matchTitle) return it.matchTitle;
    if (it && it.match) return it.match;
    if (it && (it.home || it.away)) return `${it.home || "Home"} vs ${it.away || "Away"}`;
    return (it && it.matchId) ? String(it.matchId) : "Unknown match";
  }

  function render() {
    const items = Object.values(state.bestByMatch || {});
    items.sort((a, b) => Math.abs(Number(b.delta || 0)) - Math.abs(Number(a.delta || 0)));

    if (!items.length) {
      if (elList) elList.innerHTML =
        `<div class="right-empty">No significant ${esc(state.market)} movements yet.</div>`;
      setMeta("No significant moves");
      return;
    }

    setMeta(`Δ≥${state.threshold.toFixed(2)} · ${items.length}`);

    const html = items.map(it => {
      const title = pickTitle(it);
      const delta = Number(it.delta ?? it.D ?? 0);
      const sign = (delta >= 0) ? "pos" : "neg";
      const intense = (Math.abs(delta) >= 0.40) ? "true" : "false";
      const critical = (Math.abs(delta) >= 0.60) ? "true" : "false";

      const src = it.source || it.bookmaker || it.provider || "";
      const book = (it.bookmaker && src !== it.bookmaker) ? ` · ${it.bookmaker}` : "";
      const label = it.label ? ` · ${it.label}` : "";

      const o = (it.opening != null) ? Number(it.opening) : null;
      const c = (it.current != null) ? Number(it.current) : null;

      const oddsLine = (Number.isFinite(o) && Number.isFinite(c))
        ? `<div class="right-sub">${esc(o.toFixed(2))} → ${esc(c.toFixed(2))}</div>`
        : "";

      return `
        <div class="right-item"
             data-delta="${esc(delta)}"
             data-sign="${esc(sign)}"
             data-intense="${esc(intense)}"
             data-critical="${esc(critical)}">
          <div class="right-main"><strong>${esc(title)}</strong></div>
          <div class="right-sub">Δ ${esc(formatDelta(delta))}${src ? " · " + esc(src) : ""}${esc(book)}${esc(label)}</div>
          ${oddsLine}
        </div>
      `;
    }).join("");

    if (elList) elList.innerHTML = html;
  }

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, (e) => fn(e.detail));
  }

  document.addEventListener("DOMContentLoaded", () => {
    onSafe("radar-moves:update", (p) => {
      const arr = Array.isArray(p?.moves) ? p.moves : [];
      console.log("[RADAR] radar-moves:update received", arr.length, "items");

      state.market = p?.market || state.market;
      state.threshold = Number(p?.threshold ?? state.threshold) || state.threshold;

      state.bestByMatch = Object.create(null);
      arr.forEach(it => {
        const key = it.matchId || it.matchTitle || it.match || ("M_" + Math.random());
        state.bestByMatch[key] = it;
      });

      render();
    });

    render();
  });

})();
