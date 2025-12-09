/* ============================================================
   AI MATCHLAB ULTRA — LIVE ENGINE (SAFE VERSION)
   Προσπαθεί να φέρει live από worker, αλλιώς γράφει "offline"
============================================================ */

const LIVE_PANEL = document.getElementById("panel-live");
const LIVE_WORKER_URL = "https://live-matches-worker.pierros1402.workers.dev/api/live-matches";

function showOffline(msg = "Live service offline.") {
  if (!LIVE_PANEL) return;
  LIVE_PANEL.innerHTML = `
    <h3>Live Matches</h3>
    <div class="muted" style="margin-top:6px;">${msg}</div>
  `;
}

function renderLive(matches) {
  if (!LIVE_PANEL) return;
  LIVE_PANEL.innerHTML = `<h3>Live Matches</h3>`;

  if (!Array.isArray(matches) || !matches.length) {
    LIVE_PANEL.innerHTML += `<div class="muted" style="margin-top:6px;">No live matches.</div>`;
    return;
  }

  matches.forEach(m => {
    const row = document.createElement("div");
    row.className = "live-match-row";
    row.innerHTML = `
      <div class="teams">${m.home} vs ${m.away}</div>
      <div class="score">${m.score || "-"}</div>
      <div class="minute">${m.minute || ""}</div>
    `;
    LIVE_PANEL.appendChild(row);
  });
}

async function fetchLive() {
  try {
    const res = await fetch(LIVE_WORKER_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Περιμένουμε data.matches = [...]
    const matches = Array.isArray(data.matches) ? data.matches : [];
    renderLive(matches);
  } catch (err) {
    console.warn("Live worker error:", err);
    showOffline();
  }
}

function initLive() {
  if (!LIVE_PANEL) return;
  showOffline("Loading live matches...");
  fetchLive();
  // για τώρα, refresh ανά 2 λεπτά
  setInterval(fetchLive, 120000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLive);
} else {
  initLive();
}
