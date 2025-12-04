// =======================================================================
// AI MATCHLAB — ODDS CENTER UI
// Συνδέεται με odds-signals-engine.pierros1402.workers.dev
// και γεμίζει τα 4 κεντρικά panels (Greek / Betfair / Europe / Asian).
// =======================================================================

const ODDS_ENDPOINT =
  "https://odds-signals-engine.pierros1402.workers.dev/api/signals";

// ------------------------------------------------------------
// Fetch helper
// ------------------------------------------------------------
async function fetchSignals() {
  try {
    const res = await fetch(ODDS_ENDPOINT, { cache: "no-store" });
    if (!res.ok) {
      console.warn("[ODDS UI] Failed to fetch signals:", res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[ODDS UI] Error fetching signals:", err);
    return null;
  }
}

// ------------------------------------------------------------
// Rendering helpers
// ------------------------------------------------------------
function safeNumber(v, digits = 2) {
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  return v.toFixed(digits);
}

function renderPanel(bodyId, metaId, signals, label) {
  const body = document.getElementById(bodyId);
  const meta = document.getElementById(metaId);
  if (!body || !meta) return;

  if (!Array.isArray(signals) || signals.length === 0) {
    body.innerHTML = `<div class="odds-empty">No active signals for ${label}.</div>`;
    meta.textContent = "";
    return;
  }

  meta.textContent = `${signals.length} signals`;

  body.innerHTML = signals
    .map((s) => {
      const dirArrow = s.direction === "up" ? "↑" : s.direction === "down" ? "↓" : "";
      const rowClass =
        s.direction === "up"
          ? "odds-row up"
          : s.direction === "down"
          ? "odds-row down"
          : "odds-row";

      const sev =
        s.severity === "major"
          ? "●●●"
          : s.severity === "moderate"
          ? "●●○"
          : s.severity === "minor"
          ? "●○○"
          : "";

      const oldOdds = safeNumber(s.old_odds);
      const newOdds = safeNumber(s.new_odds);
      const changePct = safeNumber(s.change_pct);

      const matchLabel =
        (s.home_team && s.away_team)
          ? `${s.home_team} vs ${s.away_team}`
          : s.match_id || "Unknown match";

      const leagueLabel = [s.country_code, s.league_code]
        .filter(Boolean)
        .join(" · ");

      return `
        <div class="${rowClass}">
          <div>
            <div class="odds-match">${matchLabel}</div>
            <div class="odds-league">${leagueLabel}</div>
          </div>
          <div>
            <div class="odds-market">${s.market || ""} — ${s.selection || ""}</div>
            <div class="odds-bookmaker">${s.bookmaker || ""}</div>
          </div>
          <div class="odds-change">
            ${
              oldOdds
                ? `<span class="odds-old">${oldOdds}</span>`
                : ""
            }
            ${
              dirArrow
                ? `<span class="odds-arrow">${dirArrow}</span>`
                : ""
            }
            ${
              newOdds
                ? `<span class="odds-new">${newOdds}</span>`
                : ""
            }
            ${
              changePct
                ? `<span class="odds-pct">(${changePct}%)</span>`
                : ""
            }
          </div>
          <div class="odds-severity">${sev}</div>
        </div>
      `;
    })
    .join("");
}

// ------------------------------------------------------------
// Main refresh
// ------------------------------------------------------------
async function refreshOddsCenter() {
  const data = await fetchSignals();
  if (!data || !data.panels) {
    console.warn("[ODDS UI] No data.panels from worker");
    // clear panels για να μην μένει παλιό state
    renderPanel("greek-odds-body", "greek-odds-meta", [], "Greek");
    renderPanel("betfair-odds-body", "betfair-odds-meta", [], "Betfair");
    renderPanel("eu-odds-body", "eu-odds-meta", [], "European");
    renderPanel("asian-odds-body", "asian-odds-meta", [], "Asian");
    return;
  }

  const { panels } = data;

  renderPanel("greek-odds-body", "greek-odds-meta", panels.greek || [], "Greek");
  renderPanel("betfair-odds-body", "betfair-odds-meta", panels.betfair || [], "Betfair");
  renderPanel("eu-odds-body", "eu-odds-meta", panels.europe || [], "European");
  renderPanel("asian-odds-body", "asian-odds-meta", panels.asian || [], "Asian");
}

function initOddsCenter() {
  refreshOddsCenter();
  // ανανέωση κάθε 60s (όταν θες το αλλάζεις)
  setInterval(refreshOddsCenter, 60000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOddsCenter);
} else {
  initOddsCenter();
}
