/* =========================================================
   today-tabs.js — PHASE 2
   Tabs: -7 … -1 | Today | +1 … +7
   - UI wrapper only
   - Does NOT change Today core logic
   ========================================================= */

(function () {
  const PANEL_ID = "panel-today";
  const BAR_CLASS = "today-tabs";
  const EVENT = "today:day-selected";

  function qs(id) {
    return document.getElementById(id);
  }

  function fmt(d) {
    return d.toISOString().slice(0, 10);
  }

  function label(offset) {
    if (offset === 0) return "Today";
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit" });
  }

  function buildTabs() {
    const panel = qs(PANEL_ID);
    if (!panel) return;

    // avoid duplicate insert
    if (panel.querySelector("." + BAR_CLASS)) return;

    const bar = document.createElement("div");
    bar.className = BAR_CLASS;

    for (let i = -7; i <= 7; i++) {
      const btn = document.createElement("button");
      btn.className = "today-tab";
      btn.dataset.offset = i;
      btn.textContent = label(i);
      if (i === 0) btn.classList.add("active");

      btn.addEventListener("click", () => {
        bar.querySelectorAll(".today-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const d = new Date();
        d.setDate(d.getDate() + i);

        if (window.emit) {
          window.emit(EVENT, {
            offset: i,
            date: fmt(d),
          });
        }
      });

      bar.appendChild(btn);
    }

    // insert before list
    const list = panel.querySelector(".list");
    panel.insertBefore(bar, list);
  }

  document.addEventListener("DOMContentLoaded", buildTabs);
})();
