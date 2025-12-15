// ====================================================================
// TOP PICKS ENGINE (HUB VERSION — COMPLETE)
// ====================================================================
//
// Συνδυάζει:
// - EV Signals
// - Ratings Strength Differential
// - Goal Expectancy Model
// - Sharp vs Soft Discrepancy
//
// Παράγει:
// - VALUE PICK
// - STRENGTH PICK
// - GOAL PICK
//
// ====================================================================

const panel = document.getElementById("panel-top-picks");

if (!panel) {
  console.warn("[TOP PICKS] Panel not found");
}


// ====================================================================
// LISTEN TO HUB
// ====================================================================
on("hub:ready", hub => {
  panel.innerHTML = renderTopPicks(hub);
});


// ====================================================================
// RENDER FUNCTION
// ====================================================================
function renderTopPicks(hub) {

  const picks = [];

  // ------------------------------------------------------------
  // 1. VALUE PICK (Expected Value > 12%)
  // ------------------------------------------------------------
  if (hub.ev) {
    const bestSide = bestEV(hub.ev);
    if (bestSide.ev > 0.12) {
      picks.push({
        title: "Value Opportunity",
        detail: `Highest EV on ${bestSide.label}`,
        highlight: `${pct(bestSide.ev)}`
      });
    }
  }

  // ------------------------------------------------------------
  // 2. STRENGTH PICK (Ratings Gap > 12 points)
  // ------------------------------------------------------------
  const gap = hub.ratings.home - hub.ratings.away;

  if (Math.abs(gap) > 12) {
    picks.push({
      title: "Strength Differential",
      detail: gap > 0
        ? "Home team significantly stronger"
        : "Away team significantly stronger",
      highlight: Math.abs(gap).toFixed(1)
    });
  }

  // ------------------------------------------------------------
  // 3. GOALS PICK (Expectancy > 2.9 or < 2.1)
  // ------------------------------------------------------------
  const ge = hub.goalStats.expectancy;

  if (ge > 2.9) {
    picks.push({
      title: "Goals Projection",
      detail: "High-scoring match expected",
      highlight: ge.toFixed(2)
    });
  } else if (ge < 2.1) {
    picks.push({
      title: "Low Goals Projection",
      detail: "Likely under-goals scenario",
      highlight: ge.toFixed(2)
    });
  }

  // ------------------------------------------------------------
  // NO PICKS?
  // ------------------------------------------------------------
  if (!picks.length) {
    return `
      <div class="empty-panel">No strong picks for this match</div>
    `;
  }

  // ------------------------------------------------------------
  // BUILD HTML
  // ------------------------------------------------------------
  let html = `<div class="tp-title">Top Picks</div>`;

  picks.forEach(p => {
    html += `
      <div class="tp-row">
        <div class="tp-header">${p.title}</div>
        <div class="tp-detail">${p.detail}</div>
        <div class="tp-high">${p.highlight}</div>
      </div>
    `;
  });

  return html;
}


// ====================================================================
// HELPER FUNCTIONS
// ====================================================================
function bestEV(ev) {
  const map = [
    { side: "home", ev: ev.home, label: "Home" },
    { side: "draw", ev: ev.draw, label: "Draw" },
    { side: "away", ev: ev.away, label: "Away" }
  ];

  return map.sort((a, b) => b.ev - a.ev)[0];
}

function pct(n) {
  return Math.round(n * 100) + "%";
}
