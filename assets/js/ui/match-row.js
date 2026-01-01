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

    const left = document.createElement("div");
    left.className = "mr-left";

    const teams = document.createElement("div");
    teams.className = "mr-teams";
    teams.textContent = `${m.home} – ${m.away}`;
    left.appendChild(teams);

    const actions = document.createElement("div");
    actions.className = "mr-actions";

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

    const right = document.createElement("div");
    right.className = "mr-right";

    if (label) {
      right.textContent = label;
    } else if (showMinute && m.status === "LIVE") {
      right.classList.add("live");
      right.textContent =
        `${m.minute || ""}' ${m.scoreHome}-${m.scoreAway}`;
    } else if (showScore) {
      right.classList.add("ft");
      right.textContent = `${m.scoreHome}-${m.scoreAway}`;
    } else if (showTime) {
      right.textContent = formatTime(m.kickoff);
    }

    row.appendChild(left);
    row.appendChild(right);

    row.onclick = () => window.emit("match-selected", m);

    return row;
  };
})();
