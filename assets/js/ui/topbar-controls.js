(function () {
  "use strict";
  if (window.__AIML_TOPBAR__) return;
  window.__AIML_TOPBAR__ = true;

  const back = document.getElementById("btn-back");
  const home = document.getElementById("btn-home");

  back?.addEventListener("click", (e) => {
    e.preventDefault();
    history.back();
  });

  home?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/index.html";
  });
})();
