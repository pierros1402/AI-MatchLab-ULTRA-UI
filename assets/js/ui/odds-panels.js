/* =========================================================
   ODDS PANELS — MARKET DROPDOWN CONTROLLER (FINAL)
   ---------------------------------------------------------
   - Single Market DROPDOWN (always visible)
   - Default market: 1X2
   - Single source of truth: market-selected
   - Works with match-selected from ANY panel
========================================================= */

(function () {
  'use strict';

  if (window.__AIML_ODDS_PANELS_INIT__) return;
  window.__AIML_ODDS_PANELS_INIT__ = true;

  /* =========================
     CONFIG / STATE
  ========================= */

  const MARKET_KEYS = ["1X2", "DC", "GG", "OU15", "OU25", "OU35"];

  const state = {
    match: null,
    market: "1X2",
    odds: null
  };

  /* =========================
     DOM
  ========================= */

  const PANELS = {
    greek: document.getElementById("greek-odds-body"),
    eu: document.getElementById("eu-odds-body"),
    asian: document.getElementById("asian-odds-body"),
    betfair: document.getElementById("betfair-odds-body")
  };

  const AMB = {
    title: document.getElementById("amb-title"),
    sub: document.getElementById("amb-sub")
  };

  const AMB_PARENT = document.getElementById("active-match-bar");
  let marketSelectEl = null;

  /* =========================
     MARKET DROPDOWN (STABLE)
  ========================= */

  function ensureMarketDropdown() {
    if (marketSelectEl || !AMB_PARENT) return;

    let rightWrap = AMB_PARENT.querySelector(".amb-right");
    if (!rightWrap) {
      rightWrap = document.createElement("div");
      rightWrap.className = "amb-right";
      AMB_PARENT.appendChild(rightWrap);
    }

    marketSelectEl = document.createElement("select");
    marketSelectEl.className = "market-select";

    MARKET_KEYS.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k === "GG" ? "GG/NG" :
                        k === "OU15" ? "O/U 1.5" :
                        k === "OU25" ? "O/U 2.5" :
                        k === "OU35" ? "O/U 3.5" : k;
      marketSelectEl.appendChild(opt);
    });

    marketSelectEl.value = state.market;

    marketSelectEl.addEventListener("change", () => {
      if (state.market === marketSelectEl.value) return;
      state.market = marketSelectEl.value;
      emit("market-selected", state.market);
      renderAll();
    });

    rightWrap.appendChild(marketSelectEl);
  }

  /* =========================
     HEADER
  ========================= */

  function renderHeader() {
    if (!AMB.title || !AMB.sub) return;

    if (!state.match) {
      AMB.title.textContent = "No match selected";
      AMB.sub.textContent = "Select a match from any panel.";
      return;
    }

    AMB.title.textContent = `${state.match.home} – ${state.match.away}`;
    AMB.sub.textContent =
      state.match.leagueName ||
      state.match.league ||
      "";
  }

  /* =========================
     PANELS RENDER
  ========================= */

  function clearPanels(msg = "Select a match") {
    Object.values(PANELS).forEach(p => {
      if (p) p.innerHTML = `<div class="odds-empty">${msg}</div>`;
    });
  }

  function renderPanel(panelEl, rows) {
    if (!panelEl) return;
    if (!rows || !rows.length) {
      panelEl.innerHTML = `<div class="odds-empty">No odds available</div>`;
      return;
    }

    panelEl.innerHTML = rows.map(r => {
      const cls =
        r.delta < 0 ? "odds-down" :
        r.delta > 0 ? "odds-up" : "";

      return `
        <div class="odds-row ${cls}">
          <div class="odds-book">${r.book}</div>
          <div class="odds-open">${r.open}</div>
          <div class="odds-current">${r.current}</div>
        </div>
      `;
    }).join("");
  }

  function renderAll() {
    if (!state.match || !state.odds) {
      clearPanels();
      return;
    }

    const marketData = state.odds[state.market];
    if (!marketData) {
      clearPanels("Market not available");
      return;
    }

    renderPanel(PANELS.greek, marketData.greek || []);
    renderPanel(PANELS.eu, marketData.eu || []);
    renderPanel(PANELS.asian, marketData.asian || []);
    renderPanel(PANELS.betfair, marketData.betfair || []);
  }

  /* =========================
     EVENTS
  ========================= */

  on("match-selected", match => {
    state.match = match || null;
    state.odds = null;
    renderHeader();
    clearPanels("Loading odds…");
    emit("market-selected", state.market);
  });

  on("market-selected", marketKey => {
    if (!marketKey) return;
    state.market = marketKey;
    if (marketSelectEl) marketSelectEl.value = marketKey;
    renderAll();
  });

  on("odds-snapshot:core", snapshot => {
    if (!state.match) return;
    if (String(snapshot.matchId) !== String(state.match.id)) return;
    state.odds = snapshot.markets || null;
    renderAll();
  });

  /* =========================
     INIT
  ========================= */

  ensureMarketDropdown();
  emit("market-selected", state.market);
  renderHeader();
  clearPanels();

})();
