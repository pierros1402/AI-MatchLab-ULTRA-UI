// ====================================================================
// FORM API (Hybrid Cached Model)
// Fetches last 5 matches for each team ONCE per 24 hours.
// ====================================================================

const FORM_CACHE = {};
const DAY = 24 * 60 * 60 * 1000;

export const FormAPI = {

  async getTeamForm(teamId) {
    // Use cache if valid
    if (
      FORM_CACHE[teamId] &&
      Date.now() - FORM_CACHE[teamId].t < DAY
    ) {
      return FORM_CACHE[teamId].data;
    }

    const url = `https://api-football.trial/v3/fixtures?team=${teamId}&last=5`;

    try {
      const r = await fetch(url);
      const j = await r.json();

      // Save to cache
      FORM_CACHE[teamId] = {
        t: Date.now(),
        data: j
      };

      return j;

    } catch (err) {
      console.error("[FORM API ERROR]", err);
      return { response: [] };
    }
  }

};
