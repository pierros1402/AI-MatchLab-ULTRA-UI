document.addEventListener("DOMContentLoaded", () => {
  /* -------------------------------------------
     SELECTORS
  --------------------------------------------*/
  const headers = document.querySelectorAll(".accordion-header");
  const bodies = document.querySelectorAll(".accordion-body");

  function closeAll() {
    headers.forEach(h => h.classList.remove("active"));
    bodies.forEach(b => {
      b.classList.remove("active");
      b.style.display = "none";
    });
  }

  function openByName(panelName) {
    const header = document.querySelector(`.accordion-header[data-target="${panelName}"]`);
    const body = document.getElementById(panelName);

    if (!header || !body) return;

    closeAll();
    header.classList.add("active");
    body.classList.add("active");
    body.style.display = "block";
  }

  /* -------------------------------------------
     MANUAL CLICK (Open one, close all)
  --------------------------------------------*/
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const panelName = header.dataset.target;
      openByName(panelName);
    });
  });

  /* -------------------------------------------
     AUTO OPEN BASED ON EVENTS
     (app.js will dispatch these!)
  --------------------------------------------*/
  document.addEventListener("AIML_CONTINENT_SELECTED", () => {
    openByName("panel-countries");
  });

  document.addEventListener("AIML_COUNTRY_SELECTED", () => {
    openByName("panel-leagues");
  });

  document.addEventListener("AIML_LEAGUE_SELECTED", () => {
    openByName("panel-teams");
  });

  document.addEventListener("AIML_TEAM_SELECTED", () => {
    openByName("panel-details");
  });

  /* -------------------------------------------
     DEFAULT: OPEN CONTINENTS FIRST
  --------------------------------------------*/
  openByName("panel-continents");
});
