// ====================================================================
// HEAD TO HEAD API — cached 24 hours
// ====================================================================

const H2H_CACHE = {};
const DAY = 24 * 60 * 60 * 1000;

export const H2HAPI = {

  async getH2H(homeId, awayId) {
    const key = `${homeId}_${awayId}`;

    // Cache check
    if (H2H_CACHE[key] && (Date.now() - H2H_CACHE[key].t < DAY)) {
      return H2H_CACHE[key].data;
    }

    const url = `https://api-football.trial/v3/fixtures/headtohead?h2h=${homeId}-${awayId}`;

    try {
      const r = await fetch(url);
      const j = await r.json();

      H2H_CACHE[key] = {
        t: Date.now(),
        data: j
      };

      return j;

    } catch (err) {
      console.error("[H2H API ERROR]", err);
      return { response: [] };
    }
  }
};
