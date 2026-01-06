(function () {
  "use strict";
  if (window.__AIML_RIGHT_PANELS_FINAL__) return;
  window.__AIML_RIGHT_PANELS_FINAL__ = true;

  const AI_BRAIN_URL = "https://ai-matchlab-brain.pierros1402.workers.dev";

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, e => fn(e.detail));
  }
  function emitSafe(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }

  const els = { liveMeta: null, liveList: null };
  function resolve() {
    els.liveMeta = els.liveMeta || document.getElementById("live-meta");
    els.liveList = els.liveList || document.getElementById("live-list");
  }

  const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  function minuteText(m) {
    if (m.minute != null) return `${esc(m.minute)}′`;
    if (m.clock != null) return `${esc(m.clock)}′`;
    return "";
  }

  function scoreText(m) {
    if (m.score_text) return esc(m.score_text);
    if (m.scoreHome != null && m.scoreAway != null) return `${esc(m.scoreHome)}–${esc(m.scoreAway)}`;
    return "";
  }

  let matches = [];

  function render() {
    resolve();
    if (!els.liveList) return;
    if (els.liveMeta) els.liveMeta.textContent = `Live • ${matches.length}`;
    if (!matches.length) {
      els.liveList.innerHTML = "<div class='empty-state'>No live matches right now</div>";
      return;
    }
    const sorted = matches.slice().sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));
    let html = "";
    const groups = {};
    sorted.forEach(m => {
      const k = m.leagueName || "";
      (groups[k] = groups[k] || []).push(m);
    });
    Object.keys(groups).sort().forEach(lg => {
      html += `<div class="live-group"><div class="live-league">${esc(lg)}</div>`;
      groups[lg].forEach(m => {
        const min = minuteText(m);
        const sco = scoreText(m);
        html += `
          <div class="right-item live-item" data-id="${esc(m.id)}" data-home="${esc(m.home)}" data-away="${esc(m.away)}">
            <div class="right-main"><strong>${esc(m.home)} – ${esc(m.away)}</strong></div>
            <div class="right-sub">${min}${min && sco ? " • " : ""}${sco}</div>
          </div>`;
      });
      html += `</div>`;
    });
    els.liveList.innerHTML = html;
  }

  onSafe("live:update", ({ matches: list }) => {
    matches = Array.isArray(list) ? list : [];
    render();
  });

  // ΚΛΙΚ ΣΤΟ ΜΑΤΣ -> ΕΝΗΜΕΡΩΣΗ AI ΠΟΣΟΣΤΩΝ
  document.addEventListener("click", async e => {
    const item = e.target.closest(".live-item");
    if (!item) return;

    const home = item.dataset.home;
    const away = item.dataset.away;

    emitSafe("match-selected", { id: item.dataset.id, home, away });

    // UI Feedback: Δείξε ότι το AI αναλύει
    const titleEl = document.querySelector(".value-card .panel-title");
    const ggEl = document.querySelector('.value-item[data-type="gg"] .value-percent');
    const overEl = document.querySelector('.value-item[data-type="over"] .value-percent');
    
    if (titleEl) titleEl.textContent = `${home} vs ${away}`;
    if (ggEl) ggEl.textContent = "⏳";
    if (overEl) overEl.textContent = "⏳";

    try {
      const res = await fetch(`${AI_BRAIN_URL}/?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`);
      const data = await res.json();
      
      if (data.ok && data.prediction) {
        if (ggEl) ggEl.textContent = data.prediction.gg === "YES" ? "75%" : "25%";
        if (overEl) overEl.textContent = (data.prediction.goals?.ov25 || 0) + "%";
      } else {
        // Αν γράψει N/A, σημαίνει ότι ο Worker είναι οκ αλλά το KV άδειο
        if (ggEl) ggEl.textContent = "N/A";
        if (overEl) overEl.textContent = "N/A";
      }
    } catch (err) { console.error("AI Fetch Error:", err); }

    document.body.classList.remove("drawer-right-open");
  });

  render();
})();