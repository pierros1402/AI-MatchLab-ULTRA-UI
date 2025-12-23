/* ============================================================
   assets/js/ui/matches-panel.js  (CLEAN v1.4.0)
   - List league fixtures from Worker (/fixtures) for next 7 days
   - Triggered by: emit("league-selected", {...})
   - Actions:
       • Row click -> emit("match-selected", match)
       • ★ -> SavedStore.toggle(match)
       • i -> DetailsModal.open(match) / emit("details-open", match)
============================================================ */
(function () {
  "use strict";

  const cfg = window.AIML_LIVE_CFG || {};
  const fixturesBase = (cfg.fixturesBase || cfg.liveUltraBase || "").replace(/\/+$/, "");
  const fixturesPath = String(cfg.fixturesPath || "/fixtures");

  const listEl = document.getElementById("matches-list");
  if (!listEl || !fixturesBase) return;

  const state = {
    league: null, // payload from navigation
    leagueSlug: "",
    matches: []
  };

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function ymdAthens(dt) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(dt)
        .reduce((a, p) => (a[p.type] = p.value, a), {});
      return `${parts.year}-${parts.month}-${parts.day}`;
    } catch (_) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  function athensTime(ms) {
    if (!ms || !Number.isFinite(ms)) return "--:--";
    try {
      return new Intl.DateTimeFormat("el-GR", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
    } catch (_) {
      const d = new Date(ms);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }

  function parseKickoffMs(m) {
    const raw = (typeof m?.kickoff_ms === "number" ? m.kickoff_ms : null) || m?.kickoff || m?.date || null;
    if (!raw) return 0;
    if (typeof raw === "number") return raw > 1e12 ? raw : raw * 1000;
    const t = Date.parse(String(raw));
    return Number.isFinite(t) ? t : 0;
  }

  function isLive(m) {
    const s = String(m?.status || "").toUpperCase();
    const st = String(m?.state || "").toLowerCase();
    return st === "in" || st === "live" || s.includes("LIVE") || s.includes("IN PROGRESS");
  }

  function liveClock(m) {
    const min = Number(m?.minute || 0);
    if (min > 0) return `${min}'`;
    const c = String(m?.clock || "").trim();
    if (c) return c;
    const d = String(m?.status_detail || "").trim();
    const mm = d.match(/(\d{1,3})/);
    return mm && mm[1] ? `${mm[1]}'` : "LIVE";
  }

  function norm(m) {
    const kickoff_ms = parseKickoffMs(m);
    return {
      id: String(m?.id || m?.eventId || m?.event_id || m?.matchId || `M_${kickoff_ms}_${Math.random().toString(16).slice(2)}`),
      title: String(m?.title || `${m?.home || ""} - ${m?.away || ""}` || ""),
      home: m?.home || "",
      away: m?.away || "",
      leagueName: String(m?.leagueName || m?.league || state.league?.name || "League"),
      leagueSlug: String(m?.leagueSlug || state.leagueSlug || ""),
      kickoff_ms,
      status: m?.status || "",
      state: m?.state || "",
      status_detail: m?.status_detail || "",
      clock: m?.clock || "",
      minute: Number(m?.minute || 0),
      score_text: String(m?.score_text || m?.score || ""),
      raw: m
    };
  }

  function deriveLeagueSlug(p) {
    const direct = String(p?.leagueSlug || p?.slug || p?.espn || p?.espn_code || "").trim();
    if (direct) return direct.toLowerCase();

    const id = String(p?.id || "").trim();
    if (/^[A-Z]{2,4}\d{1,3}$/.test(id)) {
      return id.replace(/^([A-Z]{2,4})(\d{1,3})$/, (_, a, b) => `${a.toLowerCase()}.${b}`);
    }
    if (/^[a-z]{2,4}\.\d{1,3}$/.test(id.toLowerCase())) return id.toLowerCase();

    // small pragmatic fallbacks by name
    const nm = String(p?.name || "").toLowerCase();
    const map = {
      "premier league": "eng.1",
      "la liga": "esp.1",
      "bundesliga": "ger.1",
      "serie a": "ita.1",
      "ligue 1": "fra.1",
      "super league": "gre.1",
      "superleague": "gre.1"
    };
    for (const k in map) {
      if (nm.includes(k)) return map[k];
    }
    return "";
  }

  function groupByDate(items) {
    const out = Object.create(null);
    items.forEach((m) => {
      const dt = new Date(m.kickoff_ms || 0);
      const key = ymdAthens(dt);
      (out[key] = out[key] || []).push(m);
    });
    return out;
  }

  function render() {
    if (!state.league) {
      listEl.innerHTML = `<div class="empty">Select a league.</div>`;
      return;
    }

    const head = `
      <div class="matches-hdr">
        <div class="matches-hdr-title">${esc(state.league.name || "League")}</div>
        <div class="matches-hdr-sub">Next 7 days • ESPN: ${esc(state.leagueSlug || "unknown")}</div>
      </div>
    `.trim();

    if (!state.matches.length) {
      listEl.innerHTML = head + `<div class="empty">No matches for this league.</div>`;
      return;
    }

    const by = groupByDate(state.matches);
    const dates = Object.keys(by).sort((a, b) => a.localeCompare(b));

    const body = dates.map((dk) => {
      const arr = by[dk].slice().sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));
      const rows = arr.map((m) => {
        const mid = esc(m.id);
        const t = athensTime(m.kickoff_ms);
        const sc = esc(m.score_text || "");
        const sub = [sc, isLive(m) ? esc(liveClock(m)) : ""].filter(Boolean).join(" • ");
        return `
          <div class="match-row" data-mid="${mid}">
            <div class="match-time">${t}</div>
            <div class="match-main">
              <div class="match-title">${esc(m.title || "")}</div>
              <div class="match-sub">${sub}</div>
            </div>
            <div class="match-actions">
              <button class="btn-slim" data-act="save" data-mid="${mid}" title="Save">★</button>
              <button class="btn-slim" data-act="info" data-mid="${mid}" title="Details">i</button>
            </div>
          </div>
        `.trim();
      }).join("");

      return `
        <div class="matches-day">
          <div class="matches-day-h">${esc(dk)}</div>
          <div class="matches-day-b">${rows}</div>
        </div>
      `.trim();
    }).join("");

    listEl.innerHTML = head + body;
  }

  function openDetails(match) {
    if (window.DetailsModal && typeof window.DetailsModal.open === "function") {
      window.DetailsModal.open(match);
      return;
    }
    if (typeof window.emit === "function") window.emit("details-open", match);
  }

  async function loadLeague(p) {
    state.league = p || null;
    state.leagueSlug = deriveLeagueSlug(p);
    state.matches = [];

    if (!state.leagueSlug) {
      listEl.innerHTML = `
        <div class="empty">
          Cannot map this league to ESPN code.<br/>
          League id: <b>${esc(p?.id || "")}</b> • name: <b>${esc(p?.name || "")}</b>
        </div>
      `.trim();
      return;
    }

    listEl.innerHTML = `<div class="empty">Loading…</div>`;

    const dateFrom = ymdAthens(new Date()).replace(/-/g, "");
    const url = `${fixturesBase}${fixturesPath}?league=${encodeURIComponent(state.leagueSlug)}&date=${encodeURIComponent(dateFrom)}&days=7&includeFinished=1&scope=all`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      const raw = Array.isArray(data?.matches) ? data.matches : [];
      state.matches = raw.map(norm).filter((x) => x && x.id);

      render();
    } catch (_) {
      listEl.innerHTML = `<div class="empty">Failed to load matches.</div>`;
      state.matches = [];
    }
  }

  function onClick(e) {
    const btn = e.target && e.target.closest ? e.target.closest("button[data-act]") : null;
    if (btn) {
      const act = btn.getAttribute("data-act");
      const mid = btn.getAttribute("data-mid");
      const m = state.matches.find((x) => String(x.id) === String(mid));
      if (!m) return;

      if (act === "save") {
        window.SavedStore?.toggle?.(m);
        render();
        return;
      }
      if (act === "info") {
        openDetails(m);
        return;
      }
      return;
    }

    const row = e.target && e.target.closest ? e.target.closest(".match-row") : null;
    if (!row) return;
    const mid = row.getAttribute("data-mid");
    const m = state.matches.find((x) => String(x.id) === String(mid));
    if (!m) return;
    if (typeof window.emit === "function") window.emit("match-selected", m);
  }

  listEl.addEventListener("click", onClick);

  if (typeof window.on === "function") {
    window.on("league-selected", loadLeague);
    window.on("saved-store:updated", () => render());
  } else {
    // fallback: try global
    window.addEventListener("league-selected", (e) => loadLeague(e.detail));
  }

  render();
})();
