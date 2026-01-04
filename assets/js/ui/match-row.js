(function () {
  if (!window.emit) return;

  window.renderMatchRow = function renderMatchRow(m, opts = {}) {
    const row = document.createElement("div");
    row.className = "match-row";
    row.dataset.id = m.id;

    const left = document.createElement("div");
    left.className = "mr-left";
    left.innerHTML = `
      <div class="mr-teams" style="min-height:36px; line-height:1.25; font-weight:500;">${m.home} – ${m.away}</div>
      <div id="ai-pred-${m.id}" class="ai-prediction-badges" style="font-size:10px; margin-top:4px; font-weight:bold;"></div>
    `;
    row.appendChild(left);

    const right = document.createElement("div");
    right.className = "mr-right";
    const statusBox = document.createElement("div");
    statusBox.className = "mr-status-box";
    
    // Απλοποιημένη λογική score/time για αποφυγή λαθών
    statusBox.textContent = m.status === "LIVE" ? `${m.scoreHome}-${m.scoreAway}` : "Stats";
    
    right.appendChild(statusBox);
    row.appendChild(right);

    // ΤΟ ΚΛΙΚ ΠΟΥ ΣΥΝΔΕΕΙ ΤΑ ΠΑΝΤΑ
    row.addEventListener("click", () => {
      document.querySelectorAll(".match-row").forEach(r => r.classList.remove("active"));
      row.classList.add("active");
      window.emit("match-selected", m);
    });

    return row;
  };
})();