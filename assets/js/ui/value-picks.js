(function () {
  "use strict";
  const elList = document.getElementById("value-picks-list");
  const elMeta = document.getElementById("value-picks-meta");

  window.on("ai:value-picks-ready", (topPicks) => {
    if (!elList) return;
    elList.innerHTML = topPicks.length ? topPicks.map(v => `
      <div class="right-item" style="cursor:pointer; padding:12px; border-bottom:1px solid #222;" 
           onclick="window.emit('match-selected', ${JSON.stringify(v.match).replace(/"/g, '&quot;')})">
        <div class="right-main"><strong>${v.match.home} - ${v.match.away}</strong></div>
        <div class="right-sub">AI Edge: <span style="color:#00ff88">${v.ov25}% Over 2.5</span></div>
      </div>
    `).join("") : '<div class="right-empty">No high value picks found.</div>';

    if (elMeta) elMeta.textContent = `AI Picks · ${topPicks.length}`;
  });
})();