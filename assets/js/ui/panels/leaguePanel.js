// assets/js/ui/panels/leaguePanel.js
import { STATE } from "../state.js";

export function renderLeagues(countryObj, containerEl) {
  if (!countryObj || !countryObj.leagues) {
    containerEl.innerHTML = `<div class="empty-msg">No leagues available.</div>`;
    return;
  }

  containerEl.innerHTML = countryObj.leagues
    .map(
      (lg) => `
      <div class="league-item" data-league-id="${lg.league_id}">
        ${lg.display_name}
      </div>`
    )
    .join("");

  containerEl.querySelectorAll(".league-item").forEach((item) => {
    item.addEventListener("click", () => {
      const leagueId = item.getAttribute("data-league-id");
      STATE.selectedLeagueId = leagueId;

      console.log("%c[LEAGUE] Selected:", "color:#4fa", leagueId);

      // ενημέρωσε το accordion ότι επιλέχθηκε λίγκα
      document.dispatchEvent(new Event("AIML_LEAGUE_SELECTED"));
    });
  });
}
