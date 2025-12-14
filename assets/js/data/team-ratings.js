// ====================================================================
// TEAM RATINGS ENGINE — PRO HYBRID MODEL (COMPLETE)
// ====================================================================
//
// Το Pro Hybrid Rating Model συνδυάζει:
//
// 1) Base Power Rating (tier, form, goal diff)
// 2) Momentum Rating (last 5 matches: GF/GA, shot ratio, intensity)
// 3) Context Rating (home/away, fatigue, match importance)
// 4) League Strength Normalization
//
// Τελικό αποτέλεσμα:
// rating = base * 0.50 + momentum * 0.30 + context * 0.20
//
// ====================================================================


// --------------------------------------------------------------------
// EXPORTED MAIN FUNCTION
// --------------------------------------------------------------------
export function computeTeamRatings(match, homeForm, awayForm) {

  const homeBase = basePower(homeForm);
  const awayBase = basePower(awayForm);

  const homeMomentum = momentumRating(homeForm);
  const awayMomentum = momentumRating(awayForm);

  const homeContext = contextRating(match, true);
  const awayContext = contextRating(match, false);

  const leagueFactor = leagueDifficulty(match.league_id);

  // Final Ratings
  const homeRating =
      (homeBase * 0.50 + homeMomentum * 0.30 + homeContext * 0.20) * leagueFactor;

  const awayRating =
      (awayBase * 0.50 + awayMomentum * 0.30 + awayContext * 0.20) * leagueFactor;

  return {
    homeRating,
    awayRating
  };
}



// ====================================================================
// 1) BASE POWER RATING
// ====================================================================
function basePower(form) {
  if (!form || !form.last5) return 50;

  const { gf, ga, wins, draws, losses } = summarize(form.last5);

  const points = wins * 3 + draws;
  const gd = gf - ga;

  return clamp(
    40 +
    points * 3 +
    gd * 1.5,
    20,
    95
  );
}



// ====================================================================
// 2) MOMENTUM RATING (last 5 matches)
// ====================================================================
function momentumRating(form) {
  if (!form || !form.last5) return 50;

  const { gf, ga, shotsFor, shotsAgainst } = summarize(form.last5);

  const shotRatio = shotsFor / Math.max(1, shotsAgainst);

  const goalFlow = gf - ga;

  return clamp(
    45 +
    (shotRatio * 10) +
    (goalFlow * 2),
    25,
    95
  );
}



// ====================================================================
// 3) CONTEXT RATING (home/away/fatigue/importance)
// ====================================================================
function contextRating(match, isHome) {

  const fatigue = computeFatigue(match, isHome);
  const importance = computeImportance(match);

  let base = 50;

  if (isHome) base += 5;

  return clamp(
    base + importance - fatigue,
    30,
    90
  );
}



// ====================================================================
// 4) LEAGUE DIFFICULTY NORMALIZATION
// --------------------------------------------------------------------
// You can fine-tune these multipliers per league later.
// ====================================================================
function leagueDifficulty(leagueId) {
  if (!leagueId) return 1.0;

  // Examples:
  const elite = ["ENG1","ITA1","ESP1","GER1","FRA1"];
  const strong = ["NED1","POR1","TUR1","BEL1"];
  const medium = ["GRE1","CYP1","SCO1","AUS1"];

  if (elite.includes(leagueId)) return 1.00;
  if (strong.includes(leagueId)) return 0.97;
  if (medium.includes(leagueId)) return 0.93;

  return 0.90; // default for weaker leagues
}



// ====================================================================
// SUPPORT FUNCTIONS
// ====================================================================

// Summarize last 5 matches object from form-api mapper
function summarize(games) {
  let gf = 0, ga = 0;
  let wins = 0, draws = 0, losses = 0;

  let shotsFor = 0, shotsAgainst = 0;

  for (const g of games) {
    gf += g.gf;
    ga += g.ga;
    shotsFor += g.shotsFor;
    shotsAgainst += g.shotsAgainst;

    if (g.result === "W") wins++;
    else if (g.result === "D") draws++;
    else losses++;
  }

  return { gf, ga, wins, draws, losses, shotsFor, shotsAgainst };
}



// Simple fatigue model (placeholder)
function computeFatigue(match, isHome) {
  // Αν θέλουμε, μπορούμε να συνδέσουμε real calendar load
  return 3; // σταθερό μέχρι να ενεργοποιήσουμε real schedule
}



// Placeholder importance model
function computeImportance(match) {
  // Μπορεί να γίνει δυναμικό με league standings ή cup knockout
  return 5; // σταθερά προς το παρόν
}



function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
