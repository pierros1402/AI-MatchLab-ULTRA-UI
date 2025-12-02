/* ============================================================
   AI MATCHLAB ULTRA — FINAL ACCORDION ENGINE (AUTO-STEP)
   Always one panel open — supports automatic step navigation
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("[AIML Accordion] FINAL Engine Loaded");

    const items = document.querySelectorAll(".accordion-item");

    /* ------------------------------
       CLOSE ALL PANELS
    ------------------------------ */
    function closeAll() {
        items.forEach(i => {
            const body = i.querySelector(".accordion-body");
            body.style.display = "none";
        });
    }

    /* ------------------------------
       OPEN PANEL BY BODY ID
    ------------------------------ */
    function openPanelById(id) {
        const target = [...items].find(i =>
            i.querySelector(".accordion-body").id === id
        );
        if (!target) return;

        closeAll();
        const body = target.querySelector(".accordion-body");
        body.style.display = "block";

        target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* ------------------------------
       MANUAL HEADER CLICK
       (only one open at a time)
    ------------------------------ */
    items.forEach(item => {
        const header = item.querySelector(".accordion-header");
        const body = item.querySelector(".accordion-body");

        header.style.cursor = "pointer";

        header.addEventListener("click", () => {
            const isOpen = body.style.display === "block";

            closeAll();
            body.style.display = isOpen ? "none" : "block";
        });
    });

    /* ------------------------------
       AUTO-STEP EVENTS
       Triggered by app.js selections
    ------------------------------ */
    document.addEventListener("AIML_CONTINENT_SELECTED", () => {
        openPanelById("panel-countries");
    });

    document.addEventListener("AIML_COUNTRY_SELECTED", () => {
        openPanelById("panel-leagues");
    });

    document.addEventListener("AIML_LEAGUE_SELECTED", () => {
        openPanelById("panel-teams");
    });

    document.addEventListener("AIML_TEAM_SELECTED", () => {
        openPanelById("panel-matches");
    });

    document.addEventListener("AIML_MATCH_SELECTED", () => {
        openPanelById("panel-details");
    });

    /* Expose globally if needed */
    window.AIMLAccordion = { openPanelById };
});
