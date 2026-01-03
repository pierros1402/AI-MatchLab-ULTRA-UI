/* =====================================================
   TODAY PANEL
===================================================== */

(function () {
  let ready = false;

  function tryInit() {
    if (ready) return;
    if (!window.on || typeof window.renderMatchRow !== "function") return;

    ready = true;
    init();
  }

  /* =====================================================
     LIVE STATUS DEFINITIONS (CONFIRMED)
  ===================================================== */

  const LIVE_STATUSES = [
    "LIVE", "IN_PROGRESS", "INPLAY", "IN_PLAY",
    "FIRST_HALF", "SECOND_HALF", "1H", "2H",
    "HT", "HALFTIME", "ET", "AET", "PEN", "RUNNING"
  ];

  function normStatus(s) {
    return String(s || "").toUpperCase();
  }

  function isConfirmedLive(status) {
    const s = normStatus(status);
    return LIVE_STATUSES.includes(s) || /\bH\b/.test(s);
  }

  /* =====================================================
     ESTIMATED LIVE (TIME-BASED FALLBACK)
  ===================================================== */

  function isEstimatedLive(m) {
    if (!m || !m.kickoff_ms) return false;
    const now = Date.now();
    const diff = now - m.kickoff_ms;
    return diff > 0 && diff < 2 * 60 * 60 * 1000;
  }

  function isLive(m) {
    return isConfirmedLive(m.status) || isEstimatedLive(m);
  }

  function isUpcoming(status) {
    const s = normStatus(status);
    return s === "UPCOMING" || s === "SCHEDULED" || s === "PRE";
  }

  function getKickoffDate(m) {
    if (m.kickoff) return new Date(m.kickoff);
    if (m.kickoff_ms) return new Date(m.kickoff_ms);
    return null;
  }

  /* =====================================================
     RENDER
  ===================================================== */

  function render(allMatches) {
    const list = document.getElementById("today-list");
    if (!list) return;

    list.innerHTML = "";

    const matches = (Array.isArray(allMatches) ? allMatches : []).filter(
      m => isLive(m) || isUpcoming(m.status)
    );

    window.AIML_TODAY_MATCHES = matches;

    if (window.emit) {
      const liveNow = matches.filter(isLive);
      window.emit("today:live-scan", { ts: Date.now(), matches: liveNow });
    }

    if (!matches.length) {
      list.innerHTML =
        `<div class="empty-state">No live or upcoming matches</div>`;
      return;
    }

    const sorted = matches.slice().sort((a, b) => {
      const da = getKickoffDate(a);
      const db = getKickoffDate(b);
      if (!da || !db) return 0;
      return da - db;
    });

    const byTime = {};
    sorted.forEach(m => {
      const d = getKickoffDate(m);
      if (!d) return;
      const key =
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      (byTime[key] = byTime[key] || []).push(m);
    });

    Object.keys(byTime).forEach(timeKey => {
      const timeHeader = document.createElement("div");
      timeHeader.className = "today-time-header";
      timeHeader.textContent = timeKey;
      list.appendChild(timeHeader);

      byTime[timeKey].forEach(m => {
        const live = isLive(m);
        const row = window.renderMatchRow(m, {
          showTime: !live,
          showMinute: live,
          showScore: live,
          showLeague: true,
          leagueStyle: "subtle"
        });
        list.appendChild(row);
      });
    });
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  function init() {
    window.on("today-matches:loaded", payload => {
      const matches =
        payload?.matches ||
        payload?.items ||
        payload?.data ||
        [];
      render(matches);
    });

    if (window.__AIML_LAST_TODAY__) {
      const p = window.__AIML_LAST_TODAY__;
      const matches =
        p?.matches ||
        p?.items ||
        p?.data ||
        [];
      render(matches);
    }
  }

  // ---- deferred boot (NO RANDOM EMPTY STATE) ----
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    tryInit();
    if (ready || tries > 60) clearInterval(timer);
  }, 50);
})();
