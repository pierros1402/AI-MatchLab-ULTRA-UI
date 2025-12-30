/* =========================================================
   AI MatchLab ULTRA — Right Panels FINAL (RESTORED)
   LIVE:
   - League header
   - Minute από m.minute / m.clock (όπως παλιά)
========================================================= */
(function () {
  "use strict";
  if (window.__AIML_RIGHT_PANELS_RESTORED__) return;
  window.__AIML_RIGHT_PANELS_RESTORED__ = true;

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, (e) => fn(e.detail));
  }
  function emitSafe(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }

  const els = {
    liveMeta: null,
    liveList: null
  };

  function resolve() {
    els.liveMeta = els.liveMeta || document.getElementById("live-meta");
    els.liveList = els.liveList || document.getElementById("live-list");
  }

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  function leagueKey(m) {
    return (
      m.leagueName ||
      m.league ||
      m.league_slug ||
      m.aimlLeagueId ||
      "Other"
    );
  }

  function minuteText(m) {
    if (m.minute != null) return `${esc(m.minute)}’`;
    if (m.clock != null) return `${esc(m.clock)}’`;
    return "";
  }

  function scoreText(m) {
    if (m.score_text) return esc(m.score_text);
    if (m.scoreHome != null && m.scoreAway != null)
      return `${esc(m.scoreHome)}–${esc(m.scoreAway)}`;
    return "";
  }

  let matches = [];

  function render() {
    resolve();
    if (!els.liveList) return;

    if (els.liveMeta) els.liveMeta.textContent = `Live • ${matches.length}`;

    if (!matches.length) {
      els.liveList.innerHTML =
        "<div class='right-empty'>No live matches.</div>";
      return;
    }

    const groups = {};
    matches.forEach((m) => {
      const k = leagueKey(m);
      (groups[k] = groups[k] || []).push(m);
    });

    let html = "";

    Object.keys(groups).sort().forEach((lg) => {
      html += `
        <div class="live-group">
          <div class="live-league">${esc(lg)}</div>
      `;

      groups[lg].forEach((m) => {
        const minute = minuteText(m);
        const score = scoreText(m);

        html += `
          <div class="right-item live-item"
               data-id="${esc(m.id)}"
               data-home="${esc(m.home)}"
               data-away="${esc(m.away)}">
            <div class="right-main">
              <strong>${esc(m.home)} – ${esc(m.away)}</strong>
            </div>
            <div class="right-sub">
              ${minute}${minute && score ? " • " : ""}${score}
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    els.liveList.innerHTML = html;
  }

  onSafe("today:updated", (list) => {
  matches = Array.isArray(list)
    ? list.filter(m => m.status === "LIVE")
    : [];
  render();
});

  document.addEventListener("click", (e) => {
    const item = e.target.closest(".live-item");
    if (!item) return;

    emitSafe("match-selected", {
      id: item.dataset.id,
      home: item.dataset.home,
      away: item.dataset.away
    });

    document.body.classList.remove("drawer-right-open");
  });

  render();
})();
