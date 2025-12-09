/* ============================================================================
   AI MATCHLAB ULTRA — ODDS ENGINE
   TheOddsAPI (optional) + Demo fallback for 4 panels
   Greek · European · Asian · Betfair
============================================================================ */

const ODDS_API_KEY = "5c35e05ea0c96662a64f4a7d7140e1b4";
const ODDS_URL =
  `https://api.the-odds-api.com/v4/sports/soccer/odds` +
  `?regions=eu,uk,us,au&markets=h2h&oddsFormat=decimal&apiKey=${ODDS_API_KEY}`;

const REFRESH_MS = 60 * 60 * 1000; // 1 ώρα (dev)

/* PANEL TARGETS */
const BODY_GREEK   = document.getElementById("greek-odds-body");
const BODY_EU      = document.getElementById("eu-odds-body");
const BODY_ASIAN   = document.getElementById("asian-odds-body");
const BODY_BETFAIR = document.getElementById("betfair-odds-body");

const META_GREEK   = document.getElementById("greek-odds-meta");
const META_EU      = document.getElementById("eu-odds-meta");
const META_ASIAN   = document.getElementById("asian-odds-meta");
const META_BETFAIR = document.getElementById("betfair-odds-meta");

/* ------------------------------------------------------------
   HELPER: RENDER MATCH CARD
------------------------------------------------------------ */
function renderMatchCard(match) {
  const div = document.createElement("div");
  div.className = "odds-card";

  const teamsLabel = `${match.home} vs ${match.away}`;
  const kickoff = match.kickoff || "TBA";

  div.innerHTML = `
    <div class="odds-row">
      <div class="teams">${teamsLabel}</div>
      <div class="kickoff">${kickoff}</div>
    </div>
    <div class="odds-tables">
      ${match.books.map(book => `
        <div class="odds-line">
          <div class="book">${book.name}</div>
          <div class="price">${book.odds[0] ?? "-"}</div>
          <div class="price">${book.odds[1] ?? "-"}</div>
          <div class="price">${book.odds[2] ?? "-"}</div>
        </div>
      `).join("")}
    </div>
  `;

  return div;
}

/* ------------------------------------------------------------
   DEMO DATA (αν αποτύχει η API)
------------------------------------------------------------ */
function makeDemoMatches(tag) {
  return [
    {
      home: `${tag} United`,
      away: `${tag} City`,
      kickoff: "19:30",
      books: [
        { name: "BET365", odds: [1.85, 3.50, 4.10] },
        { name: "STOIXIMAN", odds: [1.90, 3.40, 4.00] },
        { name: "OPAP", odds: [1.80, 3.45, 4.20] }
      ]
    },
    {
      home: `${tag} Stars`,
      away: `${tag} Rangers`,
      kickoff: "21:00",
      books: [
        { name: "BET365", odds: [2.20, 3.20, 3.10] },
        { name: "LADBROKES", odds: [2.25, 3.10, 3.05] },
        { name: "UNIBET", odds: [2.18, 3.25, 3.15] }
      ]
    }
  ];
}

/* ------------------------------------------------------------
   RENDER PANEL
------------------------------------------------------------ */
function renderPanel(bodyEl, matches) {
  if (!bodyEl) return;
  bodyEl.innerHTML = "";
  if (!matches || !matches.length) {
    bodyEl.innerHTML = `<div class="muted">No odds available.</div>`;
    return;
  }
  matches.forEach(m => bodyEl.appendChild(renderMatchCard(m)));
}

/* ------------------------------------------------------------
   META ONLINE/OFFLINE
------------------------------------------------------------ */
function setMetaOnline() {
  const ts = new Date().toLocaleTimeString("en-GB");
  if (META_GREEK) META_GREEK.textContent = `Updated ${ts}`;
  if (META_EU) META_EU.textContent = `Updated ${ts}`;
  if (META_ASIAN) META_ASIAN.textContent = `Updated ${ts}`;
  if (META_BETFAIR) META_BETFAIR.textContent = `Updated ${ts}`;
}

function setMetaOffline() {
  if (META_GREEK) META_GREEK.textContent = "Offline (demo)";
  if (META_EU) META_EU.textContent = "Offline (demo)";
  if (META_ASIAN) META_ASIAN.textContent = "Offline (demo)";
  if (META_BETFAIR) META_BETFAIR.textContent = "Offline (demo)";
}

/* ------------------------------------------------------------
   FETCH LIVE ODDS (OPTIONAL)
------------------------------------------------------------ */
async function fetchOdds() {
  try {
    const res = await fetch(ODDS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // εδώ μπορείς αργότερα να κάνεις πραγματικό mapping
    const greekMatches   = makeDemoMatches("Greek");
    const euMatches      = makeDemoMatches("Euro");
    const asianMatches   = makeDemoMatches("Asian");
    const betfairMatches = makeDemoMatches("BF");

    renderPanel(BODY_GREEK, greekMatches);
    renderPanel(BODY_EU, euMatches);
    renderPanel(BODY_ASIAN, asianMatches);
    renderPanel(BODY_BETFAIR, betfairMatches);

    setMetaOnline();
  } catch (err) {
    console.warn("Odds API failed, falling back to demo:", err);
    renderPanel(BODY_GREEK, makeDemoMatches("Greek"));
    renderPanel(BODY_EU, makeDemoMatches("Euro"));
    renderPanel(BODY_ASIAN, makeDemoMatches("Asian"));
    renderPanel(BODY_BETFAIR, makeDemoMatches("BF"));
    setMetaOffline();
  }
}

/* ------------------------------------------------------------
   INIT
------------------------------------------------------------ */
function initOddsEngine() {
  fetchOdds();
  setInterval(fetchOdds, REFRESH_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOddsEngine);
} else {
  initOddsEngine();
}
