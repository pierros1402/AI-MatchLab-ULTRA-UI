/* =========================================================
   AI MatchLab ULTRA — Right Panels v3.3.4 (SAFE HARDENING)
   ---------------------------------------------------------
   - SAME DOM IDs as v3.3.2 (drop-in replacement)
   - Strict separation:
       Top Picks  <- odds-snapshot:canonical
       Value      <- value:update
       Live       <- live:update
       Radar      <- radar-moves:update
   - SOFT guards: never clears lists on malformed/partial events
   - Market is primarily driven by market-selected (UI authority)
========================================================= */
(function () {
  "use strict";
  if (window.__AIML_RIGHT_PANELS_V334__) return;
  window.__AIML_RIGHT_PANELS_V334__ = true;

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, (e) => fn(e.detail));
  }
  function emitSafe(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }

  // Resolve elements lazily (safer if script loads before DOM)
  const els = {
    radarMeta: null,
    radarList: null,
    topTitle: null,
    topMeta: null,
    topList: null,
    devList: null,
    btnViewAll: null,
    valueMeta: null,
    valueList: null,
    liveMeta: null,
    liveList: null
  };

  function resolveEls() {
    els.radarMeta = els.radarMeta || document.getElementById("radar-meta");
    els.radarList = els.radarList || document.getElementById("radar-list");

    els.topTitle  = els.topTitle  || document.getElementById("top-picks-header");
    els.topMeta   = els.topMeta   || document.getElementById("picks-meta");
    els.topList   = els.topList   || document.getElementById("picks-list");
    els.devList   = els.devList   || document.getElementById("deviations-list");
    els.btnViewAll= els.btnViewAll|| document.getElementById("btn-view-all-deviations");

    els.valueMeta = els.valueMeta || document.getElementById("value-picks-meta");
    els.valueList = els.valueList || document.getElementById("value-picks-list");

    els.liveMeta  = els.liveMeta  || document.getElementById("live-meta");
    els.liveList  = els.liveList  || document.getElementById("live-list");
  }

  const state = {
    market: (window.__AIML_CURRENT_MARKET__ || "1X2").trim() || "1X2",
    radar: { bestByMatch: Object.create(null) },
    top:   { showAll: false, allMoves: [], topMoves: [] },
    value: { showAll: false, values: [] },
    live:  { matches: [] }
  };

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const marketLabel = (k) => {
    const key = String(k || "1X2").trim();
    if (key === "OU15") return "O/U 1.5";
    if (key === "OU25") return "O/U 2.5";
    if (key === "OU35") return "O/U 3.5";
    return key;
  };

  const thresholdForMarket = (k) => (String(k || "1X2").trim() === "1X2" ? 0.20 : 0.10);

  // odds down = green, odds up = red (your established convention)
  const clsForDelta = (delta, marketKey) => {
    const d = Number(delta ?? 0);
    const limit = thresholdForMarket(marketKey);
    if (d <= -limit) return "up";   // odds up => red
    if (d >=  limit) return "down"; // odds down => green
    return "";
  };

  const titleFromMove = (m) =>
    m?.home && m?.away ? `${m.home} vs ${m.away}` : m?.matchTitle || m?.match || m?.title || "Match";

  const normalizeMove = (m, marketKey) => {
    const d = Number(m?.delta ?? 0);
    const abs = Math.abs(Number.isFinite(d) ? d : Number(m?.abs ?? 0));
    return {
      matchId: m?.matchId || m?.id,
      home: m?.home,
      away: m?.away,
      title: titleFromMove(m),
      provider: m?.provider || m?.bookmaker || "",
      sel: m?.sel || m?.selection || "",
      opening: m?.opening,
      current: m?.current,
      delta: Number.isFinite(d) ? d : 0,
      abs: Number.isFinite(abs) ? abs : 0,
      market: String(marketKey || m?.market || "1X2").trim()
    };
  };

  const buildMoveHtml = (mv, marketKey) => {
    const cls = clsForDelta(mv.delta, marketKey);
    const dTxt = (Number(mv.delta) >= 0 ? "+" : "") + Number(mv.delta).toFixed(2);
    const oc =
      mv.opening != null && mv.current != null
        ? `${Number(mv.opening).toFixed(2)} → ${Number(mv.current).toFixed(2)}`
        : "";
    return `
      <div class="right-item ${cls}"
           data-match-id="${esc(mv.matchId || "")}"
           data-home="${esc(mv.home || "")}"
           data-away="${esc(mv.away || "")}"
           data-title="${esc(mv.title)}">
        <div class="right-main"><strong>${esc(mv.title)}</strong></div>
        <div class="right-sub">Δ ${esc(dTxt)}${oc ? ` • ${esc(oc)}` : ""}${mv.provider ? ` • ${esc(mv.provider)}` : ""}${mv.sel ? ` • ${esc(mv.sel)}` : ""}</div>
      </div>`;
  };

  /* ----------------------- RADAR ----------------------- */
  function renderRadar() {
    resolveEls();
    if (!els.radarList) return;

    const mk = state.market;
    const lbl = marketLabel(mk);

    let arr = Object.values(state.radar.bestByMatch || Object.create(null))
      .map((it) => normalizeMove(it, mk))
      .filter((mv) => mv.sel !== "X" && mv.sel !== "Draw")
      .sort((a, b) => (b.abs || 0) - (a.abs || 0));

    // fallback if demo has only X etc.
    if (!arr.length) {
      arr = Object.values(state.radar.bestByMatch || Object.create(null))
        .map((it) => normalizeMove(it, mk))
        .sort((a, b) => (b.abs || 0) - (a.abs || 0));
    }

    if (els.radarMeta) els.radarMeta.textContent = `${lbl} • ${arr.length}`;

    els.radarList.innerHTML = arr.length
      ? arr.map((mv) => buildMoveHtml(mv, mk)).join("")
      : `<div class="right-empty">No ${esc(lbl)} moves.</div>`;
  }

  /* ----------------------- TOP PICKS ------------------- */
  function renderTop() {
    resolveEls();
    const mk = state.market;
    const all = Array.isArray(state.top.allMoves) ? state.top.allMoves : [];
    const top = Array.isArray(state.top.topMoves) ? state.top.topMoves : [];

    if (els.btnViewAll) {
      const canShowAll = all.length > top.length;
      els.btnViewAll.disabled = !canShowAll && !state.top.showAll;
      els.btnViewAll.textContent = state.top.showAll ? "Back" : "View All";
    }

    if (els.topTitle) {
      const lbl = marketLabel(mk);
      const thr = thresholdForMarket(mk);
      els.topTitle.textContent = state.top.showAll
        ? `All Deviations • ${lbl} (Δ≥${thr.toFixed(2)})`
        : `AI Smart Money · Top Picks • ${lbl}`;
    }

    if (els.topMeta) {
      const topN = top.length;
      els.topMeta.textContent = state.top.showAll
        ? `All ${all.length}`
        : `Top ${topN} / ${all.length}`;
    }

    if (els.topList) els.topList.classList.toggle("hidden", state.top.showAll);
    if (els.devList) els.devList.classList.toggle("hidden", !state.top.showAll);

    const listEl = state.top.showAll ? els.devList : els.topList;
    const src = state.top.showAll ? all : top;
    if (!listEl) return;

    listEl.innerHTML = src.length
      ? src.map((mv) => buildMoveHtml(normalizeMove(mv, mk), mk)).join("")
      : `<div class="right-empty">No deviations for ${esc(marketLabel(mk))}.</div>`;
  }

  /* ----------------------- VALUE PANEL ----------------- */
  function renderValue() {
    resolveEls();
    if (!els.valueList) return;

    const values = Array.isArray(state.value.values) ? state.value.values : [];
    const shown = state.value.showAll ? values : values.slice(0, 8);
    const btnTxt = state.value.showAll ? "Back" : "View All";

    if (els.valueMeta) {
      els.valueMeta.innerHTML = `
        <div class="rheader-line2">
          <button id="value-toggle" class="right-btn" type="button">${esc(btnTxt)}</button>
          <div class="right-meta">AI vs Market · ${values.length}</div>
        </div>
      `;
    }

    els.valueList.innerHTML = shown.length
      ? shown
          .map((v) => {
            let home = v.home || "";
            let away = v.away || "";
            let title = v.title || v.match || "";

            if ((!home || !away) && title.includes(" vs ")) {
              const parts = title.split(" vs ");
              home = parts[0].trim();
              away = parts[1]?.trim() || "";
            }
            if (!title) title = home && away ? `${home} vs ${away}` : "Match";

            const edge = v.edge != null ? `Edge ${Number(v.edge).toFixed(1)}%` : "Value signal";
            const label = v.label ? ` • ${esc(v.label)}` : "";

            return `
              <div class="right-item"
                   data-match-id="${esc(v.matchId || v.id || title.replace(/\s+/g, "_").toLowerCase())}"
                   data-home="${esc(home)}"
                   data-away="${esc(away)}"
                   data-title="${esc(title)}">
                <div class="right-main"><strong>${esc(title)}</strong></div>
                <div class="right-sub">${esc(edge)}${label}</div>
              </div>`;
          })
          .join("")
      : `<div class="right-empty">No ${esc(marketLabel(state.market))} value picks (stats engine offline).</div>`;
  }

  /* ----------------------- LIVE PANEL ------------------ */
  function renderLive() {
    resolveEls();
    if (!els.liveList) return;

    const arr = Array.isArray(state.live.matches) ? state.live.matches : [];
    if (els.liveMeta) els.liveMeta.textContent = `Live • ${arr.length}`;

    els.liveList.innerHTML = arr.length
      ? arr.map((m) => {
          const title = m.home && m.away ? `${m.home} vs ${m.away}` : m.title || m.matchTitle || "Match";
          const minute = m.minute != null ? `${esc(m.minute)}’` : "";
          const score = m.score != null ? `${esc(m.score)}` : "";
          return `<div class="right-item"
                   data-match-id="${esc(m.id || m.matchId || "")}"
                   data-home="${esc(m.home || "")}"
                   data-away="${esc(m.away || "")}"
                   data-title="${esc(title)}">
                    <div class="right-main"><strong>${esc(title)}</strong></div>
                    <div class="right-sub">${minute}${minute && score ? " • " : ""}${score}</div>
                  </div>`;
        }).join("")
      : `<div class="right-empty">No live matches.</div>`;
  }

  /* ----------------------- EVENTS ---------------------- */

  // Top Picks ONLY: odds-snapshot:canonical
  function acceptCanonical(p) {
    if (!p) return;

    // market authority: use UI state first; fallback to payload only if state missing
    const mk = String(state.market || p?.market || "1X2").trim() || "1X2";

    // moves can be provided directly, or derived from rows+threshold
    let moves = Array.isArray(p?.moves) ? p.moves : null;

    if (!moves) {
      const rows = Array.isArray(p?.rows) ? p.rows : [];
      const limit = Number(p?.threshold);
      const thr = Number.isFinite(limit) ? limit : thresholdForMarket(mk);

      const best = Object.create(null);
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const d = Number(r?.delta ?? 0);
        const abs = Math.abs(d);
        if (!Number.isFinite(abs) || abs < thr) continue;
        const key = r?.matchId || r?.matchTitle || `${i}`;
        const cur = best[key];
        if (!cur || abs > Math.abs(Number(cur.delta ?? 0))) best[key] = r;
      }
      moves = Object.values(best);
    }

    if (!Array.isArray(moves) || !moves.length) {
      // SOFT guard: do NOT clear existing lists
      return;
    }

    let filtered = moves
      .map((m) => normalizeMove(m, mk))
      .filter((mv) => mv.sel !== "X" && mv.sel !== "Draw");

    if (!filtered.length) filtered = moves.map((m) => normalizeMove(m, mk));

    filtered.sort((a, b) => (b.abs || 0) - (a.abs || 0));

    state.top.allMoves = filtered;
    state.top.topMoves = filtered.slice(0, 6);

    renderTop();
  }

  // Radar ONLY: radar-moves:update
  onSafe("radar-moves:update", (p) => {
    if (!p) return;
    // keep market synced if radar carries it (odds-side signal)
    const mk = String(p?.market || state.market || "1X2").trim() || "1X2";
    state.market = mk;

    const arr = Array.isArray(p?.moves) ? p.moves : null;
    if (!arr || !arr.length) return; // SOFT guard: no clearing

    state.radar.bestByMatch = Object.create(null);
    arr.forEach((it, idx) => {
      const key = it?.matchId || it?.matchTitle || it?.match || `M_${idx}`;
      state.radar.bestByMatch[key] = it;
    });

    renderRadar();
  });

  onSafe("odds-snapshot:canonical", acceptCanonical);

  // Value ONLY: value:update
  onSafe("value:update", (p) => {
    if (!p) return;
    const arr = Array.isArray(p.values) ? p.values : null;
    if (!arr) return; // SOFT guard
    state.value.values = arr;
    renderValue();
  });

  // Live ONLY: live:update
  onSafe("live:update", (p) => {
    if (!p) return;
    const arr = Array.isArray(p?.matches) ? p.matches : null;
    if (!arr) return; // SOFT guard
    state.live.matches = arr;
    renderLive();
  });

  // Market selection: headers/refresh only (no dataset mixing)
  onSafe("market-selected", (mk) => {
    if (!mk) return;
    state.market = String(mk).trim() || "1X2";
    state.top.showAll = false;
    state.value.showAll = false;

    emitSafe("radar:market-update", state.market);

    renderRadar();
    renderTop();
    renderValue();
    // live is independent; renderLive is OK but not required
    renderLive();
  });

  function bindButtons() {
    resolveEls();
    if (els.btnViewAll) {
      els.btnViewAll.addEventListener("click", () => {
        state.top.showAll = !state.top.showAll;
        renderTop();
      });
    }
  }

  /* ----------------------- CLICKS ---------------------- */
  document.addEventListener("click", (e) => {
    const t = e.target;

    if (t && t.id === "value-toggle") {
      state.value.showAll = !state.value.showAll;
      renderValue();
      return;
    }

    const item = e.target.closest("#right-panel .right-item");
    if (!item) return;

    const matchId = item.getAttribute("data-match-id") || "";
    const home = item.getAttribute("data-home") || "";
    const away = item.getAttribute("data-away") || "";
    const title = item.getAttribute("data-title") || "";
    if (!home && !away && !title) return;

    emitSafe("match-selected", {
      id: matchId || title.replace(/\s+/g, "_").toLowerCase(),
      matchId,
      home,
      away,
      title
    });

    document.body.classList.remove("drawer-right-open");
  });

  /* ----------------------- INIT ------------------------ */
  function init() {
    resolveEls();
    bindButtons();
    renderRadar();
    renderTop();
    renderValue();
    renderLive();
    console.log("[RIGHT PANELS] v3.3.4 SAFE — separation preserved, no event blocking");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
