/* ══════════════════════════════════════════════
   FORFAIT — Wikimind Plans & Abonnements
   ══════════════════════════════════════════════ */

(function () {

  const CONTACT_EMAIL = "wikimind.ai@gmail.com";

  // ── Données des plans ───────────────────────────────────────────────────
  // FORFAIT : 1 = Free, 2 = Plus, 3 = Pro, 4 = Entreprise (sur demande)
  const PLANS = [
    {
      id: "free",
      forfait: 1,
      name: "Free",
      monthly: 0,
      annual: 0,
      desc: "Pour découvrir Wikimind et ses fonctionnalités essentielles.",
      cta: { text: "Forfait actuel", cls: "current-cta", disabled: true },
      featured: false,
      features: [
        { text: "Accès aux modèles Small et Flash", active: true },
        { text: "20 messages / jour", active: true },
        { text: "Génération d'images (Flux Schnell)", active: true },
        { text: "Historique des conversations", active: true },
        { text: "Stockage cloud des images", active: false },
        { text: "Modèles Large et Medium", active: false },
        { text: "AI Tokens (génération vidéo)", active: false },
      ],
    },
    {
      id: "plus",
      forfait: 2,
      name: "Plus",
      monthly: 7,
      annual: 5,
      desc: "Pour les utilisateurs réguliers qui veulent plus de puissance et de stockage.",
      badge: { text: "Populaire", cls: "badge-popular" },
      cta: { text: "Passer à Plus →", cls: "featured-cta", disabled: false },
      featured: true,
      features: [
        { text: "Accès à tous les modèles", active: true },
        { text: "Messages illimités", active: true },
        { text: "Tous les modèles image (GPT Image, Kontext…)", active: true },
        { text: "Stockage cloud des images — 5 Go", active: true },
        { text: "Historique illimité", active: true },
        { text: "500 AI Tokens / jour · Génération vidéo", active: true },
        { text: "Support prioritaire", active: false },
      ],
    },
    {
      id: "pro",
      forfait: 3,
      name: "Pro",
      monthly: 18,
      annual: 14,
      desc: "Pour les créateurs et professionnels avec des besoins intensifs.",
      badge: null,
      cta: { text: "Passer à Pro →", cls: "", disabled: false },
      featured: false,
      features: [
        { text: "Tout ce qui est inclus dans Plus", active: true },
        { text: "Stockage cloud des images — 50 Go", active: true },
        { text: "Limites de génération augmentées ×5", active: true },
        { text: "Accès anticipé aux nouveaux modèles", active: true },
        { text: "1 500 AI Tokens / jour · Vidéo haute qualité", active: true },
        { text: "Support prioritaire 24h", active: true },
        { text: "API Wikimind en accès direct", active: true },
      ],
    },
    {
      id: "enterprise",
      forfait: 4,
      name: "Entreprise",
      monthly: null,
      annual: null,
      onRequest: true,
      desc: "Pour les écoles, organisations et équipes avec des besoins sur-mesure.",
      badge: { text: "Sur demande", cls: "badge-enterprise" },
      cta: { text: "Nous contacter →", cls: "enterprise-cta", disabled: false },
      featured: false,
      features: [
        { text: "Tout ce qui est inclus dans Pro", active: true },
        { text: "Quotas et AI Tokens personnalisés", active: true },
        { text: "Comptes multi-utilisateurs / organisation", active: true },
        { text: "Facturation adaptée à vos besoins", active: true },
        { text: "Accompagnement dédié", active: true },
      ],
    },
  ];

  let isAnnual = false;

  // ── Injection CSS ────────────────────────────────────────────────────────
  function injectCSS() {
    if (!document.querySelector('link[href="forfait.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "forfait.css";
      document.head.appendChild(link);
    }
  }

  // ── Récupérer le forfait actuel de l'utilisateur ─────────────────────────
  function getCurrentForfait() {
    const f = window._userForfait;
    if (typeof f === "number" && f >= 1 && f <= 4) return f;
    return 1; // Free par défaut
  }

  // ── Build HTML ───────────────────────────────────────────────────────────
  function buildPanel() {
    const overlay = document.createElement("div");
    overlay.id = "forfait-overlay";
    document.body.appendChild(overlay);

    const panel = document.createElement("div");
    panel.id = "forfait-panel";
    panel.innerHTML = `
      <div id="fp-topbar">
        <div id="fp-topbar-left">
          <span id="fp-topbar-logo">Wikimind</span>
          <div id="fp-topbar-sep"></div>
          <span id="fp-topbar-title">Choisir un forfait</span>
        </div>
        <button id="fp-close" title="Fermer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div id="fp-body">
        <div id="fp-hero">
          <div id="fp-hero-eyebrow">
            <span></span>
            Wikimind Premium
            <span></span>
          </div>
          <h1 id="fp-hero-title">Débloquez tout<br><em>le potentiel de l'IA</em></h1>
          <p id="fp-hero-sub">Des modèles plus puissants, du stockage cloud pour vos images générées, et bien plus — au prix qui vous convient.</p>
        </div>

        <div id="fp-billing-toggle">
          <span class="fp-billing-opt active" id="fp-opt-monthly">Mensuel</span>
          <div id="fp-toggle-switch">
            <div id="fp-toggle-knob"></div>
          </div>
          <span class="fp-billing-opt" id="fp-opt-annual">Annuel</span>
          <span class="fp-annual-badge" id="fp-save-badge">−2 mois offerts</span>
        </div>

        <div id="fp-plans">
          ${PLANS.map(buildPlanCard).join("")}
        </div>

        <p id="fp-note">
          Aucun paiement automatique : cliquer sur "Passer à Plus/Pro" envoie une demande d'upgrade par e-mail à l'équipe Wikimind, qui active votre forfait manuellement.<br>
          Le forfait Entreprise est attribué manuellement après contact.<br>
          Les AI Tokens sont une monnaie virtuelle utilisable pour la génération vidéo sur la plateforme.<br>
          <a id="fp-faq-link">Voir la FAQ →</a>
        </p>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function buildPlanCard(plan) {
    const currentForfait = getCurrentForfait();
    const isCurrent = plan.forfait === currentForfait;

    const price = isAnnual ? plan.annual : plan.monthly;
    const annualNote = plan.onRequest || plan.monthly === 0
      ? ""
      : isAnnual
        ? `<span class="saving">soit ${plan.annual * 12} € / an</span>`
        : `${plan.annual} € / mois facturé annuellement`;

    // Badge : priorité au badge "Actuel" si c'est le forfait actif
    let badgeHTML = "";
    if (isCurrent) {
      badgeHTML = `<div class="fp-plan-badge badge-current">Actuel</div>`;
    } else if (plan.badge) {
      badgeHTML = `<div class="fp-plan-badge ${plan.badge.cls}">${plan.badge.text}</div>`;
    }

    const featuresHTML = plan.features.map(f => `
      <li class="fp-feature${f.active ? "" : " dim"}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          ${f.active
            ? `<polyline points="20 6 9 17 4 12"/>`
            : `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`
          }
        </svg>
        ${f.text}
      </li>`).join("");

    let priceDisplay;
    if (plan.onRequest) {
      priceDisplay = `<span class="fp-price-amount fp-price-onrequest">Sur devis</span>`;
    } else if (plan.monthly === 0) {
      priceDisplay = `<span class="fp-price-amount">0</span><span class="fp-price-currency">€</span>`;
    } else {
      priceDisplay = `<span class="fp-price-currency">€</span><span class="fp-price-amount" data-monthly="${plan.monthly}" data-annual="${plan.annual}">${price}</span>`;
    }

    let periodHTML;
    if (plan.onRequest) {
      periodHTML = `<span class="fp-price-period">forfait personnalisé</span>`;
    } else if (plan.monthly > 0) {
      periodHTML = `<span class="fp-price-period">/ mois</span>`;
    } else {
      periodHTML = `<span class="fp-price-period">pour toujours</span>`;
    }

    // CTA : si c'est le forfait actuel, on désactive même si ce n'était pas "free"
    let ctaCls = plan.cta.cls;
    let ctaText = plan.cta.text;
    let ctaDisabled = plan.cta.disabled;
    if (isCurrent) {
      ctaCls = "current-cta";
      ctaText = "Forfait actuel";
      ctaDisabled = true;
    }

    return `
      <div class="fp-plan${plan.featured ? " featured" : ""}${isCurrent ? " current" : ""}${plan.onRequest ? " enterprise" : ""}" data-plan="${plan.id}">
        ${badgeHTML}
        <div class="fp-plan-name">${plan.name}</div>
        <div class="fp-plan-price">
          ${priceDisplay}
          ${periodHTML}
        </div>
        <div class="fp-price-annual-note" id="fp-note-${plan.id}">${annualNote}</div>
        <p class="fp-plan-desc">${plan.desc}</p>
        <ul class="fp-features">${featuresHTML}</ul>
        <button class="fp-cta ${ctaCls}" data-plan="${plan.id}" ${ctaDisabled ? "disabled" : ""}>${ctaText}</button>
      </div>`;
  }

  // ── Toggle mensuel / annuel ──────────────────────────────────────────────
  function updatePrices(annual) {
    isAnnual = annual;
    const toggle = document.getElementById("fp-toggle-switch");
    const optMonthly = document.getElementById("fp-opt-monthly");
    const optAnnual = document.getElementById("fp-opt-annual");

    toggle.classList.toggle("annual", annual);
    optMonthly.classList.toggle("active", !annual);
    optAnnual.classList.toggle("active", annual);

    PLANS.forEach(plan => {
      if (plan.onRequest || plan.monthly === 0) return;
      const amountEl = document.querySelector(`.fp-plan[data-plan="${plan.id}"] .fp-price-amount`);
      const noteEl = document.getElementById(`fp-note-${plan.id}`);
      if (amountEl) amountEl.textContent = annual ? plan.annual : plan.monthly;
      if (noteEl) {
        noteEl.className = `fp-price-annual-note${annual ? " saving" : ""}`;
        noteEl.innerHTML = annual
          ? `soit ${plan.annual * 12} € / an`
          : `${plan.annual} € / mois facturé annuellement`;
      }
    });
  }

  // ── Ouvrir / Fermer ──────────────────────────────────────────────────────
  function open() {
    // Reconstruire le panneau pour refléter le forfait actuel à chaque ouverture
    rebuildPlans();
    document.getElementById("forfait-overlay").classList.add("open");
    document.getElementById("forfait-panel").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    document.getElementById("forfait-overlay").classList.remove("open");
    document.getElementById("forfait-panel").classList.remove("open");
    document.body.style.overflow = "";
  }

  function rebuildPlans() {
    const plansEl = document.getElementById("fp-plans");
    if (!plansEl) return;
    plansEl.innerHTML = PLANS.map(buildPlanCard).join("");
    bindCtaEvents();
  }

  // ── Bind events ──────────────────────────────────────────────────────────
  function bindCtaEvents() {
    document.querySelectorAll(".fp-cta:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const planId = btn.dataset.plan;
        const plan = PLANS.find(p => p.id === planId);
        if (!plan) return;

        const userEmail = window.currentUser?.email || "";
        const userId = window.userId || "";

        if (plan.onRequest) {
          // Forfait Entreprise — contact par e-mail
          const subject = encodeURIComponent("Demande de forfait Entreprise — Wikimind");
          const body = encodeURIComponent(
            `Bonjour,\n\nJe souhaite obtenir plus d'informations sur le forfait Entreprise de Wikimind (forfait sur mesure).\n\n` +
            (userEmail ? `Mon adresse de compte Wikimind : ${userEmail}\n` : "") +
            (userId ? `Mon identifiant Wikimind : ${userId}\n` : "") +
            `\nMerci !`
          );
          submitForfaitRequest(plan, userId, userEmail);
          window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
          return;
        }

        // ── Plus / Pro : pas de paiement — demande envoyée pour upgrade manuel ──
        if (!userId) {
          if (window.toast) window.toast("Connecte-toi pour demander ce forfait");
          return;
        }

        submitForfaitRequest(plan, userId, userEmail);

        const subject = encodeURIComponent(`Demande de forfait ${plan.name} — Wikimind`);
        const body = encodeURIComponent(
          `Bonjour,\n\nJe souhaite passer au forfait ${plan.name} sur Wikimind.\n\n` +
          (userEmail ? `Mon adresse de compte Wikimind : ${userEmail}\n` : "") +
          (userId ? `Mon identifiant Wikimind (UID) : ${userId}\n` : "") +
          `\nMerci !`
        );
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

        if (window.toast) window.toast("Demande envoyée — vous recevrez une réponse par e-mail");
        close();
      });
    });
  }

  // ── Enregistrer la demande de forfait dans Firebase pour suivi admin ──────
  function submitForfaitRequest(plan, userId, userEmail) {
    try {
      if (!window.db || !window._firebaseRef || !window._firebaseSet || !userId) return;
      const reqRef = window._firebaseRef(window.db, `forfait_requests/${userId}`);
      window._firebaseSet(reqRef, {
        uid: userId,
        email: userEmail || "",
        requestedForfait: plan.forfait,
        requestedPlanName: plan.name,
        currentForfait: getCurrentForfait(),
        status: "pending",
        ts: Date.now()
      });
    } catch (e) {
      console.warn("[Wikimind Forfait] Échec enregistrement de la demande :", e);
    }
  }

  function bindEvents() {
    document.getElementById("fp-close").addEventListener("click", close);
    document.getElementById("forfait-overlay").addEventListener("click", (e) => {
      if (e.target.id === "forfait-overlay") close();
    });

    // Toggle
    const toggleSwitch = document.getElementById("fp-toggle-switch");
    const optMonthly = document.getElementById("fp-opt-monthly");
    const optAnnual = document.getElementById("fp-opt-annual");
    toggleSwitch.addEventListener("click", () => updatePrices(!isAnnual));
    optMonthly.addEventListener("click", () => updatePrices(false));
    optAnnual.addEventListener("click", () => updatePrices(true));

    bindCtaEvents();

    // Échap
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.getElementById("forfait-panel").classList.contains("open")) {
        close();
      }
    });
  }

  // ── Brancher sur le bouton pp-upgrade ────────────────────────────────────
  function hookUpgradeButton() {
    const btn = document.getElementById("pp-upgrade");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const profilePopup = document.getElementById("profile-popup");
      if (profilePopup) profilePopup.classList.remove("open");
      open();
    });

    // Aussi depuis les settings
    const stgUpgrade = document.getElementById("stg-account-plan");
    if (stgUpgrade) {
      stgUpgrade.style.cursor = "pointer";
      stgUpgrade.addEventListener("click", open);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    injectCSS();
    buildPanel();
    bindEvents();
    hookUpgradeButton();
  }

  // Exposer pour usage externe si besoin
  window.WMForfait = { open, close, PLANS, getCurrentForfait };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
