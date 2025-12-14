// ====================================================================
// MATCH PREDICTION PANEL — AI-STYLE OUTCOME PROJECTION
// ====================================================================
//
// Χρησιμοποιεί τα δεδομένα του Match Hub:
//  - probabilities (home/draw/away)
//  - goalStats (goal expectancy)
//  - ratings (hybrid ratings)
//  - form (last 6)
//  - sharp / ev optional influence
//
// ====================================================================

const predPanel = document.getElementById("panel-prediction");
if (!predPanel) console.warn("[PREDICTION] panel missing");

let hub = null;

// --------------------------------------------------------------------
// Listen for Hub updates
// --------------------------------------------------------------------
on("hub-updated", data => {
  hub = data;
  renderPrediction();
});

// ====================================================================
// MAIN RENDER
// ====================================================================
function renderPrediction() {
  if (!hub) {
    predPanel.innerHTML = `<div class="empty-panel">No match selected</div>`;
    return;
  }

  const { match, probabilities, ratings, goalStats, homeForm, awayForm } = hub;

  const home = match.teams.home.name;
  const away = match.teams.away.name;

  const pHome = (probabilities.home * 100).toFixed(1);
  const pDraw = (probabilities.draw * 100).toFixed(1);
  const pAway = (probabilities.away * 100).toFixed(1);

  // Primary Prediction
  let pick = "Draw";
  let pickProb = pDraw;

  if (probabilities.home > probabilities.away && probabilities.home > probabilities.draw) {
    pick = "Home Win";
    pickProb = pHome;
  }
  if (probabilities.away > probabilities.home && probabilities.away > probabilities.draw) {
    pick = "Away Win";
    pickProb = pAway;
  }

  // Secondary Prediction (Goals)
  const avgGoals = goalStats.avg_home + goalStats.avg_away;
  const altPick = avgGoals > 2.65 ? "Over 2.5 Goals" :
                  avgGoals < 2.15 ? "Under 2.5 Goals" :
                  "Both Teams to Score";

  // Scoreline Estimate (simple Poisson-like)
  const estHome = goalStats.avg_home.toFixed(2);
  const estAway = goalStats.avg_away.toFixed(2);
  const scoreline = `${Math.round(goalStats.avg_home)} - ${Math.round(goalStats.avg_away)}`;

  // Confidence Model
  const ratingGap = Math.abs(ratings.home - ratings.away);
  const formGap = Math.abs(formScore(homeForm) - formScore(awayForm));

  let confidence =
    (probabilities.home * 100) * 0.4 +
    (probabilities.away * 100) * 0.4 +
    ratingGap * 1.5 +
    formGap * 1.2;

  confidence = Math.min(100, Math.max(20, Math.round(confidence)));

  predPanel.innerHTML = `
    <div class="pr-title">Match Prediction</div>

    <div class="pr-section">
      <div class="pr-label">Primary Prediction</div>
      <div class="pr-value">${pick} <span class="pr-prob">${pickProb}%</span></div>
    </div>

    <div class="pr-section">
      <div class="pr-label">Secondary Prediction</div>
      <div class="pr-value alt">${altPick}</div>
    </div>

    <div class="pr-section">
      <div class="pr-label">Projected Scoreline</div>
      <div class="pr-value score">${scoreline}</div>
      <div class="pr-sub">(home xG: ${estHome}, away xG: ${estAway})</div>
    </div>

    <div class="pr-section">
      <div class="pr-label">Confidence</div>
      <div class="pr-conf-bar">
        <div class="pr-conf-fill" style="width:${confidence}%;"></div>
      </div>
      <div class="pr-conf">${confidence}%</div>
    </div>
  `;
}


// ====================================================================
// FORM SCORE HELPER
// ====================================================================
function formScore(arr) {
  return arr.reduce((sum, r) => {
    if (r === "W") return sum + 3;
    if (r === "D") return sum + 1;
    return sum;
  }, 0);
}
