const LIVE_ENDPOINT =
  "https://live-matches-worker.pierros1402.workers.dev/api/live-matches";

const liveContainer = document.getElementById("live-container");

async function loadLive() {
  try {
    const res = await fetch(LIVE_ENDPOINT, { cache: "no-store" });
    const data = await res.json();

    renderLive(data);
  } catch (e) {
    liveContainer.innerHTML = "<em>Error loading live data</em>";
  }
}

function renderLive(matches) {
  if (!matches || matches.length === 0) {
    liveContainer.innerHTML = "<em>No live matches at the moment</em>";
    return;
  }

  liveContainer.innerHTML = matches
    .map(
      (m) => `
      <div class="live-match">
        <div class="league">${m.league}</div>
        <div class="teams">${m.home} ${m.homeScore} - ${m.awayScore} ${m.away}</div>
        <div class="status">${m.status}</div>
      </div>`
    )
    .join("");
}

loadLive();
setInterval(loadLive, 20000);
