(function () {
  if (!window.on || !window.emit) return;

  var TZ = "Europe/Athens";
  var lastPayload = null;
  var selectedDayKey = null; // YYYY-MM-DD (GR local)

  /* =========================
     TIME HELPERS
     ========================= */

  function pad2(n) { return String(n).padStart(2, "0"); }

  function dayKeyFromMsGR(ms) {
    try {
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(new Date(ms));
      var y = parts.find(p => p.type === "year")?.value || "";
      var m = parts.find(p => p.type === "month")?.value || "";
      var d = parts.find(p => p.type === "day")?.value || "";
      return y && m && d ? (y + "-" + m + "-" + d) : "";
    } catch (e) {
      var dt = new Date(ms);
      return dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate());
    }
  }

  function dayKeyNowGR() {
    return dayKeyFromMsGR(Date.now());
  }

  function timeHHMM_GR(ms) {
    try {
      return new Intl.DateTimeFormat("el-GR", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(new Date(ms));
    } catch (e) {
      var d = new Date(ms);
      return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    }
  }

  /* =========================
     NORMALIZATION
     ========================= */

  function normalize(match) {
    var kickoffMs = match.kickoff_ms || (match.kickoff ? Date.parse(match.kickoff) : 0);

    var leagueName =
      match.leagueName && match.leagueName !== "Unknown" && match.leagueName !== "Unknown League"
        ? match.leagueName
        : (match.leagueSlug || "—");

    return Object.assign({}, match, {
      kickoff_ms: kickoffMs,
      leagueName: leagueName,
      leagueSlug: match.leagueSlug || match.league || "",
      __dayKeyGR: kickoffMs ? dayKeyFromMsGR(kickoffMs) : ""
    });
  }

  /* =========================
     VISIBILITY (TODAY ONLY)
     ========================= */

  function isVisibleToday(m) {
    // Today panel: PRE + LIVE
    return m.status === "LIVE" || m.status === "PRE";
  }

  /* =========================
     GROUPING
     ========================= */

  function groupMatches(list) {
    var groups = [];
    var map = Object.create(null);

    list.forEach(function (m) {
      var hhmm = m.kickoff_ms ? timeHHMM_GR(m.kickoff_ms) : "--:--";
      var leagueKey = m.leagueSlug || m.leagueName || "—";
      var key = leagueKey + "___" + hhmm;

      if (!map[key]) {
        map[key] = {
          leagueName: m.leagueName || "—",
          leagueSlug: m.leagueSlug || "",
          time: hhmm,
          kickoff_ms: m.kickoff_ms || 0,
          items: []
        };
        groups.push(map[key]);
      }
      map[key].items.push(m);
    });

    groups.sort(function (a, b) {
      return (a.kickoff_ms || 0) - (b.kickoff_ms || 0);
    });

    return groups;
  }

  /* =========================
     RENDER
     ========================= */

  function renderEmpty(root, msg) {
    root.innerHTML = "";
    var empty = document.createElement("div");
    empty.className = "today-empty";
    empty.textContent = msg || "Δεν υπάρχουν αγώνες για αυτή την ημέρα.";
    root.appendChild(empty);
  }

  function renderGroups(root, groups) {
    root.innerHTML = "";

    groups.forEach(function (g) {
      var wrap = document.createElement("div");
      wrap.className = "today-group";

      var gh = document.createElement("div");
      gh.className = "today-group-header";

      var time = document.createElement("div");
      time.className = "today-group-time";
      time.textContent = g.time;

      var league = document.createElement("div");
      league.className = "today-group-league";
      league.textContent = g.leagueName;

      gh.appendChild(time);
      gh.appendChild(league);
      wrap.appendChild(gh);

      g.items.forEach(function (m) {
        var row = document.createElement("div");
        row.className = "today-match-row";

        var teams = document.createElement("div");
        teams.className = "today-match-teams";
        teams.textContent = (m.home || "") + " – " + (m.away || "");

        var status = document.createElement("div");
        status.className = "today-match-status";

        if (m.status === "LIVE") {
          status.textContent = (m.scoreHome + "-" + m.scoreAway) + " " + (m.minute || "");
          status.classList.add("live");
        } else {
          status.textContent = g.time;
        }

        row.appendChild(teams);
        row.appendChild(status);

        row.addEventListener("click", function () {
          window.emit("match-selected", m);
          window.emit("active-match:set", m);
        });

        wrap.appendChild(row);
      });

      root.appendChild(wrap);
    });
  }

  function renderFromPayload(payload) {
    var root = document.getElementById("today-list");
    if (!root) return;

    if (!selectedDayKey) selectedDayKey = dayKeyNowGR();

    var raw = Array.isArray(payload.matches) ? payload.matches : [];

    var list = raw
      .map(normalize)
      .filter(isVisibleToday)
      .filter(function (m) {
        return m.__dayKeyGR && m.__dayKeyGR === selectedDayKey;
      })
      .sort(function (a, b) {
        return (a.kickoff_ms || 0) - (b.kickoff_ms || 0);
      });

    if (!list.length) {
      renderEmpty(root);
      return;
    }

    renderGroups(root, groupMatches(list));
  }

  /* =========================
     EVENTS
     ========================= */

  on("today-matches:loaded", function (payload) {
    if (!payload || !Array.isArray(payload.matches)) return;
    lastPayload = payload;

    // ✅ CANONICAL LIVE → Right Live Panel
    var LIVE_STATUSES = ["LIVE", "HT", "ET", "PEN"];
    var live = payload.matches.filter(function (m) {
      var s = String(m.status || "").toUpperCase();
      return LIVE_STATUSES.includes(s);
    });

    window.emit("live:update", { matches: live });

    renderFromPayload(payload);
  });

  /* =========================
     AUTO REFRESH (45s)
     ========================= */

  setInterval(function () {
    if (!lastPayload) return;
    window.emit("today-matches:loaded", lastPayload);
  }, 45000);

})();
