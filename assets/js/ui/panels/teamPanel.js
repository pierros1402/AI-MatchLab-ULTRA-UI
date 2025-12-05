// assets/js/ui/panels/teamPanel.js

let TEAMS_MASTER = null;

async function loadMaster() {
  if (!TEAMS_MASTER) {
    TEAMS_MASTER = await fetch("/AI-MATCHLAB-DATA/TEAMS/teams_master_GLOBAL.json").then(r => r.json());
  }
}

async function getTeam(id) {
  await loadMaster();
  return TEAMS_MASTER.find(t => t.team_id === String(id)) || null;
}

export async function openTeamPanel(teamId) {
  const panel = document.getElementById("right-panel-content");
  const team = await getTeam(teamId);

  if (!team) {
    panel.innerHTML = "Team not found.";
    return;
  }

  panel.innerHTML = `
    <h2>${team.name}</h2>

    <h3>Competitions</h3>
    <ul>
      ${team.competitions
        .map(c => `<li>${c.competition_name} (${c.seasons.join(", ")})</li>`)
        .join("")}
    </ul>

    <p><b>Transfermarkt:</b> 
      <a href="${team.transfermarkt_url}" target="_blank">Open ↗</a>
    </p>
  `;
}
