/* ============================================================
   assets/js/ui/matches-panel.js
   FINAL LOCKED – Fixtures + Live (CLEAN)
============================================================ */
(function () {
  "use strict";

  const listEl = document.getElementById("matches-list");
  if (!listEl) return;

  let fixturesBase = "";
  let fixturesPath = "/fixtures";

  function ensureCfg() {
    const cfg = window.AIML_LIVE_CFG;
    if (!cfg) return false;
    fixturesBase = (cfg.fixturesBase || "").replace(/\/+$/, "");
    fixturesPath = String(cfg.fixturesPath || "/fixtures");
    return !!fixturesBase;
  }

  const state = {
    league: null,
    leagueSlug: "",
    matches: [],
    liveMap: Object.create(null)
  };

  const esc = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function ymdAthens(d) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Athens",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d).replace(/-/g, "");
  }

  function timeAthens(ms) {
    return new Intl.DateTimeFormat("el-GR", {
      timeZone: "Europe/Athens",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(ms));
  }

  /* ---------------- normalization ---------------- */

  function norm(m) {
    const kickoff =
      typeof m.kickoff_ms === "number"
        ? m.kickoff_ms
        : typeof m.kickoff === "number"
        ? m.kickoff * 1000
        : Date.parse(m.kickoff || m.date || 0) || 0;

    return {
      id: String(m.id || m.eventId || ""),
      title: m.title || `${m.home} - ${m.away}`,
      leagueName: m.leagueName || "",
      leagueSlug: String(m.leagueSlug || "").toLowerCase(),
      kickoff_ms: kickoff,

      // FT scores from fixtures
      homeScore:
  m.homeScore ??
  m.scoreHome ??
  (m.competitions?.[0]?.competitors?.[0]?.score != null
    ? Number(m.competitions[0].competitors[0].score)
    : null),

awayScore:
  m.awayScore ??
  m.scoreAway ??
  (m.competitions?.[0]?.competitors?.[1]?.score != null
    ? Number(m.competitions[0].competitors[1].score)
    : null),


      // live score (if any)
      score_text: m.score_text || ""
    };
  }

  function deriveLeagueSlug(p) {
    if (p?.leagueSlug) return p.leagueSlug.toLowerCase();
    if (p?.id && /^[A-Z]{2,4}\d+$/.test(p.id)) {
      return p.id.replace(/^([A-Z]+)(\d+)$/, (_, a, b) => `${a.toLowerCase()}.${b}`);
    }
    return "";
  }

  function isLive(m) {
    return !!state.liveMap[m.id];
  }

  /* ---------------- render ---------------- */

  function render() {
    if (!state.league) {
      listEl.innerHTML = `<div class="empty">Select a league.</div>`;
      return;
    }

    if (!state.matches.length) {
      listEl.innerHTML = `
        <div class="matches-hdr">
          <div class="matches-hdr-title">${esc(state.league.name)}</div>
          <div class="matches-hdr-sub">Next 7 days</div>
        </div>
        <div class="empty">No matches for this league.</div>
      `;
      return;
    }

    const now = Date.now();

    const rows = state.matches
      .slice()
      .sort((a, b) => {
        const al = isLive(a);
        const bl = isLive(b);
        if (al !== bl) return al ? -1 : 1; // LIVE first
        return a.kickoff_ms - b.kickoff_ms;
      })
      .map((m) => {
        const live = state.liveMap[m.id];
        const badge = live ? `<span class="live-badge">LIVE</span>` : "";

        let sub = "";

        if (live) {
          sub = `<span class="live-meta">${esc(live.minute)}’ • ${esc(
            live.score_text
          )}</span>`;
        } else if (m.kickoff_ms && m.kickoff_ms > now) {
          // not started yet → show nothing (time already shown)
          sub = "";
        } else {
          // finished (FT)
          if (m.homeScore != null && m.awayScore != null) {
            sub = `<span class="muted">FT • ${m.homeScore}–${m.awayScore}</span>`;
          } else {
            sub = `<span class="muted">FT</span>`;
          }
        }

        return `
          <div class="match-row"
               data-match-id="${esc(m.id)}"
               data-title="${esc(m.title)}">
            <div class="match-time">
              ${live ? "—" : timeAthens(m.kickoff_ms)}
            </div>
            <div class="match-main">
              <div class="match-title">${badge} ${esc(m.title)}</div>
              <div class="match-sub">${sub}</div>
            </div>
          </div>
        `;
      })
      .join("");

    listEl.innerHTML = `
      <div class="matches-hdr">
        <div class="matches-hdr-title">${esc(state.league.name)}</div>
        <div class="matches-hdr-sub">Next 7 days</div>
      </div>
      ${rows}
    `;
  }

  /* ---------------- data load ---------------- */

  async function loadLeague(p) {
    state.league = p;
    state.leagueSlug = deriveLeagueSlug(p);
    state.matches = [];
    state.liveMap = Object.create(null);

    if (!ensureCfg()) {
      listEl.innerHTML = `<div class="empty">Config not ready.</div>`;
      return;
    }

    listEl.innerHTML = `
      <div class="matches-hdr">
        <div class="matches-hdr-title">${esc(p.name || "")}</div>
        <div class="matches-hdr-sub">Loading…</div>
      </div>
    `;

    const url =
      fixturesBase +
      fixturesPath +
      `?league=${encodeURIComponent(state.leagueSlug)}&date=${ymdAthens(
        new Date()
      )}&days=7&includeFinished=1&scope=all`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      const all = Array.isArray(data.matches)
        ? data.matches.map(norm)
        : [];

      let filtered = all.filter(
        (m) => m.leagueSlug && m.leagueSlug === state.leagueSlug
      );

      if (!filtered.length && state.league?.name) {
        const lname = state.league.name.toLowerCase();
        filtered = all.filter((m) =>
          String(m.leagueName || "").toLowerCase().includes(lname)
        );
      }

      state.matches = filtered;
      render();
    } catch (e) {
      console.error("[matches-panel] load failed", e);
      listEl.innerHTML = `<div class="empty">Failed to load matches.</div>`;
    }
  }

  /* ---------------- live updates ---------------- */

  function onLiveUpdate(p) {
    if (!p || !Array.isArray(p.matches)) return;

    p.matches.forEach((m) => {
      if (!m.id) return;
      state.liveMap[String(m.id)] = {
        minute: m.minute ?? "",
        score_text: m.score_text ?? ""
      };
    });

    if (state.league) render();
  }

  /* ---------------- events ---------------- */

  if (typeof window.on === "function") {
    window.on("league-selected", loadLeague);
    window.on("live:update", onLiveUpdate);
  }

  window.addEventListener("league-selected", (e) => loadLeague(e.detail));
  window.addEventListener("live:update", (e) => onLiveUpdate(e.detail));

  render();
})();
