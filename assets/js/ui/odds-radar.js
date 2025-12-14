/* ============================================================
   AI MatchLab ULTRA — AI RADAR (Right Panel)
   - ONLY 1X2 movements (1 / X / 2)
   - Threshold: |Δ| >= 0.20
   - One entry per match: shows ONLY the biggest deviation across all sources/books
   - Optional toggle: ALL vs SAVED filter (does not affect aggregation logic)
   Requires global event bus: on()/emit() from app.js
   Listens: "odds-snapshot" and "odds-demo:update"
============================================================ */

(function () {
  "use strict";

  const RADAR_EL_ID = "panel-radar";
  const THRESHOLD = 0.20;
  const MAX_MATCHES = 80;

  const SOURCE_LABEL = {
    GREEK: "Greek",
    EURO: "European",
    ASIAN: "Asian",
    BETFAIR: "Betfair"
  };

  const state = {
    mode: "ALL", // ALL | SAVED
    savedIds: new Set(),
    // baseline[source][matchId][bookmakerKey][sel] = openingNumber
    baseline: Object.create(null),
    // best per match: bestByMatch[matchId] = item
    bestByMatch: Object.create(null),
    // current match (helps demo feeds that don’t include matchId)
    currentMatchId: null
  };

  function $(id) { return document.getElementById(id); }
  const esc = s => String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const norm = s => String(s || "").trim().toLowerCase();
  const isObj = x => x && typeof x === "object" && !Array.isArray(x);
  const num = x => (Number.isFinite(+x) ? +x : null);
  const fmt = x => (num(x) == null ? "—" : (Math.round(+x * 100) / 100).toFixed(2));

  function isHDAKey(name) {
    const m = norm(name);
    return (m === "1x2" || m === "hda" || m === "h2h" || m === "match odds" || m === "full time result" || m === "ft result");
  }
  function pick1X2(markets) {
    if (!Array.isArray(markets) || !markets.length) return "1X2";
    if (markets.includes("1X2")) return "1X2";
    const h = markets.find(isHDAKey);
    return h || markets[0] || "1X2";
  }
  function selLabel(sel) { return (sel === "1" || sel === "X" || sel === "2") ? sel : String(sel); }

  // -----------------------------
  // Saved Store (optional filter)
  // -----------------------------
  function refreshSavedIds() {
    let arr = [];
    if (window.SavedStore && typeof window.SavedStore.list === "function") {
      try { arr = window.SavedStore.list() || []; } catch (_) { arr = []; }
    } else if (Array.isArray(window.__savedMatches)) {
      arr = window.__savedMatches;
    }
    state.savedIds = new Set(arr.map(x => (x && (x.id || x.matchId)) ? (x.id || x.matchId) : x).filter(Boolean));
  }

  // -----------------------------
  // Normalize odds payloads -> snaps
  // snap: { source, markets[], rows[{bookmaker, marketMap, matchId?}], matchId? }
  // -----------------------------
  function normalizeToSnaps(payload) {
    if (!payload) return [];

    // A) per-source snapshot
    if (payload.source && Array.isArray(payload.rows)) {
      return [normalizeSourceSnap(payload.source, payload)];
    }

    // B) aggregated providers
    if (payload.providers && isObj(payload.providers)) {
      const out = [];
      const map = { greek: "GREEK", eu: "EURO", asian: "ASIAN", betfair: "BETFAIR" };
      Object.keys(map).forEach((k) => {
        const src = map[k];
        const prov = payload.providers[k];
        if (!prov || !prov.markets || !isObj(prov.markets)) return;
        out.push(normalizeSourceSnap(src, {
          source: src,
          markets: Object.keys(prov.markets),
          rows: [{ bookmaker: "Demo", marketMap: prov.markets, matchId: payload.matchId || payload.id || null }],
          matchId: payload.matchId || payload.id || null
        }));
      });
      return out;
    }

    return [];
  }

  function normalizeSourceSnap(source, snap) {
    const markets = [];
    if (Array.isArray(snap.markets) && snap.markets.length) snap.markets.forEach(m => m && markets.push(String(m)));

    if (!markets.length && Array.isArray(snap.rows)) {
      const seen = new Set();
      snap.rows.forEach(r => {
        if (r && r.marketMap && isObj(r.marketMap)) {
          Object.keys(r.marketMap).forEach(m => { if (!seen.has(m)) { seen.add(m); markets.push(m); } });
        }
      });
    }
    if (!markets.length) markets.push("1X2");

    const snapMatchId = snap.matchId || snap.id || null;

    const rows = (snap.rows || []).map((r) => {
      // expected format
      if (r && r.marketMap && isObj(r.marketMap)) {
        return { bookmaker: r.bookmaker || "Unknown", marketMap: r.marketMap, matchId: r.matchId || r.id || snapMatchId || null };
      }

      // legacy open/cur
      if (r && r.open && r.cur) {
        const mk = pick1X2(markets);
        const mm = {};
        mm[mk] = {
          "1": { opening: r.open.H ?? r.open["1"], current: r.cur.H ?? r.cur["1"] },
          "X": { opening: r.open.D ?? r.open.X, current: r.cur.D ?? r.cur.X },
          "2": { opening: r.open.A ?? r.open["2"], current: r.cur.A ?? r.cur["2"] }
        };
        return { bookmaker: r.bookmaker || "Unknown", marketMap: mm, matchId: r.matchId || r.id || snapMatchId || null };
      }

      return { bookmaker: r?.bookmaker || "Unknown", marketMap: Object.create(null), matchId: r?.matchId || r?.id || snapMatchId || null };
    });

    return { source, markets, rows, matchId: snapMatchId };
  }

  // -----------------------------
  // Baseline per match+source+book+sel
  // -----------------------------
  function getBaseline(source, matchId, bookmaker, sel, opening, current) {
    if (!state.baseline[source]) state.baseline[source] = Object.create(null);
    if (!state.baseline[source][matchId]) state.baseline[source][matchId] = Object.create(null);

    const bmKey = norm(bookmaker || "unknown");
    if (!state.baseline[source][matchId][bmKey]) state.baseline[source][matchId][bmKey] = Object.create(null);

    if (state.baseline[source][matchId][bmKey][sel] == null) {
      state.baseline[source][matchId][bmKey][sel] = (opening != null ? opening : current);
    }
    return state.baseline[source][matchId][bmKey][sel];
  }

  // -----------------------------
  // Core: keep only best mover per match
  // -----------------------------
  function considerMove(item) {
    const id = item.matchId;
    if (!id) return;

    const prev = state.bestByMatch[id];
    if (!prev || item.abs > prev.abs) {
      state.bestByMatch[id] = item;
    }
  }

  function acceptPayload(payload) {
    const snaps = normalizeToSnaps(payload);
    if (!snaps.length) return;

    refreshSavedIds();

    snaps.forEach((snap) => {
      const source = snap.source;
      const mk = pick1X2(snap.markets);

      (snap.rows || []).forEach((row) => {
        const bookmaker = row.bookmaker || "Unknown";
        const marketData = row.marketMap ? row.marketMap[mk] : null;
        if (!marketData || !isObj(marketData)) return;

        // Determine matchId (for demo feeds, fall back to currentMatchId)
        const matchId = row.matchId || snap.matchId || payload.matchId || payload.id || state.currentMatchId || null;
        if (!matchId) return;

        // Saved filter (only if mode=SAVED)
        if (state.mode === "SAVED" && !state.savedIds.has(matchId)) return;

        ["1", "X", "2"].forEach((sel) => {
          const cell = marketData[sel];
          if (!cell) return;

          const opening = num(cell.opening ?? cell.open);
          const current = num(cell.current ?? cell.cur ?? cell.value ?? cell);
          if (current == null) return;

          const base = getBaseline(source, matchId, bookmaker, sel, opening, current);
          const delta = current - base;
          const abs = Math.abs(delta);
          if (abs < THRESHOLD) return;

          considerMove({
            matchId,
            source,
            bookmaker,
            sel,
            opening: base,
            current,
            delta,
            abs,
            ts: Date.now()
          });
        });
      });
    });

    // Keep bestByMatch bounded (simple trim by abs)
    const all = Object.values(state.bestByMatch).sort((a, b) => b.abs - a.abs);
    const keep = all.slice(0, MAX_MATCHES);
    const next = Object.create(null);
    keep.forEach(x => { next[x.matchId] = x; });
    state.bestByMatch = next;

    render();
  }

  // -----------------------------
  // UI
  // -----------------------------
  function setMode(mode) {
    state.mode = mode;
    render();
  }

  function render() {
    const el = $(RADAR_EL_ID);
    if (!el) return;

    refreshSavedIds();

    const title = `
      <div class="radar-title" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div>AI RADAR · 1X2 <span style="opacity:.75;font-weight:600;">(Δ ≥ ${THRESHOLD.toFixed(2)})</span></div>
        <div style="display:inline-flex;gap:6px;">
          <button class="rt-btn ${state.mode==="ALL" ? "is-active":""}" data-mode="ALL">All</button>
          <button class="rt-btn ${state.mode==="SAVED" ? "is-active":""}" data-mode="SAVED">Saved</button>
        </div>
      </div>
    `;

    if (state.mode === "SAVED" && !state.savedIds.size) {
      el.innerHTML = title + `<div style="opacity:.75;">No saved matches yet.</div>`;
      wireToggle(el);
      return;
    }

    const items = Object.values(state.bestByMatch).sort((a, b) => b.abs - a.abs);

    if (!items.length) {
      el.innerHTML = title + `<div style="opacity:.75;">No significant 1X2 movements yet.</div>`;
      wireToggle(el);
      return;
    }

    const maxAbs = items[0]?.abs || THRESHOLD;

    el.innerHTML = title + items.map((it) => {
      const rise = it.delta > 0;
      const cls = rise ? "radar-item rise" : "radar-item drop";
      const sign = rise ? "+" : "";
      const pct = Math.min(100, Math.round((it.abs / maxAbs) * 100));

      return `
        <div class="${cls}">
          <div class="radar-header">
            <div>${esc(it.matchId)} · ${esc(SOURCE_LABEL[it.source] || it.source)} · ${esc(it.bookmaker)} · <b>${esc(selLabel(it.sel))}</b></div>
            <div>${sign}${fmt(it.delta)}</div>
          </div>
          <div class="radar-oldnew">
            ${fmt(it.opening)} → <b>${fmt(it.current)}</b>
          </div>
          <div class="radar-bar">
            <div class="radar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }).join("");

    wireToggle(el);
  }

  function wireToggle(root) {
    const btns = root.querySelectorAll("button[data-mode]");
    btns.forEach((b) => {
      // minimal inline styling (no extra CSS required)
      b.style.fontSize = "12px";
      b.style.padding = "5px 8px";
      b.style.borderRadius = "10px";
      b.style.border = "1px solid rgba(255,255,255,.18)";
      b.style.background = "rgba(0,0,0,.15)";
      b.style.cursor = "pointer";
      b.style.whiteSpace = "nowrap";
      if (b.classList.contains("is-active")) {
        b.style.fontWeight = "900";
        b.style.borderColor = "rgba(255,255,255,.35)";
        b.style.background = "rgba(255,255,255,.08)";
      }
      b.onclick = () => setMode(b.getAttribute("data-mode"));
    });
  }

  // -----------------------------
  // Init
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    const el = $(RADAR_EL_ID);
    if (el) {
      // compact height so Top Picks stays visible
      el.style.maxHeight = "240px";
      el.style.overflowY = "auto";
    }

    if (typeof window.on === "function") {
      window.on("match-selected", (m) => {
        // capture current match for demo feeds
        state.currentMatchId = (m && (m.matchId || m.id)) ? (m.matchId || m.id) : state.currentMatchId;
        refreshSavedIds();
        render();
      });

      window.on("saved-store:updated", () => { refreshSavedIds(); render(); });
      window.on("odds-snapshot", acceptPayload);
      window.on("odds-demo:update", acceptPayload);
    }

    render();
  });

})();
