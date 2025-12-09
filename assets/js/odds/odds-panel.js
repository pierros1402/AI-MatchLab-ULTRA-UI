/* ============================================================
   AI MATCHLAB ULTRA — UNIFIED ODDS ENGINE (GLASS UI EDITION)
   Opening Odds + Current Odds | Neon Blue/Orange UI Ready
============================================================ */

const ODDS_API_KEY = "5c35e05ea0c96662a64f4a7d7140e1b4";
const ODDS_API_URL =
  `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${ODDS_API_KEY}&regions=eu,uk,us&markets=h2h`;

let OPENING_CACHE = {};
let ODDS_CACHE = null;
let LAST_UPDATE = null;

const OPENING_KEY = "AIML_OPENING_ODDS";
const CLEANUP_HOURS = 48;

/* -----------------------------------------------------------
   LOAD / SAVE OPENING ODDS
----------------------------------------------------------- */
function loadOpening() {
  try {
    OPENING_CACHE = JSON.parse(localStorage.getItem(OPENING_KEY)) || {};
  } catch {
    OPENING_CACHE = {};
  }
}
function saveOpening() {
  try {
    localStorage.setItem(OPENING_KEY, JSON.stringify(OPENING_CACHE));
  } catch {}
}

/* -----------------------------------------------------------
   CLEAN OPENING ODDS (older than 48h)
----------------------------------------------------------- */
function cleanupOpening() {
  const cutoff = Date.now() - CLEANUP_HOURS * 3600 * 1000;
  for (const id in OPENING_CACHE) {
    if (OPENING_CACHE[id].timestamp < cutoff) delete OPENING_CACHE[id];
  }
  saveOpening();
}

/* -----------------------------------------------------------
   BOOKMAKER GROUPS
----------------------------------------------------------- */
const GREEK_BM = ["bet365", "stoiximan", "opap", "novibet"];
const EURO_BM = ["williamhill", "ladbrokes", "unibet", "bwin", "pinnacle"];
const ASIAN_BM = ["pinnacle", "sbo", "188bet", "12bet", "maxbet"];
const BETFAIR_BM = ["betfair"];

/* -----------------------------------------------------------
   FETCH ODDS safely
----------------------------------------------------------- */
async function fetchOdds() {
  try {
    const res = await fetch(ODDS_API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Bad response " + res.status);
    const data = await res.json();

    ODDS_CACHE = data;
    LAST_UPDATE = new Date();

    storeOpening(data);
    cleanupOpening();
    renderAll();

  } catch (err) {
    console.error("ODDS ERROR:", err);
    renderOffline();
  }
}

/* -----------------------------------------------------------
   STORE OPENING ODDS ONLY ON FIRST FETCH
----------------------------------------------------------- */
function storeOpening(events) {
  events.forEach(ev => {
    if (!OPENING_CACHE[ev.id]) {
      OPENING_CACHE[ev.id] = {
        timestamp: Date.now(),
        bookmakers: JSON.parse(JSON.stringify(ev.bookmakers || []))
      };
    }
  });
  saveOpening();
}

/* -----------------------------------------------------------
   FILTER BY BOOKMAKER GROUP
----------------------------------------------------------- */
function filterEvents(events, group) {
  return events
    .map(ev => {
      const bms = (ev.bookmakers || []).filter(b => group.includes(b.key.toLowerCase()));
      return bms.length ? { ...ev, bookmakers: bms } : null;
    })
    .filter(Boolean);
}

/* -----------------------------------------------------------
   EXTRACT H2H PRICES
----------------------------------------------------------- */
function extractH2H(bm, ev) {
  const market = bm.markets?.find(m => m.key === "h2h");
  if (!market) return null;

  const out = {};
  for (const o of market.outcomes) {
    if (o.name === ev.home_team) out.home = o.price;
    if (o.name === ev.away_team) out.away = o.price;
  }
  return out.home && out.away ? out : null;
}

/* -----------------------------------------------------------
   RENDER PANEL
----------------------------------------------------------- */
function renderPanel(events, bodyId, metaId) {
  const body = document.getElementById(bodyId);
  const meta = document.getElementById(metaId);
  if (!body) return;

  if (!events.length) {
    body.innerHTML = `<div class="odds-empty">No data available</div>`;
    if (meta) meta.textContent = "";
    return;
  }

  body.innerHTML = events
    .map(ev => {
      const eid = ev.id;

      const rows = ev.bookmakers
        .map(bm => {
          const oldBM = OPENING_CACHE[eid]?.bookmakers?.find(b => b.key === bm.key);
          const opening = oldBM ? extractH2H(oldBM, ev) : null;
          const current = extractH2H(bm, ev);

          if (!opening || !current) return "";

          const arrowH =
            current.home > opening.home ? "↑" :
            current.home < opening.home ? "↓" : "•";

          const arrowA =
            current.away > opening.away ? "↑" :
            current.away < opening.away ? "↓" : "•";

          return `
            <div class="odds-line">
              <span class="bm-name">${bm.title}</span>
              <span class="pair">
                <span class="open">O:${opening.home}</span> |
                <span class="curr neon-blue">C:${current.home}</span>
                <b class="${arrowH === '↑' ? 'neon-green' : arrowH === '↓' ? 'neon-red' : 'neon-orange'}">${arrowH}</b>

                &nbsp;&nbsp;

                <span class="open">O:${opening.away}</span> |
                <span class="curr neon-blue">C:${current.away}</span>
                <b class="${arrowA === '↑' ? 'neon-green' : arrowA === '↓' ? 'neon-red' : 'neon-orange'}">${arrowA}</b>
              </span>
            </div>
          `;
        })
        .join("");

      return `
        <div class="odds-event glass-card">
          <div class="odds-teams">${ev.home_team} vs ${ev.away_team}</div>
          ${rows}
        </div>
      `;
    })
    .join("");

  if (meta && LAST_UPDATE) meta.textContent = `Updated: ${LAST_UPDATE.toLocaleTimeString()}`;
}

/* -----------------------------------------------------------
   RENDER ALL GROUPS
----------------------------------------------------------- */
function renderAll() {
  if (!ODDS_CACHE) return;

  renderPanel(filterEvents(ODDS_CACHE, GREEK_BM), "greek-odds-body", "greek-odds-meta");
  renderPanel(filterEvents(ODDS_CACHE, EURO_BM), "eu-odds-body", "eu-odds-meta");
  renderPanel(filterEvents(ODDS_CACHE, ASIAN_BM), "asian-odds-body", "asian-odds-meta");
  renderPanel(filterEvents(ODDS_CACHE, BETFAIR_BM), "betfair-odds-body", "betfair-odds-meta");
}

/* -----------------------------------------------------------
   OFFLINE
----------------------------------------------------------- */
function renderOffline() {
  ["greek", "eu", "asian", "betfair"].forEach(id => {
    const el = document.getElementById(`${id}-odds-body`);
    if (el) el.innerHTML = `<div class="odds-empty">Offline</div>`;
  });
}

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadOpening();
  cleanupOpening();
  fetchOdds();
});
setInterval(fetchOdds, 60 * 60 * 1000);
