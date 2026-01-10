/* =========================================================
   ODDS PANELS — FINAL STABLE RENDER
   ✔ Market ↔ Table schema fully synced (with or without match)
   ✔ Tables remain visible without match (— placeholders)
   ✔ Only bookmakers with odds are filled
   ✔ Single source of truth: Active Match Bar
========================================================= */

(function () {
  'use strict';
  if (window.__AIML_ODDS_PANELS_INIT__) return;
  window.__AIML_ODDS_PANELS_INIT__ = true;

  /* =========================
     CONFIG
  ========================= */

  const MARKET_KEYS = ["1X2", "DC", "GG", "OU15", "OU25", "OU35"];

  const MARKET_SELECTIONS = {
    "1X2": ["1", "X", "2"],
    "DC": ["1X", "12", "X2"],
    "GG": ["Yes", "No"],
    "OU15": ["Over 1.5", "Under 1.5"],
    "OU25": ["Over 2.5", "Under 2.5"],
    "OU35": ["Over 3.5", "Under 3.5"]
  };

  const BOOKMAKERS = {
    greek: ["Stoiximan", "Pamestoixima", "Novibet", "Betsson", "Bwin"],
    european: [
      "Unibet",
      "Unibet (UK)",
      "Unibet (FR)",
      "Unibet (NL)",
      "Unibet (SE)",
      "William Hill",
      "Sky Bet",
      "Bet365"
    ],
    asian: ["Pinnacle", "SBOBET", "188Bet"],
    betfair: ["Betfair", "Betfair Sportsbook"]
  };

  const state = {
    match: null,
    market: "1X2",
    odds: {}
  };

  /* =========================
     DOM
  ========================= */

  const PANELS = {
    greek: document.getElementById("greek-odds-body"),
    european: document.getElementById("eu-odds-body"),
    asian: document.getElementById("asian-odds-body"),
    betfair: document.getElementById("betfair-odds-body")
  };

  const AMB = {
    bar: document.getElementById("active-match-bar"),
    title: document.getElementById("amb-title"),
    sub: document.getElementById("amb-sub")
  };

  let marketSelectEl = null;

  /* =========================
     HELPERS
  ========================= */

  const norm = s => String(s || "").toLowerCase().trim();

  function buildLookup(rows) {
    const map = {};
    (rows || []).forEach(r => {
      if (!r || !r.book || !r.sel) return;
      const b = norm(r.book);
      map[b] ||= {};
      map[b][String(r.sel)] = r.current;
    });
    return map;
  }

  const groupKey = g => (g === "european" ? "eu" : g);

  /* =========================
     ACTIVE MATCH BAR
  ========================= */

  function ensureMarketSelector() {
    if (!AMB.bar || marketSelectEl) return;

    const right = AMB.bar.querySelector(".amb-right") || (() => {
      const d = document.createElement("div");
      d.className = "amb-right";
      AMB.bar.appendChild(d);
      return d;
    })();

    marketSelectEl = document.createElement("select");
    marketSelectEl.className = "market-select";

    MARKET_KEYS.forEach(k => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent =
        k === "GG" ? "GG/NG" :
        k === "OU15" ? "O/U 1.5" :
        k === "OU25" ? "O/U 2.5" :
        k === "OU35" ? "O/U 3.5" : k;
      marketSelectEl.appendChild(o);
    });

    marketSelectEl.value = state.market;

    // ✅ ΑΛΛΑΖΕΙ ΠΑΝΤΑ — με ή χωρίς αγώνα
    marketSelectEl.onchange = () => {
      state.market = marketSelectEl.value;
      renderAll();
    };

    right.appendChild(marketSelectEl);
  }

  function renderHeader() {
    if (!AMB.title || !AMB.sub) return;

    if (!state.match) {
      AMB.title.textContent = "No match selected";
      AMB.sub.textContent = "Select a match from the left panel.";
    } else {
      AMB.title.textContent = `${state.match.home} – ${state.match.away}`;
      AMB.sub.textContent = state.match.leagueName || "";
    }
  }

  /* =========================
     TABLE RENDER
  ========================= */

  function renderPanel(panelEl, uiGroup) {
    if (!panelEl) return;

    panelEl.innerHTML = "";

    const sels = MARKET_SELECTIONS[state.market] || [];
    const rows = state.odds?.[state.market]?.[groupKey(uiGroup)] || [];
    const lookup = buildLookup(rows);

    const table = document.createElement("table");
    table.className = "odds-table";

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    trh.innerHTML =
      `<th class="col-book">Book</th>` +
      sels.map(s => `<th class="col-odd">${s}</th>`).join("");
    thead.appendChild(trh);

    const tbody = document.createElement("tbody");

    BOOKMAKERS[uiGroup].forEach(book => {
      const tr = document.createElement("tr");
      const b = norm(book);

      tr.innerHTML =
        `<td class="col-book">${book}</td>` +
        sels.map(sel =>
          `<td class="col-odd">${
            lookup[b]?.[sel] != null
              ? Number(lookup[b][sel]).toFixed(2)
              : "—"
          }</td>`
        ).join("");

      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    panelEl.appendChild(table);
  }

  function renderAll() {
    renderHeader();
    renderPanel(PANELS.greek, "greek");
    renderPanel(PANELS.european, "european");
    renderPanel(PANELS.asian, "asian");
    renderPanel(PANELS.betfair, "betfair");
  }

  /* =========================
     EVENTS
  ========================= */

  on("match-selected", match => {
    state.match = match || null;
    if (marketSelectEl) marketSelectEl.value = state.market;
    renderAll();
  });

  on("odds-snapshot:core", snapshot => {
    if (!snapshot || !snapshot.markets) return;
    if (state.match && snapshot.matchId !== state.match.id) return;
    state.odds = snapshot.markets;
    renderAll();
  });

  /* =========================
     INIT
  ========================= */

  ensureMarketSelector();
  renderAll();

})();
