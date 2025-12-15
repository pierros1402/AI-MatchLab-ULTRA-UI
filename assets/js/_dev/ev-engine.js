// ====================================================================
// EXPECTED VALUE PANEL (HUB VERSION — COMPLETE)
// ====================================================================

const panel = document.getElementById("panel-ev");

if (!panel) {
  console.warn("[EV] panel not found");
}


// ====================================================================
// LISTEN TO HUB
// ====================================================================
on("hub:ready", hub => {
  if (!hub || !hub.ev || !hub.soft) {
    panel.innerHTML = `<div class="empty-panel">Waiting for odds...</div>`;
    return;
  }

  panel.innerHTML = renderEV(hub);
});


// ====================================================================
// RENDER
// ====================================================================
function renderEV(hub) {
  const p = hub.probabilities;
  const ev = hub.ev;
  const soft = hub.soft;
  const sharp = hub.sharp;

  return `
    <div class="ev-title">Expected Value</div>

    ${renderRow("Home", p.home, sharp.home, soft.home, ev.home)}
    ${renderRow("Draw", p.draw, sharp.draw, soft.draw, ev.draw)}
    ${renderRow("Away", p.away, sharp.away, soft.away, ev.away)}
  `;
}

function renderRow(label, prob, sharp, soft, ev) {
  const cls = ev > 0 ? "ev-pos" : "ev-neg";

  return `
    <div class="ev-row">
      <div class="ev-col"><b>${label}</b></div>
      <div class="ev-col">Prob: ${pct(prob)}</div>
      <div class="ev-col">Sharp: ${sharp.toFixed(2)}</div>
      <div class="ev-col">Soft: ${soft}</div>
      <div class="ev-col ${cls}">EV: ${pct(ev)}</div>
    </div>
  `;
}

function pct(n) {
  return Math.round(n * 100) + "%";
}
