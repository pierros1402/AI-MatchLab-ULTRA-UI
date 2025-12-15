// ====================================================================
// MARKET COMPARATOR PANEL (HUB VERSION — COMPLETE)
// ====================================================================

const panel = document.getElementById("panel-market");

if (!panel) {
  console.warn("[MARKET] panel not found");
}


// ====================================================================
// LISTEN TO HUB
// ====================================================================
on("hub:ready", hub => {
  if (!hub || !hub.soft || !hub.sharp) {
    panel.innerHTML = `<div class="empty-panel">Waiting market data...</div>`;
    return;
  }

  panel.innerHTML = renderMarket(hub.soft, hub.sharp);
});


// ====================================================================
// RENDER
// ====================================================================
function renderMarket(soft, sharp) {
  return `
    <div class="mk-title">Market Comparator</div>

    ${renderRow("Home", soft.home, sharp.home)}
    ${renderRow("Draw", soft.draw, sharp.draw)}
    ${renderRow("Away", soft.away, sharp.away)}
  `;
}

function renderRow(label, soft, sharp) {
  const isValue = soft > sharp;
  const cls = isValue ? "mk-best" : "";

  return `
    <div class="mk-row">
      <div class="mk-col"><b>${label}</b></div>
      <div class="mk-col">Soft: ${soft}</div>
      <div class="mk-col">Sharp: ${sharp.toFixed(2)}</div>
      <div class="mk-col ${cls}">${isValue ? "VALUE" : "-"}</div>
    </div>
  `;
}
