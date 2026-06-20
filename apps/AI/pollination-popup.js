/* ══════════════════════════════════════════════
   POLLINATION POPUP — Wikimind "Quoi de neuf"
   ══════════════════════════════════════════════ */

(function () {
  const STORAGE_KEY = "wm_whats_new_seen_v2";

  // ── Données des nouveautés ──────────────────────────────────────────────
  const UPDATES = [
    {
      date: "12 juin 2026",
      title: "4 nouveaux modèles de génération d'images",
      models: [
        {
          id: "wm-image-flux",
          name: "Flux Schnell",
          apiModel: "flux",
          logo: "pollinationai.png",
          provider: "Pollinations AI",
          providerUrl: "https://pollinations.ai/",
          desc: "Modèle Flux de Black Forest Labs. Génère des images en quelques secondes, parfait pour explorer des idées visuelles rapidement.",
        },
        {
          id: "wm-image-gpt",
          name: "GPT Image",
          apiModel: "gptimage",
          logo: "pollinationai.png",
          provider: "Pollinations AI",
          providerUrl: "https://pollinations.ai/",
          desc: "Propulsé par GPT Image d'OpenAI. Résultats réalistes et fidèles au prompt, idéal pour des visuels soignés.",
        },
        {
          id: "wm-image-gpt-large",
          name: "GPT 1.5 Image",
          apiModel: "gptimage-large",
          logo: "pollinationai.png",
          provider: "Pollinations AI",
          providerUrl: "https://pollinations.ai/",
          desc: "Version Large de GPT Image. Rendu haute définition avec une compréhension fine des détails et des compositions complexes.",
        },
        {
          id: "wm-image-kontext",
          name: "Kontext",
          apiModel: "kontext",
          logo: "pollinationai.png",
          provider: "Pollinations AI",
          providerUrl: "https://pollinations.ai/",
          desc: "FLUX.1 Kontext par Black Forest Labs. Spécialisé dans l'édition contextuelle — modifiez une image existante en décrivant le changement souhaité.",
        },
      ],
      note: "Les modèles image sont disponibles dans le sélecteur de modèles. Sélectionnez-en un et décrivez votre image pour générer.",
    },
  ];

  // ── Injection CSS + HTML ────────────────────────────────────────────────
  function inject() {
    if (!document.querySelector('link[href="pollination-popup.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "pollination-popup.css";
      document.head.appendChild(link);
    }

    const overlay = document.createElement("div");
    overlay.id = "wn-overlay";
    document.body.appendChild(overlay);

    const popup = document.createElement("div");
    popup.id = "wn-popup";
    popup.innerHTML = buildPopupHTML();
    document.body.appendChild(popup);
  }

  // ── Construction du HTML ────────────────────────────────────────────────
  function buildPopupHTML() {
    const update = UPDATES[0];

    const modelsHTML = update.models.map((model) => `
      <a class="wn-model-card" href="${model.providerUrl}" target="_blank" rel="noopener">
        <div class="wn-model-logo">
          <img src="${model.logo}" alt="${model.provider}" onerror="this.style.display='none'">
        </div>
        <div class="wn-model-info">
          <div class="wn-model-name">
            ${model.name}
            <span class="wn-provider-badge pollinations">${model.provider}</span>
          </div>
          <div class="wn-model-desc">${model.desc}</div>
        </div>
        <div class="wn-model-link">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </div>
      </a>`).join("");

    return `
    <div id="wn-header">
      <div id="wn-header-icon">
        <img src="pollinationai.png" alt="Pollinations" onerror="this.style.display='none'">
      </div>
      <div id="wn-header-text">
        <div id="wn-header-title">What's New with Wikimind ?</div>
        <div id="wn-header-subtitle">Dernière mise à jour · ${update.date}</div>
      </div>
      <button id="wn-close" title="Fermer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div id="wn-body">
      <div class="wn-date-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        À partir du ${update.date}
      </div>

      <div class="wn-section-title">${update.title}</div>

      <div class="wn-models-grid">
        ${modelsHTML}
      </div>

      <div class="wn-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>${update.note}</span>
      </div>
    </div>

    <div id="wn-footer">
      <span id="wn-footer-label">Wikimind AI · Juin 2026</span>
      <button id="wn-got-it">J'ai compris ✓</button>
    </div>`;
  }

  // ── Ouvrir / Fermer ─────────────────────────────────────────────────────
  function open() {
    document.getElementById("wn-overlay").classList.add("open");
    document.getElementById("wn-popup").classList.add("open");
  }

  function close() {
    document.getElementById("wn-overlay").classList.remove("open");
    document.getElementById("wn-popup").classList.remove("open");
    localStorage.setItem(STORAGE_KEY, "1");
    hideDot();
  }

  function hideDot() {
    const dot = document.querySelector("#btn-whats-new .wn-dot");
    if (dot) dot.classList.add("hidden");
  }

  // ── Bouton topbar ────────────────────────────────────────────────────────
  function injectTopbarBtn() {
    const tbSearch = document.getElementById("tb-search");
    if (!tbSearch) return;

    const seen = localStorage.getItem(STORAGE_KEY);

    const btn = document.createElement("button");
    btn.className = "tb-btn";
    btn.id = "btn-whats-new";
    btn.title = "Quoi de neuf ?";
    btn.innerHTML = `
      <img class="wn-logo" src="pollinationai.png" alt="Nouveautés"
           onerror="this.outerHTML='<svg width=\\'15\\' height=\\'15\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3\\'/></svg>'">
      <span class="wn-dot${seen ? " hidden" : ""}"></span>
    `;

    tbSearch.replaceWith(btn);

    btn.addEventListener("click", () => {
      const isOpen = document.getElementById("wn-popup").classList.contains("open");
      if (isOpen) close();
      else open();
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    inject();
    injectTopbarBtn();

    document.getElementById("wn-close").addEventListener("click", close);
    document.getElementById("wn-got-it").addEventListener("click", close);
    document.getElementById("wn-overlay").addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setTimeout(open, 900);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
