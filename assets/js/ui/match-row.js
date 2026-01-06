(function () {
  "use strict";

  function isFinal(m) {
    return m.status === "FT";
  }

  function isConfirmedLive(m) {
    return m.status === "LIVE" || m.status === "HT";
  }

  function hasScore(m) {
    return Number.isFinite(m.scoreHome) && Number.isFinite(m.scoreAway);
  }

  function formatTime24(m) {
    if (m.kickoff) {
      const d = new Date(m.kickoff);
      return d.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    }
    if (m.kickoff_ms) {
      const d = new Date(m.kickoff_ms);
      return d.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    }
    return "";
  }

  window.renderMatchRow = function (m, opts = {}) {
    const row = document.createElement("div");
    row.className = "match-row";

    const main = document.createElement("div");
    main.className = "match-main";
    main.textContent = `${m.home} – ${m.away}`;

    const meta = document.createElement("div");
    meta.className = "match-meta";

    // FT → τελικό σκορ
    if (isFinal(m) && hasScore(m)) {
      meta.textContent = `${m.scoreHome}-${m.scoreAway}`;
      meta.classList.add("ft");

    // LIVE / HT → σκορ + λεπτό
    } else if (isConfirmedLive(m) && hasScore(m)) {
      const min = m.minute ? ` ${m.minute}` : "";
      meta.textContent = `${m.scoreHome}-${m.scoreAway}${min}`;
      meta.classList.add("live");

    // PRE → ΜΟΝΟ ώρα (ΠΟΤΕ σκορ)
    } else {
      meta.textContent = formatTime24(m);
      meta.classList.add("pre");
    }

    row.appendChild(main);
    row.appendChild(meta);

    row.addEventListener("click", () => {
      if (typeof window.emit === "function") {
        window.emit("match-selected", m);
      }
    });

    return row;
  };
})();
