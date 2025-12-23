/* ============================================================
   assets/js/ui/matches-panel.js (FULL LINKED v3.4.0)
   - ESPN/fixtures driven (no demo)
   - Listens:
       league-selected   -> render matches for that league
       today-matches:loaded -> cache fixtures for filtering
   - Actions:
       row click -> emit("match-selected", match)
       i -> DetailsModal.open(match) / emit("details-open", match)
       ★ -> SavedStore.toggle(match)
============================================================ */
(function () {
  "use strict";

  const VER = "3.4.0";
  if (window.__AIML_MATCHES_PANEL_VER__ === VER) return;
  window.__AIML_MATCHES_PANEL_VER__ = VER;

  const panel = document.getElementById("panel-matches");
  const listEl = document.getElementById("matches-list");
  if (!panel || !listEl) return;

  const cfg = () => window.AIML_LIVE_CFG || {};
  const base = () => String(cfg().fixturesBase || cfg().liveUltraBase || "").replace(/\/+$/, "");
  const fixturesPath = () => String(cfg().fixturesPath || "/fixtures");

  const on = (n, f) => (window.on ? window.on(n, f) : null);
  const emit = (n, p) => (window.emit ? window.emit(n, p) : null);

  const esc = (s) =>
    String(s == null ? "" : s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function parseKickoffMs(m) {
    const raw =
      m?.kickoff ||
      m?.utcDate ||
      m?.startDate ||
      m?.startTime ||
      m?.eventDate ||
      m?.date ||
      m?.competitions?.[0]?.date ||
      null;
    if (!raw) return 0;
    if (typeof raw === "number") return raw;
    const t = Date.parse(String(raw));
    return Number.isNaN(t) ? 0 : t;
  }

  function athensTime(ms) {
    const t = Number(ms || 0);
    if (!t) return "--:--";
    try {
      return new Date(t).toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Athens",
        hour12: false
      });
    } catch (_) {
      return "--:--";
    }
  }

  function normalizeMatch(m) {
    const kickoff_ms = m?.kickoff_ms || parseKickoffMs(m);
    const home = m?.home ?? m?.homeName ?? m?.home_team ?? m?.teams?.home ?? "";
    const away = m?.away ?? m?.awayName ?? m?.away_team ?? m?.teams?.away ?? "";
    const leagueSlug = m?.leagueSlug ?? m?.league ?? m?.league_code ?? "";
    const leagueId = m?.leagueId ?? m?.lid ?? "";
    const leagueName = m?.leagueName ?? m?.competition ?? m?.league_name ?? "";
    const id = m?.id ?? m?.eventId ?? m?.event ?? "";
    const status = m?.status ?? m?.state ?? "";
    const score = m?.score_text ?? m?.score ?? "";
    return { ...m, id, home, away, leagueSlug, leagueId, leagueName, status, score, kickoff_ms };
  }

  const state = {
    fixtures: [], // latest fixtures from Today/fixtures
    league: null  // {id,name,leagueSlug,leagueId}
  };

  function openDetails(m) {
    if (!m) return;
    if (window.DetailsModal && typeof window.DetailsModal.open === "function") {
      window.DetailsModal.open(m);
      return;
    }
    emit("details-open", m);
  }

  function toggleSave(m) {
    const st = window.SavedStore;
    if (st && typeof st.toggle === "function") st.toggle(m);
  }

  function sameLeague(m, league) {
    if (!m || !league) return false;

    const mid = String(m.leagueId || "").trim();
    const mslug = String(m.leagueSlug || "").trim();
    const mname = String(m.leagueName || "").trim();

    const lid = String(league.leagueId || league.id || "").trim();
    const lslug = String(league.leagueSlug || "").trim();
    const lname = String(league.name || "").trim();

    // Prefer strong keys (leagueId), then slug, then name.
    if (lid && mid && lid === mid) return true;
    if (lslug && mslug && lslug === mslug) return true;
    if (lname && mname && lname.toLowerCase() === mname.toLowerCase()) return true;

    // last resort: derived id match (ENG1 etc.)
    const derived = String(mslug || mname || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (league.id && derived && String(league.id) === derived) return true;

    return false;
  }

  function render() {
    const league = state.league;
    if (!league) {
      listEl.innerHTML = `<div class="muted" style="padding:10px;">Select a league to view matches.</div>`;
      return;
    }

    const arr = state.fixtures
      .map(normalizeMatch)
      .filter((m) => sameLeague(m, league))
      .sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));

    if (!arr.length) {
      listEl.innerHTML = `<div class="muted" style="padding:10px;">No matches for ${esc(league.name || league.id || "league")}.</div>`;
      return;
    }

    listEl.innerHTML = arr
      .map((m) => {
        const mid = esc(m.id);
        const t = athensTime(m.kickoff_ms);
        const title = `${esc(m.home)} - ${esc(m.away)}`;
        const score = esc(m.score || "");
        const st = esc(m.status || "");
        return `
          <div class="match-row" data-mid="${mid}" style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
              <div style="font-weight:800;">${t}</div>
              <div style="opacity:.8;font-size:12px;white-space:nowrap;">${st}</div>
            </div>
            <div style="opacity:.96;margin-top:2px;">${title}</div>
            ${score ? `<div style="opacity:.85;margin-top:2px;">${score}</div>` : ``}
            <div style="margin-top:8px;display:flex;gap:8px;">
              <button class="btn-slim" data-act="save" data-mid="${mid}" title="Save">★</button>
              <button class="btn-slim" data-act="info" data-mid="${mid}" title="Details">i</button>
            </div>
          </div>`;
      })
      .join("");
  }

  async function fetchFixturesToday(dateKey) {
    const b = base();
    if (!b) return [];

    const d = dateKey || new Date().toISOString().slice(0, 10);
    const url = `${b}${fixturesPath()}?date=${encodeURIComponent(d)}&scope=all&v=${Date.now()}`;
    try {
      const res = await fetch(url, { method: "GET", credentials: "omit" });
      const data = await res.json().catch(() => null);
      const matches = Array.isArray(data?.matches) ? data.matches.map(normalizeMatch) : [];
      return matches;
    } catch (_) {
      return [];
    }
  }

  // Click handlers
  panel.addEventListener("click", (e) => {
    const t = e.target;

    const actBtn = t && t.closest ? t.closest("[data-act]") : null;
    const act = actBtn ? String(actBtn.getAttribute("data-act") || "") : "";
    const mid = actBtn ? String(actBtn.getAttribute("data-mid") || "") : "";

    if ((act === "save" || act === "info") && mid) {
      e.preventDefault();
      e.stopPropagation();
      const m = state.fixtures.find((x) => String(x.id) === String(mid));
      if (m) {
        if (act === "save") toggleSave(m);
        if (act === "info") openDetails(m);
      }
      return;
    }

    const row = t && t.closest ? t.closest(".match-row") : null;
    if (row) {
      const id = row.getAttribute("data-mid");
      const m = state.fixtures.find((x) => String(x.id) === String(id));
      if (m) emit("match-selected", m);
      return;
    }
  });

  // Event wiring
  on("today-matches:loaded", (p) => {
    const arr = Array.isArray(p?.matches) ? p.matches : Array.isArray(p) ? p : [];
    if (arr.length) state.fixtures = arr.map(normalizeMatch);
    render();
  });

  on("league-selected", async (p) => {
    // league-selected payload typically: {id,name,leagueSlug,leagueId}
    if (!p) return;
    state.league = {
      id: p.id || p.leagueId || p.leagueSlug || "",
      name: p.name || p.leagueName || p.leagueSlug || p.id || "League",
      leagueSlug: p.leagueSlug || "",
      leagueId: p.leagueId || p.id || ""
    };

    // If we don't have fixtures yet, fetch once (today)
    if (!state.fixtures || !state.fixtures.length) {
      listEl.innerHTML = `<div class="muted" style="padding:10px;">Loading…</div>`;
      state.fixtures = await fetchFixturesToday();
    }
    render();
  });

  // Initial placeholder
  render();
})();