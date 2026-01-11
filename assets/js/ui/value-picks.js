(function () {
  const listEl = document.getElementById("value-picks-list");
  const cardEl = document.getElementById("card-value-picks");

  if (!listEl || !cardEl) return;

  // =========================
  // FEATURE FLAGS
  // =========================
  const ALLOW_CUPS = true; // ← TEST MODE (σε production: false)

  // =========================
  // MARKETS (UI ONLY)
  // =========================
  const MARKET_OPTIONS = [
    { key: "BTTS", label: "BTTS" },
    { key: "OVER_1_5", label: "Over 1.5" },
    { key: "OVER_2_5", label: "Over 2.5" },
    { key: "OVER_3_5", label: "Over 3.5" },
    { key: "1X2", label: "1X2" },
    { key: "DC", label: "Double Chance" }
  ];

  let activeMarket = "BTTS";
  let localItems = [];

  // =========================
  // MARKET NORMALIZATION
  // =========================
  function normalizeMarket(m) {
    if (!m) return "";
    const s = String(m).toLowerCase();
    if (s.includes("btts")) return "BTTS";
    if (s.includes("over 1.5") || s.includes("o1.5")) return "OVER_1_5";
    if (s.includes("over 2.5") || s.includes("o2.5")) return "OVER_2_5";
    if (s.includes("over 3.5") || s.includes("o3.5")) return "OVER_3_5";
    if (s.includes("1x2")) return "1X2";
    if (s.includes("double")) return "DC";
    return "";
  }

  // =========================
  // CUP DETECTION
  // =========================
  function isCupLeague(league) {
    if (!league) return false;
    const s = String(league).toLowerCase();
    return (
      s.includes("cup") ||
      s.includes("κύπελλο") ||
      s.includes("coppa") ||
      s.includes("copa") ||
      s.includes("pokal") ||
      s.includes("trophy")
    );
  }

  // =========================
  // CONFIDENCE LABEL
  // =========================
  function confidence(score) {
    if (score >= 0.65) return { label: "High", cls: "conf-high" };
    if (score >= 0.60) return { label: "Medium", cls: "conf-med" };
    return { label: "Low", cls: "conf-low" };
  }

  // =========================
  // SORT
  // =========================
  function sortItems(items) {
    return items.slice().sort((a, b) => {
      const sa = Number(a.score) || 0;
      const sb = Number(b.score) || 0;
      if (sb !== sa) return sb - sa;
      const ta = Date.parse(a.kickoff) || 9e15;
      const tb = Date.parse(b.kickoff) || 9e15;
      return ta - tb;
    });
  }

  // =========================
  // HEADER (2 LINES)
  // =========================
  function ensureTwoLineHeader() {
    const header = cardEl.querySelector(".right-card-header");
    if (!header) return;

    if (header.dataset.valueHeader === "2lines") {
      const sel = header.querySelector("#value-market-select");
      if (sel) sel.value = activeMarket;
      return;
    }

    const titleEl = header.querySelector(".panel-title");
    const metaEl = header.querySelector(".right-meta");
    const titleText = titleEl ? titleEl.textContent : "AI Value Picks";

    header.innerHTML = "";
    header.dataset.valueHeader = "2lines";
    header.classList.add("right-header-2lines");

    const line1 = document.createElement("div");
    line1.className = "rheader-line1";
    line1.style.display = "flex";
    line1.style.alignItems = "center";
    line1.style.justifyContent = "space-between";
    line1.style.gap = "10px";

    const t = document.createElement("div");
    t.className = "panel-title";
    t.textContent = titleText;

    const actions = document.createElement("div");
    actions.innerHTML = `
      <select id="value-market-select" class="right-select"
        style="width:auto; min-width:110px; max-width:140px;">
        ${MARKET_OPTIONS.map(m => `<option value="${m.key}">${m.label}</option>`).join("")}
      </select>
    `;

    line1.appendChild(t);
    line1.appendChild(actions);

    const line2 = document.createElement("div");
    line2.className = "rheader-line2";
    if (metaEl) line2.appendChild(metaEl);

    header.appendChild(line1);
    header.appendChild(line2);

    const sel = header.querySelector("#value-market-select");
    if (sel) {
      activeMarket = sel.value || activeMarket;
      sel.value = activeMarket;
      sel.onchange = e => {
        activeMarket = e.target.value;
        render();
      };
    }
  }

  // =========================
  // DEDUP (1 ROW / MATCH)
  // =========================
  function dedupByMatch(items) {
    const map = new Map();
    for (const i of items) {
      const key = `${i.home}|${i.away}`;
      const prev = map.get(key);
      if (!prev || (Number(i.score) || 0) > (Number(prev.score) || 0)) {
        map.set(key, i);
      }
    }
    return Array.from(map.values());
  }

  // =========================
  // RENDER
  // =========================
  function render() {
    ensureTwoLineHeader();

    if (!localItems.length) {
      listEl.innerHTML = `<div class="right-empty">Αναμονή για ανάλυση AI...</div>`;
      return;
    }

    const filtered = localItems.filter(i =>
      normalizeMarket(i.market) === activeMarket &&
      (ALLOW_CUPS || !isCupLeague(i.league))
    );

    const deduped = dedupByMatch(filtered);
    const visible = sortItems(deduped);

    if (!visible.length) {
      listEl.innerHTML = `<div class="right-empty">No value picks</div>`;
      return;
    }

    listEl.innerHTML = visible.map(i => {
      const score = Number(i.score) || 0;
      const c = confidence(score);
      return `
        <div class="right-row">
          <div class="rr-main">
            <div class="rr-title">${i.home} – ${i.away}</div>
            <div class="rr-sub">${i.league || ""} · ${i.market}</div>
          </div>
          <div class="rr-delta">
            ${score.toFixed(2)}
            <span class="conf-badge ${c.cls}">${c.label}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // =========================
  // EVENT: VALUE UPDATE
  // =========================
  on("value:update", payload => {
    let items = null;
    if (Array.isArray(payload)) items = payload;
    else if (payload && Array.isArray(payload.items)) items = payload.items;
    else return;

    localItems = items;
    render();
  });

  // =========================
  // RESYNC
  // =========================
  window.addEventListener("focus", render);
  document.addEventListener("visibilitychange", render);

  emit("value:subscribe");
})();
