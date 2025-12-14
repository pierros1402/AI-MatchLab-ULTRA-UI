// ====================================================================
// H2H PANEL (HUB VERSION — COMPLETE)
// ====================================================================

const panel = document.getElementById("panel-h2h");

if (!panel) {
  console.warn("[H2H] panel not found");
}


// ====================================================================
// LISTEN TO HUB
// ====================================================================
on("hub:ready", hub => {
  if (!hub || !hub.h2h) {
    panel.innerHTML = `<div class="empty-panel">No H2H data</div>`;
    return;
  }

  panel.innerHTML = renderH2H(hub.h2h);
});


// ====================================================================
// RENDER
// ====================================================================
function renderH2H(list) {
  if (!list.length) {
    return `<div class="empty-panel">No recent meetings</div>`;
  }

  let html = `<div class="h2h-title">Head-to-Head</div>
              <div class="h2h-count">${list.length} matches</div>`;

  for (const m of list) {
    html += `
      <div class="h2h-row">
        <div class="h2h-date">${m.date}</div>
        <div class="h2h-score">${m.home} ${m.score} ${m.away}</div>
        <div class="h2h-result">${m.result}</div>
      </div>
    `;
  }

  return html;
}
