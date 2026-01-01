(function () {
  if (!window.emit) return;

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  window.renderMatchRow = function renderMatchRow(m, opts = {}) {
    const {
      showTime = false,
      showScore = false,
      showMinute = false,
      label = ""
    } = opts;

    const row = document.createElement("div");
    row.className = "match-row";

    /* ---------------- LEFT ---------------- */

    const left = document.createElement("div");
    left.className = "mr-left";
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.justifyContent = "space-between";

    const teams = document.createElement("div");
    teams.className = "mr-teams";
    teams.textContent = `${m.home} – ${m.away}`;
    teams.style.minHeight = "36px"; // anchor for 1–2 lines
    teams.style.lineHeight = "1.25";

    left.appendChild(teams);

    const actions = document.createElement("div");
    actions.className = "mr-actions";
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.marginTop = "6px";

    const btnSave = document.createElement("button");
    btnSave.className = "mr-btn";
    btnSave.title = "Save";
    btnSave.textContent = "★";
    btnSave.onclick = (e) => {
      e.stopPropagation();
      window.emit("match-save-toggle", m);
    };

    const btnInfo = document.createElement("button");
    btnInfo.className = "mr-btn";
    btnInfo.title = "Details";
    btnInfo.textContent = "ℹ";
    btnInfo.onclick = (e) => {
      e.stopPropagation();
      window.emit("details-open", m);
    };

    actions.appendChild(btnSave);
    actions.appendChild(btnInfo);
    left.appendChild(actions);

    /* ---------------- RIGHT ---------------- */

    const right = document.createElement("div");
    right.className = "mr-right";
    right.style.minWidth = "56px";
    right.style.display = "flex";
    right.style.justifyContent = "center";
    right.style.alignItems = "center";

    const statusBox = document.createElement("div");
    statusBox.className = "mr-status-box";
    statusBox.style.display = "flex";
    statusBox.style.flexDirection = "column";
    statusBox.style.alignItems = "center";
    statusBox.style.whiteSpace = "nowrap";

    if (label) {
      statusBox.textContent = label;

    } else if (showMinute && m.status === "LIVE") {
      right.classList.add("live");

      const min = document.createElement("div");
      min.className = "mr-minute";
      min.textContent = `${m.minute || ""}'`;
      min.style.fontSize = "12px";
      min.style.opacity = "0.8";

      const score = document.createElement("div");
      score.className = "mr-score";
      score.textContent = `${m.scoreHome} – ${m.scoreAway}`;
      score.style.fontWeight = "600";
      score.style.whiteSpace = "nowrap";

      statusBox.appendChild(min);
      statusBox.appendChild(score);

    } else if (showScore) {
      right.classList.add("ft");

      const score = document.createElement("div");
      score.className = "mr-score";
      score.textContent = `${m.scoreHome} – ${m.scoreAway}`;
      score.style.fontWeight = "600";
      score.style.whiteSpace = "nowrap";

      statusBox.appendChild(score);

    } else if (showTime) {
      statusBox.textContent = formatTime(m.kickoff);
    }

    right.appendChild(statusBox);

    /* ---------------- ASSEMBLY ---------------- */

    row.appendChild(left);
    row.appendChild(right);

    row.onclick = () => window.emit("match-selected", m);

    return row;
  };
})();
