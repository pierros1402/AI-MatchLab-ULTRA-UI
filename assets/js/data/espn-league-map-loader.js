(function () {
  // φορτώνει το ESPN league KV map και το εκθέτει global
  const PATH = "/AI-MATCHLAB-DATA/mappings/espn_league_kv_map_FULL_with_ids.json";

  fetch(PATH, { cache: "no-store" })
    .then(r => r.json())
    .then(map => {
      window.ESPN_LEAGUE_KV_MAP = map;
      console.log("[MAP] ESPN_LEAGUE_KV_MAP loaded:", Object.keys(map).length);
    })
    .catch(err => {
      console.error("[MAP] failed to load ESPN_LEAGUE_KV_MAP", err);
    });
})();
