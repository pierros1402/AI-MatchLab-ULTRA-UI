// ======================================================================
// SAVED PANEL — AI MATCHLAB ULTRA (STABLE)
// - Renders ONLY SavedStore.getAll() into #saved-list
// - Provides Unsave (★) per item
// - Does NOT auto-open / auto-navigate
// - Filters invalid/legacy items
// ======================================================================

(function () {
  "use strict";

  const panel = document.getElementById("panel-saved");
  const list = document.getElementById("saved-list");

  if (!panel) return;
  if (!list) {
    console.warn("[saved-panel] #saved-list missing (check index.html)");
    return;
  }

  function emitBus(name, payload) {
    if (typeof window.emit === "function") window.emit(name, payload);
    else {
      try { document.dispatchEvent(new CustomEvent(name, { detail: payload })); } catch (_) {}
    }
  }

  function hasSavedStore() {
    return !!(window.SavedStore &&
      typeof window.SavedStore.getAll === "function" &&
      typeof window.SavedStore.toggle === "function" &&
      typeof window.SavedStore.isSaved === "function");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(m) {
    if (!m) return null;
    const id = m.matchId || m.id || "";
    const home = (m.home || "").trim();
    const away = (m.away || "").trim();
    // reject legacy/garbage entries that don't have teams
    if (!id || !home || !away) return null;

    return {
      id,
      matchId: id,
      home,
      away,
      kickoff: (m.kickoff || "").trim(),
      leagueName: (m.leagueName || m.league || m.league_name || "").trim()
    };
  }

  function getSavedClean() {
    if (!hasSavedStore()) return [];
    const raw = window.SavedStore.getAll() || [];
    const seen = new Set();
    const out = [];
    for (const r of raw) {
      const m = normalize(r);
      if (!m) continue;
      if (seen.has(m.matchId)) continue;
      seen.add(m.matchId);
      out.push(m);
    }
    return out;
  }

  function rowHtml(m) {
    const sub = `${m.kickoff || ""}${m.leagueName ? (m.kickoff ? " • " : "") + m.leagueName : ""}`.trim();
    return `
      <div class="saved-item" data-mid="${escapeHtml(m.matchId)}" style="position:relative;padding:10px 44px 10px 12px;border:1px solid rgba(255,255,255,.10);border-radius:12px;margin:8px 0;">
        <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escapeHtml(m.home)} vs ${escapeHtml(m.away)}
        </div>
        <div style="opacity:.75;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escapeHtml(sub)}
        </div>

        <button class="saved-unsave" type="button"
          title="Unsave" aria-label="Unsave"
          style="position:absolute;right:10px;top:50%;transform:translateY(-50%);
                 width:30px;height:28px;border-radius:10px;
                 border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);
                 cursor:pointer;font-weight:900;">
          ★
        </button>
      </div>
    `;
  }

  function render() {
    const saved = getSavedClean();

    if (!saved.length) {
      list.innerHTML = `<div class="nav-empty" style="opacity:.7;padding:10px 6px;">No saved matches yet.</div>`;
      return;
    }

    list.innerHTML = saved.map(rowHtml).join("");

    // Click behavior:
    // - click on row => match-selected
    // - click ★ => unsave (toggle) and re-render (no auto-open)
    list.querySelectorAll(".saved-item").forEach(el => {
      const mid = el.getAttribute("data-mid");

      el.addEventListener("click", (ev) => {
        const btn = ev.target.closest(".saved-unsave");
        const saved = getSavedClean();
        const match = saved.find(x => x.matchId === mid);

        if (!match) return;

        if (btn) {
          ev.preventDefault();
          ev.stopPropagation();
          window.SavedStore.toggle(match); // removes it (since it's saved)
          emitBus("saved-updated", { id: match.matchId, match });
          render();
          return;
        }

        emitBus("match-selected", match);
      });
    });
  }

  // Bind events
  function onBus(name, fn) {
    if (typeof window.on === "function") window.on(name, fn);
    else document.addEventListener(name, (e) => fn(e && e.detail));
  }

  onBus("saved-updated", render);

  // initial render
  render();
  document.addEventListener("DOMContentLoaded", render);

})();
