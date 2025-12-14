// ======================================================================
// SAVED PANEL — AI MATCHLAB ULTRA (GLOBAL SCRIPT)
// Left panel: Saved matches + (optional) Live Saved-only view
// Depends on SavedStore + optional window.AIML_LIVE_MATCHES updates
// ======================================================================

(function () {
  "use strict";

  const panel = document.getElementById("panel-saved");
  if (!panel) return;

  let mode = "saved"; // "saved" | "live"

  function render() {
    const saved = window.SavedStore ? window.SavedStore.getAll() : [];
    const savedIds = new Set(saved.map(s => s.matchId || s.id));

    const live = Array.isArray(window.AIML_LIVE_MATCHES) ? window.AIML_LIVE_MATCHES : [];
    const liveSaved = live.filter(m => savedIds.has(m.matchId || m.id));

    panel.innerHTML = `
      <div class="saved-toolbar">
        <button class="saved-tab" data-mode="saved">Saved (${saved.length})</button>
        <button class="saved-tab" data-mode="live">Live Saved (${liveSaved.length})</button>
      </div>
      <div class="saved-body" id="saved-body"></div>
    `;

    panel.querySelectorAll(".saved-tab").forEach(btn => {
      btn.onclick = () => { mode = btn.getAttribute("data-mode"); paint(saved, liveSaved); };
    });

    paint(saved, liveSaved);
  }

  function paint(saved, liveSaved) {
    const body = panel.querySelector("#saved-body");
    if (!body) return;

    if (!saved.length) {
      body.innerHTML = `<div class="nav-empty">No saved matches yet.</div>`;
      return;
    }

    if (mode === "live") {
      if (!liveSaved.length) {
        body.innerHTML = `<div class="nav-empty">No live data for saved matches (yet).</div>`;
        return;
      }
      body.innerHTML = liveSaved.map(rowLive).join("");
      bindClicks(body, liveSaved);
      return;
    }

    body.innerHTML = saved.map(rowSaved).join("");
    bindClicks(body, saved);
  }

  function bindClicks(container, list) {
    container.querySelectorAll("[data-matchid]").forEach(el => {
      el.onclick = () => {
        const id = el.getAttribute("data-matchid");
        const m = list.find(x => (x.matchId || x.id) === id);
        if (m && typeof emit === "function") emit("match-selected", m);
      };
    });
  }

  function rowSaved(m) {
    const id = escapeHtml(m.matchId || m.id);
    return `
      <div class="saved-item" data-matchid="${id}">
        <div class="m-teams">${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</div>
        <div class="m-info">${escapeHtml(m.score || "")} • ${escapeHtml(String(m.minute ?? ""))}'</div>
      </div>
    `;
  }

  function rowLive(m) {
    const id = escapeHtml(m.matchId || m.id);
    return `
      <div class="saved-item" data-matchid="${id}">
        <div class="m-teams">${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</div>
        <div class="m-info">${escapeHtml(m.score || "")} • ${escapeHtml(String(m.minute ?? ""))}'</div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (typeof on === "function") {
    on("saved-updated", render);
    on("live-updated", render);
  }

  document.addEventListener("DOMContentLoaded", render);
})();
