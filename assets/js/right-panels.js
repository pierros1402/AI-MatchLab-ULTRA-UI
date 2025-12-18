/* =========================================================
   AI MatchLab ULTRA — Right Panels v3.2.0
   - Radar: radar-moves:update (odds moves)
   - Top Picks: odds-snapshot:canonical (deterministic)
     + View All Deviations toggle (same card; no extra panel)
   - Value Picks: value:update (statistical/model)
   - Live: live:update
   Notes:
   - Odds drop (current < opening) = GREEN  => class "up"
   - Odds rise (current > opening) = RED   => class "down"
========================================================= */
(function () {
  "use strict";
  if (window.__AIML_RIGHT_PANELS_V320__) return;
  window.__AIML_RIGHT_PANELS_V320__ = true;

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, (e) => fn(e.detail));
  }

  function emitSafe(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }

  const elRadarMeta = document.getElementById("radar-meta");
  const elRadarList = document.getElementById("radar-list");

  const elTopTitle = document.getElementById("top-picks-header");
  const elTopMeta  = document.getElementById("picks-meta");
  const elTopList  = document.getElementById("picks-list");
  const elDevList  = document.getElementById("deviations-list");
  const btnViewAll = document.getElementById("btn-view-all-deviations");

  const elValueMeta = document.getElementById("value-picks-meta");
  const elValueList = document.getElementById("value-picks-list");

  const elLiveMeta = document.getElementById("live-meta");
  const elLiveList = document.getElementById("live-list");

  const state = {
    market: (window.__AIML_CURRENT_MARKET__ || "1X2").trim() || "1X2",

    radar: { bestByMatch: Object.create(null) },

    top: { showAll: false, allMoves: [], topMoves: [] },

    value: { values: [] },

    live: { matches: [] }
  };

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function marketLabel(k) {
    const key = String(k || "1X2").trim();
    if (key === "OU15") return "O/U 1.5";
    if (key === "OU25") return "O/U 2.5";
    if (key === "OU35") return "O/U 3.5";
    return key;
  }

  function thresholdForMarket(k) {
    const key = String(k || "1X2").trim();
    return key === "1X2" ? 0.20 : 0.10;
  }

  function clsForDelta(delta, marketKey) {
    const d = Number(delta ?? 0);
    const limit = thresholdForMarket(marketKey);
    if (d <= -limit) return "up";   // GREEN = drop
    if (d >=  limit) return "down"; // RED   = rise
    return "";
  }

  function titleFromMove(m) {
    if (m?.home && m?.away) return `${m.home} vs ${m.away}`;
    return m?.matchTitle || m?.match || m?.title || "Match";
  }

  function normalizeMove(m, marketKey) {
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
  }

  function buildMoveHtml(mv, marketKey) {
    const cls = clsForDelta(mv.delta, marketKey);
    const dTxt = (Number(mv.delta) >= 0 ? "+" : "") + Number(mv.delta).toFixed(2);
    const oc = (mv.opening != null && mv.current != null)
      ? `${Number(mv.opening).toFixed(2)} → ${Number(mv.current).toFixed(2)}`
      : "";

    return `
      <div class="right-item ${cls}"
           data-match-id="${esc(mv.matchId || "")}"
           data-home="${esc(mv.home || "")}"
           data-away="${esc(mv.away || "")}"
           data-title="${esc(mv.title || "")}">
        <div class="right-main"><strong>${esc(mv.title)}</strong></div>
        <div class="right-sub">Δ ${esc(dTxt)}${oc ? ` • ${esc(oc)}` : ""}${mv.provider ? ` • ${esc(mv.provider)}` : ""}${mv.sel ? ` • ${esc(mv.sel)}` : ""}</div>
      </div>
    `;
  }

  function renderRadar() {
    if (!elRadarList) return;

    const mk = state.market;
    const lbl = marketLabel(mk);

    const arr = Object.values(state.radar.bestByMatch)
      .map((it) => normalizeMove(it, mk))
      .sort((a, b) => (b.abs || 0) - (a.abs || 0));

    if (elRadarMeta) elRadarMeta.textContent = `${lbl} • ${arr.length}`;

    elRadarList.innerHTML = arr.length
      ? arr.map((mv) => buildMoveHtml(mv, mk)).join("")
      : `<div class="right-empty">No ${esc(lbl)} moves.</div>`;
  }

  function setTopHeaderText() {
    if (!elTopTitle) return;

    const mk = state.market;
    const lbl = marketLabel(mk);
    const thr = thresholdForMarket(mk);

    elTopTitle.textContent = state.top.showAll
      ? `All Deviations • ${lbl} (Δ≥${thr.toFixed(2)})`
      : `AI Smart Money · Top Picks • ${lbl}`;
  }

  function setTopMetaText(totalCount) {
    if (!elTopMeta) return;

    const topN = state.top.topMoves.length;

  // 2η γραμμή: μόνο counters δίπλα στο κουμπί
    elTopMeta.textContent = state.top.showAll
      ? `All ${totalCount}`
      : `Top ${topN} / ${totalCount}`;
  }

  function renderTop() {
    const mk = state.market;
    const all = state.top.allMoves || [];
    const top = state.top.topMoves || [];

    if (btnViewAll) {
      const canShowAll = all.length > top.length;
      btnViewAll.disabled = !canShowAll && !state.top.showAll;
      btnViewAll.textContent = state.top.showAll ? "Back" : "View All";
      btnViewAll.setAttribute("aria-pressed", state.top.showAll ? "true" : "false");
    }

    setTopHeaderText();
    setTopMetaText(all.length);

    if (elTopList) elTopList.classList.toggle("hidden", state.top.showAll);
    if (elDevList) elDevList.classList.toggle("hidden", !state.top.showAll);

    const listEl = state.top.showAll ? elDevList : elTopList;
    const src = state.top.showAll ? all : top;

    if (!listEl) return;

    listEl.innerHTML = src.length
      ? src.map((mv) => buildMoveHtml(normalizeMove(mv, mk), mk)).join("")
      : `<div class="right-empty">No deviations for ${esc(marketLabel(mk))}.</div>`;
  }

  function renderValue() {
    if (!elValueList) return;
    const arr = Array.isArray(state.value.values) ? state.value.values : [];
    if (elValueMeta) elValueMeta.textContent = `AI vs Market · ${arr.length}`;

    elValueList.innerHTML = arr.length
      ? arr.map((v) => {
          const title = v.match || v.title || "Match";
          const edge = (v.edge != null) ? `Edge ${Number(v.edge).toFixed(1)}%` : "Value signal";
          const label = v.label ? ` • ${esc(v.label)}` : "";
          return `
            <div class="right-item">
              <div class="right-main"><strong>${esc(title)}</strong></div>
              <div class="right-sub">${esc(edge)}${label}</div>
            </div>
          `;
        }).join("")
      : `<div class="right-empty">No ${esc(marketLabel(state.market))} value picks (stats engine offline).</div>`;
  }

  function renderLive() {
    if (!elLiveList) return;
    const arr = Array.isArray(state.live.matches) ? state.live.matches : [];
    if (elLiveMeta) elLiveMeta.textContent = `Live • ${arr.length}`;

    elLiveList.innerHTML = arr.length
      ? arr.map((m) => {
          const title = (m.home && m.away) ? `${m.home} vs ${m.away}` : (m.title || m.matchTitle || "Match");
          const minute = m.minute != null ? `${esc(m.minute)}’` : "";
          const score = m.score != null ? `${esc(m.score)}` : "";
          return `
            <div class="right-item"
                 data-match-id="${esc(m.id || m.matchId || "")}"
                 data-home="${esc(m.home || "")}"
                 data-away="${esc(m.away || "")}"
                 data-title="${esc(title)}">
              <div class="right-main"><strong>${esc(title)}</strong></div>
              <div class="right-sub">${minute}${minute && score ? " • " : ""}${score}</div>
            </div>
          `;
        }).join("")
      : `<div class="right-empty">No live matches.</div>`;
  }

  function acceptCanonical(p) {
    const mk = String(p?.market || state.market || "1X2").trim() || "1X2";
    state.market = mk;

    let moves = Array.isArray(p?.moves) ? p.moves : null;

    if (!moves) {
      const rows = Array.isArray(p?.rows) ? p.rows : [];
      const limit = Number(p?.threshold) || thresholdForMarket(mk);
      const best = Object.create(null);

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const d = Number(r?.delta ?? 0);
        const abs = Math.abs(d);
        if (!Number.isFinite(abs) || abs < limit) continue;

        const key = r?.matchId || r?.matchTitle || `${i}`;
        const cur = best[key];
        if (!cur || abs > Math.abs(Number(cur.delta ?? 0))) best[key] = r;
      }

      moves = Object.values(best);
    }

    const sorted = moves
      .map((m) => normalizeMove(m, mk))
      .sort((a, b) => (b.abs || 0) - (a.abs || 0));

    state.top.allMoves = sorted;
    state.top.topMoves = sorted.slice(0, 8);

    renderTop();
  }

  onSafe("radar-moves:update", (p) => {
    const mk = String(p?.market || state.market || "1X2").trim() || "1X2";
    state.market = mk;

    const arr = Array.isArray(p?.moves) ? p.moves : [];
    state.radar.bestByMatch = Object.create(null);
    arr.forEach((it, idx) => {
      const key = it?.matchId || it?.matchTitle || it?.match || `M_${idx}`;
      state.radar.bestByMatch[key] = it;
    });

    renderRadar();
  });

  onSafe("odds-snapshot:canonical", acceptCanonical);

  onSafe("value:update", (p) => {
    if (!p) return;
    if (p.market) state.market = String(p.market).trim() || state.market;
    state.value.values = Array.isArray(p.values) ? p.values : [];
    renderValue();
  });

  onSafe("live:update", (p) => {
    state.live.matches = Array.isArray(p?.matches) ? p.matches : [];
    renderLive();
  });

  onSafe("market-selected", (mk) => {
    if (!mk) return;
    state.market = String(mk).trim() || "1X2";
    state.top.showAll = false;

    emitSafe("radar:market-update", state.market);

    setTopHeaderText();
    renderRadar();
    renderTop();
    renderValue();
  });

  if (btnViewAll) {
    btnViewAll.addEventListener("click", () => {
      state.top.showAll = !state.top.showAll;
      renderTop();
    });
  }

  document.addEventListener("click", (e) => {
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

  setTopHeaderText();
  renderRadar();
  renderTop();
  renderValue();
  renderLive();

})();
