document.addEventListener("DOMContentLoaded", () => {
    console.log("[Accordion] Loaded");

    const items = document.querySelectorAll(".accordion-item");

    items.forEach(item => {
        const header = item.querySelector(".accordion-header");
        const body = item.querySelector(".accordion-body");

        // Style
        header.style.cursor = "pointer";

        // Initially close all except first
        body.style.display = item === items[0] ? "block" : "none";

        // Only toggle THIS panel on click
        header.addEventListener("click", () => {
            const isOpen = body.style.display === "block";

            items.forEach(i => {
                i.querySelector(".accordion-body").style.display = "none";
            });

            body.style.display = isOpen ? "none" : "block";
        });
    });
});
