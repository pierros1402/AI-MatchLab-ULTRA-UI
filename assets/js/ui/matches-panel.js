(function () {
  const init = () => {
    if (typeof window.on !== "function") {
      setTimeout(init, 50);
      return;
    }

    const listEl = document.getElementById("matches-list");
    const AI_BRAIN_URL = "https://ai-matchlab-brain.pierros1402.workers.dev";
    let allMatches = [];

    async function fetchAIForBatch(matches) {
      if (!matches.length) return;
      const payload = matches.slice(0, 40).map(m => ({ id: m.id, home: m.home, away: m.away }));
      
      try {
        const res = await fetch(`${AI_BRAIN_URL}/api/predict/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matches: payload })
        });
        const data = await res.json();
        if (!data.ok || !data.predictions) return;

        Object.keys(data.predictions).forEach(id => {
          const container = document.getElementById(`ai-pred-${id}`);
          if (container) {
            const p = data.predictions[id];
            // Προσαρμογή στα πεδία του Worker: p.gg και p.goals.ov25
            const ggDisplay = p.gg === "YES" ? "GG" : "NG";
            const ovVal = p.goals?.ov25 || 0;
            
            container.innerHTML = `
              <span style="color:#00ff88;font-size:10px;font-weight:bold;">${ggDisplay}</span> 
              <span style="color:#00dbff;font-size:10px;font-weight:bold;margin-left:5px;">O2.5: ${ovVal}%</span>
            `;
          }
        });
      } catch (e) { console.warn("AI Batch Fail", e); }
    }

    window.on("fixtures:loaded", payload => {
      allMatches = payload?.matches || [];
      if (listEl) {
        listEl.innerHTML = "";
        allMatches.forEach(m => listEl.appendChild(window.renderMatchRow(m, { showTime: true })));
      }
      fetchAIForBatch(allMatches);
    });

    window.on("league-selected", l => {
      const filtered = l?.id ? allMatches.filter(m => m.aimlLeagueId === l.id) : allMatches;
      if (listEl) {
        listEl.innerHTML = "";
        filtered.forEach(m => listEl.appendChild(window.renderMatchRow(m, { showTime: true })));
      }
      fetchAIForBatch(filtered);
    });
  };
  init();
})();