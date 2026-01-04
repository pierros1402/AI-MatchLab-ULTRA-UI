(function () {
  "use strict";
  const AI_BRAIN_URL = "https://ai-matchlab-brain.pierros1402.workers.dev";

  window.on("match-selected", async (m) => {
    const titleEl = document.querySelector(".value-card .panel-title");
    const ggEl = document.querySelector('.value-item[data-type="gg"] .value-percent');
    const overEl = document.querySelector('.value-item[data-type="over"] .value-percent');

    if (titleEl) titleEl.textContent = `${m.home} vs ${m.away}`;
    if (ggEl) ggEl.textContent = "⏳";
    if (overEl) overEl.textContent = "⏳";

    try {
      const res = await fetch(`${AI_BRAIN_URL}/api/predict?home=${encodeURIComponent(m.home)}&away=${encodeURIComponent(m.away)}`);
      const data = await res.json();
      
      if (data.ok && data.prediction) {
        // Αντιστοίχιση με το output του Worker σου:
        // GG: YES/NO, Over 2.5: data.prediction.goals.ov25
        if (ggEl) ggEl.textContent = data.prediction.gg === "YES" ? "70%" : "30%"; 
        if (overEl) overEl.textContent = (data.prediction.goals?.ov25 || 0) + "%";
      } else {
        if (ggEl) ggEl.textContent = "N/A";
        if (overEl) overEl.textContent = "N/A";
      }
    } catch (e) { 
      console.error("AI Analysis Error", e);
      if (ggEl) ggEl.textContent = "Err";
    }
  });

  window.on("live:update", payload => {
    const list = document.getElementById("live-list");
    if (list && window.renderMatchRow) {
      list.innerHTML = "";
      (payload?.matches || []).forEach(m => {
        list.appendChild(window.renderMatchRow(m, { showScore: true, showMinute: true }));
      });
    }
  });
})();