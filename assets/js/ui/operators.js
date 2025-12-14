// =====================================================================
// OPERATORS PANEL — MULTI-TABS ODDS COMPARATOR
// =====================================================================
//
// Tabs:
//  - European
//  - Asian
//  - Betfair Exchange
//  - Greek Local Books
//
// Δουλεύει με odds-loaded event
// =====================================================================

const opPanel = document.getElementById("panel-operators");
if (!opPanel) console.warn("[OPERATORS] panel missing");

let fullOdds = null;

// --------------------------------------------------------------
// LOAD ODDS EVENT
// --------------------------------------------------------------
on("odds-loaded", data => {
  fullOdds = data.odds;
  renderOperators();
});


// --------------------------------------------------------------
// RENDER MAIN PANEL
// --------------------------------------------------------------
function renderOperators() {
  if (!fullOdds) {
    opPanel.innerHTML = `<div class="empty-panel">No odds available</div>`;
    return;
  }

  opPanel.innerHTML = `
    <div class="op-tabs">
      <div class="op-tab active" data-tab="eu">European</div>
      <div class="op-tab" data-tab="as">Asian</div>
      <div class="op-tab" data-tab="bf">Betfair</div>
      <div class="op-tab" data-tab="gr">Greek</div>
    </div>

    <div id="op-content">
      ${renderEuropean()}
    </div>
  `;

  attachTabEvents();
}


// --------------------------------------------------------------
// TAB CLICK EVENTS
// --------------------------------------------------------------
function attachTabEvents() {
  opPanel.querySelectorAll(".op-tab").forEach(tab => {
    tab.onclick = () => {
      opPanel.querySelectorAll(".op-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const t = tab.dataset.tab;

      if (t === "eu") opPanel.querySelector("#op-content").innerHTML = renderEuropean();
      if (t === "as") opPanel.querySelector("#op-content").innerHTML = renderAsian();
      if (t === "bf") opPanel.querySelector("#op-content").innerHTML = renderBetfair();
      if (t === "gr") opPanel.querySelector("#op-content").innerHTML = renderGreek();
    };
  });
}


// --------------------------------------------------------------
// RENDER EUROPEAN ODDS
// --------------------------------------------------------------
function renderEuropean() {
  const books = fullOdds.bookmakers || [];
  const list = books.filter(b => EU_BOOKS.includes(b.title));

  if (!list.length) return `<div class="empty-panel">No European data</div>`;

  return list.map(b => renderBookmakerBox(b)).join("");
}


// --------------------------------------------------------------
// RENDER ASIAN ODDS
// --------------------------------------------------------------
function renderAsian() {
  const books = fullOdds.bookmakers || [];
  const list = books.filter(b => ASIAN_BOOKS.includes(b.title));

  if (!list.length) return `<div class="empty-panel">No Asian data</div>`;

  return list.map(b => renderBookmakerBox(b)).join("");
}


// --------------------------------------------------------------
// RENDER BETFAIR EXCHANGE
// --------------------------------------------------------------
function renderBetfair() {
  const bf = fullOdds.bookmakers?.find(b => b.title === "Betfair");

  if (!bf) return `<div class="empty-panel">No Betfair exchange data</div>`;

  return `
    <div class="op-box">
      <div class="op-title">Betfair Exchange</div>
      <div class="bf-row">
        <div>Back Home: ${bf.back_home || "-"}</div>
        <div>Lay Home: ${bf.lay_home || "-"}</div>
      </div>
      <div class="bf-row">
        <div>Back Away: ${bf.back_away || "-"}</div>
        <div>Lay Away: ${bf.lay_away || "-"}</div>
      </div>
    </div>
  `;
}


// --------------------------------------------------------------
// RENDER LOCAL GREEK BOOKMAKERS
// --------------------------------------------------------------
function renderGreek() {
  const books = fullOdds.bookmakers || [];
  const list = books.filter(b => GREEK_BOOKS.includes(b.title));

  if (!list.length) return `<div class="empty-panel">No Greek data</div>`;

  return list.map(b => renderBookmakerBox(b)).join("");
}


// --------------------------------------------------------------
// GENERIC BOOKMAKER BOX
// --------------------------------------------------------------
function renderBookmakerBox(bm) {
  const h2h = bm.markets?.find(m => m.key === "h2h");
  if (!h2h) return "";

  return `
    <div class="op-box">
      <div class="op-title">${bm.title}</div>
      <div class="op-row">
        <div class="op-col">Home<br><b>${h2h.outcomes[0].price}</b></div>
        <div class="op-col">Draw<br><b>${h2h.outcomes[1].price}</b></div>
        <div class="op-col">Away<br><b>${h2h.outcomes[2].price}</b></div>
      </div>
    </div>
  `;
}


// --------------------------------------------------------------
// BOOKMAKER LISTS
// --------------------------------------------------------------

const EU_BOOKS = [
  "Bet365", "bwin", "Unibet", "William Hill", "Sportingbet", "Betsson", "Tipico"
];

const ASIAN_BOOKS = [
  "Pinnacle", "SBOBET", "188Bet", "PS3838", "Singbet"
];

const GREEK_BOOKS = [
  "Bet365", "Stoiximan", "Pamestoixima", "Novibet"
];
