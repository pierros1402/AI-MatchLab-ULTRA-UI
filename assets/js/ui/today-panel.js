(function () {
  if (!window.on || !window.emit) return;

  var TZ = "Europe/Athens";
  var lastPayload = null;
  var selectedDayKey = null;
  var availableDates = [];

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
    } catch {
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
    } catch {
      var d = new Date(ms);
      return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    }
  }

  function labelForDateKey(dateKey) {
    var today = dayKeyNowGR();
    if (dateKey === today) return "Σήμερα";
    var d = new Date(dateKey + "T00:00:00");
    var wd = new Intl.DateTimeFormat("el-GR", { weekday: "short", timeZone: TZ }).format(d);
    return wd + " " + dateKey.split("-").reverse().slice(0, 2).join("/");
  }

  /* =========================
     NORMALIZATION
     ========================= */

  function normalize(match) {
    var kickoffMs = match.kickoff_ms || (match.kickoff ? Date.parse(match.kickoff) : 0);
    return Object.assign({}, match, {
      kickoff_ms: kickoffMs,
      leagueName: match.leagueName || match.leagueSlug || "—",
      leagueSlug: match.leagueSlug || "",
      __dayKeyGR: kickoffMs ? dayKeyFromMsGR(kickoffMs) : ""
    });
  }

  function isVisible(m) {
    return m.status === "LIVE" || m.status === "PRE";
  }

  /* =========================
     ACCORDION HEADER (DATE DROPDOWN)
     ========================= */

  function ensureAccordionHeader() {
    var header = document.querySelector('.accordion-header[data-target="panel-today"]');
    if (!header) return;

    if (header.querySelector(".today-date-select")) return;

    header.innerHTML = "";

    var title = document.createElement("span");
    title.className = "today-title";
    title.textContent = "Today";

    var select = document.createElement("select");
    select.className = "today-date-select";

    select.addEventListener("change", function () {
      selectedDayKey = this.value;
      emit("today-date:changed", { dateKey: selectedDayKey });
      loadDate(selectedDayKey);
    });

    header.appendChild(title);
    header.appendChild(select);
  }

  function updateHeaderOptions() {
    var select = document.querySelector('.accordion-header[data-target="panel-today"] .today-date-select');
    if (!select) return;

    select.innerHTML = "";
    availableDates.forEach(function (dk) {
      var opt = document.createElement("option");
      opt.value = dk;
      opt.textContent = labelForDateKey(dk);
      if (dk === selectedDayKey) opt.selected = true;
      select.appendChild(opt);
    });
  }

  /* =========================
     GROUPING / RENDER
     ========================= */

  function groupMatches(list) {
    var groups = [];
    var map = {};

    list.forEach(function (m) {
      var t = m.kickoff_ms ? timeHHMM_GR(m.kickoff_ms) : "--:--";
      var key = (m.leagueSlug || m.leagueName) + "_" + t;
      if (!map[key]) {
        map[key] = { leagueName: m.leagueName, time: t, items: [] };
        groups.push(map[key]);
      }
      map[key].items.push(m);
    });

    return groups;
  }

  function renderFromPayload(payload) {
    var root = document.getElementById("today-list");
    if (!root) return;

    if (!selectedDayKey) selectedDayKey = dayKeyNowGR();

    var norm = payload.matches.map(normalize).filter(isVisible);

    var dateSet = {};
    norm.forEach(m => dateSet[m.__dayKeyGR] = true);
    availableDates = Object.keys(dateSet).sort();

    if (!availableDates.includes(selectedDayKey)) {
      selectedDayKey = availableDates[0];
    }

    ensureAccordionHeader();
    updateHeaderOptions();

    var list = norm.filter(m => m.__dayKeyGR === selectedDayKey);
    root.innerHTML = "";

    if (!list.length) {
      root.textContent = "Δεν υπάρχουν αγώνες για αυτή την ημέρα.";
      return;
    }

    groupMatches(list).forEach(function (g) {
      var block = document.createElement("div");
      block.className = "today-group";
      block.innerHTML = `<div class="today-group-header">${g.time} · ${g.leagueName}</div>`;
      g.items.forEach(function (m) {
        var row = document.createElement("div");
        row.className = "today-match-row";
        row.textContent = `${m.home} – ${m.away}`;
        row.onclick = () => emit("match-selected", m);
        block.appendChild(row);
      });
      root.appendChild(block);
    });
  }

  /* =========================
     DATA LOAD
     ========================= */

  function loadDate(dateKey) {
    var url = window.AIML_LIVE_CFG.fixturesBase + "/fixtures?date=" + dateKey;
    fetch(url).then(r => r.json()).then(function (data) {
      if (!data || !Array.isArray(data.matches)) return;
      lastPayload = data;
      renderFromPayload(data);
    });
  }

  /* =========================
     EVENTS
     ========================= */

  on("today-matches:loaded", function (payload) {
    lastPayload = payload;
    renderFromPayload(payload);
    emit("today-date:changed", { dateKey: selectedDayKey || dayKeyNowGR() });
  });

})();
