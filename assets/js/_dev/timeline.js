// ====================================================================
// MATCH TIMELINE PANEL — FULL EVENT TRACKER
// ====================================================================
//
// Δουλεύει με event: "live-events-loaded"
// Τα events τα δίνει το Live API stream ή το proxy σου
//
// ====================================================================

const tlPanel = document.getElementById("panel-timeline");
if (!tlPanel) console.warn("[TIMELINE] panel missing");

let timelineEvents = [];

// Listen for event updates
on("live-events-loaded", data => {
  timelineEvents = data.events || [];
  renderTimeline();
});

// ====================================================================
// MAIN RENDER
// ====================================================================
function renderTimeline() {
  if (!timelineEvents.length) {
    tlPanel.innerHTML = `<div class="empty-panel">No events yet</div>`;
    return;
  }

  let html = `<div class="tl-title">Match Timeline</div>`;

  timelineEvents.forEach(ev => {
    html += renderEvent(ev);
  });

  tlPanel.innerHTML = html;
}


// ====================================================================
// RENDER SINGLE EVENT
// ====================================================================
function renderEvent(ev) {
  const side = ev.team?.name || "";
  const player = ev.player?.name || "";
  const assist = ev.assist?.name ? ` (${ev.assist.name})` : "";
  const time = ev.time?.elapsed || 0;

  const icon = iconForEvent(ev.type, ev.detail);
  const cls  = classForEvent(ev.type, ev.detail);

  return `
    <div class="tl-item ${cls}">
      <div class="tl-time">${time}'</div>
      <div class="tl-icon">${icon}</div>
      <div class="tl-text">
        <b>${ev.type}</b> — ${ev.detail}<br>
        ${player}${assist}
      </div>
      <div class="tl-team">${side}</div>
    </div>
  `;
}


// ====================================================================
// EVENT ICONS
// ====================================================================
function iconForEvent(type, detail) {
  if (type === "Goal") return "⚽";
  if (type === "Card" && detail === "Yellow Card") return "🟨";
  if (type === "Card" && detail === "Red Card") return "🟥";
  if (type === "Card" && detail === "Second Yellow card") return "🟨🟥";
  if (type === "subst") return "🔄";
  if (type === "Var") return "🖥️";
  return "•";
}


// ====================================================================
// EVENT CLASSES (for color coding)
// ====================================================================
function classForEvent(type, detail) {
  if (type === "Goal") return "tl-goal";
  if (type === "Card" && detail === "Yellow Card") return "tl-yellow";
  if (type === "Card" && detail === "Red Card") return "tl-red";
  if (type === "Card" && detail === "Second Yellow card") return "tl-red";
  if (type === "subst") return "tl-sub";
  if (type === "Var") return "tl-var";
  return "tl-other";
}
