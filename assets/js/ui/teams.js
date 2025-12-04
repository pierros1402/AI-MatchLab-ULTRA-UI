/* ============================================================
   TEAMS LOADER — AI MATCHLAB ULTRA FINAL
============================================================ */

import { loadJSON } from "../utils/loader.js";
import { createElement } from "../utils/dom.js";

/**
 * Load teams for selected league
 */
export async function buildTeams(countryCode, leagueId) {
  const panel = document.getElementById("panel-teams");
  panel.innerHTML = "Loading…";

  const path = `/AI-MATCHLAB-DATA/teams/${countryCode}/${leagueId}.json`;

  console.log("[TEAMS] Loading:", path);

  const data = await loadJSON(path);

  if (!data || !data.teams || data.teams.length === 0) {
    panel.innerHTML = "<div>No teams found.</div>";
    return;
  }

  panel.innerHTML = "";

  data.teams.forEach((team) => {
    const name =
      team.name || team.team_name || team.display_name || "Unnamed team";

    const div = createElement("div", "nav-item", name);
    div.onclick = () => {
      console.log("Selected team:", name);
      // Future: load matches panel
    };

    panel.appendChild(div);
  });

  console.log(`[TEAMS] Rendered ${data.teams.length} teams`);
}
