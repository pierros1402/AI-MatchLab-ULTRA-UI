/* =========================================================
   AI MatchLab ULTRA — Odds Radar v2.9.3 Final (UI label patch)
   - Remove "Δ≥0.20" from header/meta (display only)
   - Show OU15/OU25/OU35 as O/U 1.5 / 2.5 / 3.5 (display only)
======================================================== */
(function () {
  "use strict";

  const elList   = document.getElementById("radar-list");
  const elMeta   = document.getElementById("radar-meta");
  const elHeader = document.getElementById("radar-header");

  const state = {
    bestByMatch: Object.create(null),
    market: "1X2",
    threshold: 0.20
  };

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Display-only label mapping (do NOT change internal keys)
  function marketLabel(k) {
    const key = String(k || "1X2").trim();
    if (key === "OU15") return "O/U 1.5";
    if (key === "OU25") return "O/U 2.5";
    if (key === "OU35") return "O/U 3.5";
    return key;
  }

  function pickTitle(it) {
    if (it.home && it.away) return `${it.home} vs ${it.away}`;
    if (it.matchTitle) return it.matchTitle;
    return it.match || "Unknown match";
  }

  function render() {
    const arr = Object.values(state.bestByMatch);
    arr.sort((a, b) => Math.abs(b.delta || 0) - Math.abs(a.delta || 0));

    const lbl = marketLabel(state.market);

    if (!arr.length) {
      elList.innerHTML = `<div class="right-empty">No ${esc(lbl)} moves.</div>`;
      elMeta.textContent = `${lbl}`;
      if (elHeader) elHeader.textContent = `Radar • ${lbl}`;
      return;
    }

    elMeta.textContent = `${lbl} • ${arr.length}`;
    if (elHeader) elHeader.textContent = `Radar • ${lbl}`;

    elList.innerHTML = arr.map((it) => {
      const d = Number(it.delta ?? 0);
      const sign = d >= 0 ? "pos" : "neg";
      const strong = Math.abs(d) >= 0.40 ? "strong" : "";
      const provider = it.provider || it.bookmaker || it.source || "";
      return `
        <div class="right-item ${strong}" data-sign="${sign}">
          <div class="right-main"><strong>${esc(pickTitle(it))}</strong></div>
          <div class="right-sub">Δ ${d.toFixed(2)} • ${esc(provider)}</div>
        </div>`;
    }).join("");
  }

  // --- listen for odds updates ---
  window.on("radar-moves:update", (p) => {
    const arr = Array.isArray(p?.moves) ? p.moves : [];
    state.market = p?.market || state.market;
    state.bestByMatch = Object.create(null);
    arr.forEach((it) => {
      const key = it.matchId || it.matchTitle || it.match || Math.random();
      state.bestByMatch[key] = it;
    });
    render();
  });

  // --- sync when market changes (display only) ---
  window.on("radar:market-update", (marketKey) => {
    state.market = marketKey || state.market;
    const lbl = marketLabel(state.market);
    if (elHeader) elHeader.textContent = `Radar • ${lbl}`;
    if (elMeta)   elMeta.textContent   = `${lbl}`;
    render();
  });

  // --- click-to-select ---
  document.addEventListener("click", (e) => {
    const item = e.target.closest("#radar-list .right-item");
    if (!item) return;
    const titleEl = item.querySelector(".right-main strong");
    const title = titleEl ? titleEl.textContent.trim() : "";
    if (!title) return;

    let home = "", away = "";
    if (title.includes(" vs ")) [home, away] = title.split(" vs ").map((s) => s.trim());
    else {
      const parts = title.split(/[-–]/);
      home = (parts[0] || "").trim();
      away = (parts[1] || "").trim();
    }
    const id = title.replace(/\s+/g, "_").toLowerCase();
    window.emit?.("match-selected", { id, home, away, title });
    document.body.classList.remove("drawer-right-open");
  });

  render();
})();
