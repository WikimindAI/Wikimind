/* ================= Wikimind — Avertissement lien externe ================= */
(function () {
  "use strict";

  // Construit la popup une seule fois
  function buildPopup() {
    if (document.getElementById("wm-link-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "wm-link-overlay";
    overlay.innerHTML = `
      <div id="wm-link-popup" role="dialog" aria-modal="true" aria-labelledby="wm-link-title">
        <div id="wm-link-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </div>
        <div id="wm-link-title">Vous quittez Wikimind</div>
        <div id="wm-link-text">
          Vous allez être redirigé vers un site externe à Wikimind. Nous ne contrôlons pas ce qu'il se passe en dehors de l'écosystème Wikimind.
        </div>
        <span id="wm-link-url"></span>
        <div id="wm-link-actions">
          <button id="wm-link-cancel">Annuler</button>
          <button id="wm-link-continue">Continuer</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector("#wm-link-cancel");
    const continueBtn = overlay.querySelector("#wm-link-continue");

    cancelBtn.addEventListener("click", closePopup);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePopup();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("active")) closePopup();
    });

    continueBtn.addEventListener("click", () => {
      const url = overlay.dataset.pendingUrl;
      closePopup();
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function closePopup() {
    const overlay = document.getElementById("wm-link-overlay");
    if (overlay) overlay.classList.remove("active");
  }

  function openPopup(url) {
    buildPopup();
    const overlay = document.getElementById("wm-link-overlay");
    overlay.dataset.pendingUrl = url;
    overlay.querySelector("#wm-link-url").textContent = url;
    overlay.classList.add("active");
  }

  // Détermine si un lien pointe vers un domaine externe à Wikimind
  function isExternalLink(link) {
    try {
      const url = new URL(link.href, window.location.href);
      return url.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  // Interception globale des clics sur les liens générés dans les réponses
  // (bulles de messages) et, plus largement, tout lien externe de l'app.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;

    // On ignore les liens explicitement marqués comme internes
    if (link.dataset.wmInternal === "true") return;

    if (isExternalLink(link)) {
      e.preventDefault();
      e.stopPropagation();
      openPopup(link.href);
    }
  }, true);

  // Expose une API si besoin de déclencher la popup manuellement
  window.openExternalLinkWarning = openPopup;

  document.addEventListener("DOMContentLoaded", buildPopup);
})();
