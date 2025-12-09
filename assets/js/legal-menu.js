/* ============================================
   LEGAL MODAL — STABLE VERSION
   ============================================ */

export function initLegalMenu() {
  const btn = document.getElementById("btn-legal");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "legal-wrapper";

    wrapper.innerHTML = `
      <div class="legal-modal">
        <h2>Legal & Policies</h2>
        <p>Terms of Service</p>
        <p>Privacy Policy</p>
        <p>Cookie Policy</p>
        <button id="legal-close">Close</button>
      </div>
    `;

    document.body.appendChild(wrapper);
    document.getElementById("legal-close").onclick = () => wrapper.remove();

    wrapper.addEventListener("click", (e) => {
      if (e.target === wrapper) wrapper.remove();
    });
  });
}
