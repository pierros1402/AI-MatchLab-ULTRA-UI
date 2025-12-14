/* =========================================================
   details-modal.js
   - Opens modal on match selection
   - Uses normalized event when available (consistent time)
   - Close: X / backdrop / ESC
========================================================= */

(function () {
  "use strict";
  if (window.__AIML_DETAILS_MODAL__) return;
  window.__AIML_DETAILS_MODAL__ = true;

  const modal = document.getElementById("match-details-modal");
  const closeBtn = document.getElementById("btn-details-close");
  const detailsBody = document.getElementById("panel-details");

  if (!modal || !detailsBody) return;

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function openModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function isLive(match) {
    const st = String(match?.status || match?.state || "").toLowerCase();
    return st.includes("live") || st.includes("inplay") || st.includes("in-play");
  }

  function render(match) {
    if (!match || !match.id) {
      detailsBody.innerHTML = `Select a match to view details.`;
      return;
    }

    const home = esc(match.home || match.homeName || "Home");
    const away = esc(match.away || match.awayName || "Away");
    const league = esc(match.leagueName || match.league || "");
    const t = esc(match.displayTime || match.kickoff || match.time || "");
    const id = esc(match.id);

    const live = isLive(match);
    const badge = live
      ? `<span class="badge badge-live">LIVE</span>`
      : `<span class="badge badge-pre">PRE</span>`;

    detailsBody.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-weight:900; font-size:16px;">${home} vs ${away}</div>
          ${badge}
        </div>

        <div style="opacity:.85; font-size:13px;">
          ${league}${league && t ? " • " : ""}${t}
        </div>

        <div style="opacity:.75; font-size:12px;">
          Match ID: <span style="opacity:.95;">${id}</span>
        </div>

        <div style="margin-top:6px; opacity:.85; font-size:12px;">
          ${live
            ? "Live details can be shown here (score, minute, incidents) when live feed is enabled."
            : "Pre-match details can be shown here (lineups, injuries, form) when datasets are enabled."
          }
        </div>
      </div>
    `;
  }

  // Close actions
  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.dataset?.close === "1") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  function onSelected(match) {
    render(match);
    openModal();
  }

  // Prefer normalized event
  if (typeof window.on === "function") {
    window.on("match-selected-normalized", onSelected);
    window.on("match-selected", onSelected); // fallback
  } else {
    document.addEventListener("match-selected-normalized", (e) => onSelected(e?.detail));
    document.addEventListener("match-selected", (e) => onSelected(e?.detail));
  }
})();
