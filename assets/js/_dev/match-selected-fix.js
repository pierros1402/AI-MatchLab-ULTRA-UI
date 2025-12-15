/* =========================================================
   match-selected-fix.js
   - Normalize kickoff time consistently
   - Update active match bar
   - Emit match-selected-normalized for downstream modules
========================================================= */

(function () {
  "use strict";
  if (window.__AIML_MATCH_SELECTED_FIX__) return;
  window.__AIML_MATCH_SELECTED_FIX__ = true;

  const $ = (id) => document.getElementById(id);

  function normalizeDisplayTime(match) {
    if (!match) return "";

    // Prefer already “display” time (usually from list rendering)
    const direct = match.displayTime || match.time || match.kickoffLocal || match.kickoffText || match.kickoff;
    if (typeof direct === "string" && /^\d{1,2}:\d{2}$/.test(direct.trim())) {
      return direct.trim();
    }

    // ISO-like values
    const iso = match.kickoffISO || match.kickoffUtc || match.kickoffUTC || match.datetime || match.dateTime;
    if (typeof iso === "string" && iso.length >= 10) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }
    }

    // Numeric timestamp
    const ts = match.kickoffTs || match.kickoffTimestamp || match.ts;
    if (typeof ts === "number" && isFinite(ts) && ts > 0) {
      const d = new Date(ts < 1e12 ? ts * 1000 : ts);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }
    }

    return "";
  }

  function onSelected(raw) {
    if (!raw || !raw.id) return;

    // Safe shallow copy
    const match = { ...raw };

    const t = normalizeDisplayTime(match);
    if (t) {
      match.displayTime = t;
      match.kickoff = t;
      match.time = match.time || t;
    }

    // Active match bar
    const ambTitle = $("amb-title");
    const ambSub = $("amb-sub");
    if (ambTitle && ambSub) {
      const home = match.home || match.homeName || "Home";
      const away = match.away || match.awayName || "Away";
      ambTitle.textContent = `${home} vs ${away}`;

      const league = match.leagueName || match.league || "";
      const parts = [];
      if (league) parts.push(league);
      if (match.displayTime) parts.push(match.displayTime);
      ambSub.textContent = parts.length ? parts.join(" • ") : "Selected match";
    }

    // Emit normalized event so Details modal (and others) use same time
    if (typeof window.emit === "function") {
      window.emit("match-selected-normalized", match);
    } else {
      document.dispatchEvent(new CustomEvent("match-selected-normalized", { detail: match }));
    }
  }

  function attach() {
    if (typeof window.on === "function") {
      window.on("match-selected", onSelected);
      return true;
    }
    // Fallback DOM event
    document.addEventListener("match-selected", (e) => onSelected(e?.detail));
    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
