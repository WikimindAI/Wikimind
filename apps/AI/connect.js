/**
 * connect.js — Wikimind AI Login Page
 * Gère : affichage instantané si non connecté, masquage si connecté,
 * connexion Google / Microsoft / Facebook / GitHub / Email (auto détection login vs inscription),
 * collecte du profil utilisateur (prénom, nom, profession),
 * popups Tarification + Légal.
 *
 * UTILISATION dans index.html :
 *   <link rel="stylesheet" href="connect.css">
 *   <script src="connect.js" defer></script>
 *
 * Le script attend que window.auth et window.db soient exposés par le module
 * Firebase principal (index.html). Si Firebase n'est pas encore prêt au
 * moment où connect.js s'exécute, il patiente via un polling léger.
 */

(function () {
  'use strict';

  // ── CONFIG ─────────────────────────────────────────────────────────────
  const CONTACT_EMAIL = 'wikimind.ai@gmail.com';
  const DB_PATH_PREFIX = 'wikimind5/users';

  // ── PROFESSIONS ────────────────────────────────────────────────────────
  const PROFESSIONS = [
    { value: '', label: 'Votre situation — sélectionnez' },
    { value: 'etudiant_lycee', label: '🎓 Lycéen(ne)' },
    { value: 'etudiant_universite', label: '🎓 Étudiant(e) universitaire' },
    { value: 'etudiant_ingenieur', label: '🎓 Étudiant(e) ingénieur' },
    { value: 'sans_emploi', label: '🔍 Sans emploi' },
    { value: 'auto_entrepreneur', label: '💼 Auto-entrepreneur' },
    { value: 'ingenieur', label: '⚙️ Ingénieur(e)' },
    { value: 'developpeur', label: '💻 Développeur(se)' },
    { value: 'data_scientist', label: '📊 Data Scientist / IA' },
    { value: 'medecin', label: '🩺 Médecin / Professionnel santé' },
    { value: 'juriste', label: '⚖️ Juriste / Avocat(e)' },
    { value: 'enseignant', label: '📚 Enseignant(e) / Formateur' },
    { value: 'chercheur', label: '🔬 Chercheur(se) / Scientifique' },
    { value: 'designer', label: '🎨 Designer / Créatif' },
    { value: 'marketeur', label: '📣 Marketing / Communication' },
    { value: 'entrepreneur', label: '🚀 Entrepreneur / Fondateur' },
    { value: 'manager', label: '🏢 Manager / Cadre' },
    { value: 'comptable', label: '🧮 Comptable / Finance' },
    { value: 'artisan', label: '🔨 Artisan / Technicien' },
    { value: 'retraite', label: '🏖️ Retraité(e)' },
    { value: 'autre', label: '✨ Autre' },
  ];

  // ── HTML ────────────────────────────────────────────────────────────────
  const HTML = `
<div id="cn-topbar">
  <a id="cn-logo" href="#">
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#wm-grad)"/>
      <path d="M9 16c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="16" cy="16" r="2.5" fill="#fff"/>
      <defs>
        <linearGradient id="wm-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stop-color="#6e6eff"/>
          <stop offset="1" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
    </svg>
    Wikimind
  </a>
  <nav id="cn-topbar-nav">
    <button class="cn-nav-btn" id="cn-btn-tarif">Tarification</button>
    <button class="cn-nav-btn" id="cn-btn-legal">Légal & Confidentialité</button>
    <a class="cn-nav-btn" id="cn-topbar-contact" href="mailto:${CONTACT_EMAIL}">Contacter Wikimind</a>
  </nav>
</div>

<div id="cn-page">
  <!-- ── CENTERED FORM ── -->
  <div id="cn-left">
    <div id="cn-brand">
      <h1>Pensez plus vite,<br>apprenez mieux</h1>
      <p>Wikimind AI — votre assistant intelligent pour étudier, créer et explorer.</p>
    </div>

    <div id="cn-card">
      <!-- Social -->
      <div id="cn-social-row">
        <button class="cn-social-btn" id="cn-btn-google">
          <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </button>
        <button class="cn-social-btn" id="cn-btn-microsoft">
          <svg viewBox="0 0 24 24"><rect x="1" y="1" width="10.5" height="10.5" fill="#F25022"/><rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00"/><rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF"/><rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/></svg>
          Microsoft
        </button>
        <button class="cn-social-btn" id="cn-btn-facebook">
          <svg viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6c.86 0 1.65.08 1.88.12v2.18h-1.29c-1.02 0-1.22.48-1.22 1.2V12h2.5l-.4 3h-2.1v6.8C18.56 20.87 22 16.84 22 12z" fill="#1877F2"/></svg>
          Facebook
        </button>
        <button class="cn-social-btn" id="cn-btn-github">
          <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
          GitHub
        </button>
      </div>

      <div class="cn-sep"><span>ou continuer avec l'e-mail</span></div>

      <!-- Step 1: Email -->
      <div id="cn-step-email">
        <div id="cn-email-row">
          <input class="cn-input" id="cn-email" type="email" placeholder="Votre adresse e-mail" autocomplete="email">
          <button id="cn-email-go">Continuer</button>
        </div>
      </div>

      <!-- Step 2: Password -->
      <div id="cn-step-pass">
        <div class="cn-step-header">
          <button class="cn-step-back" id="cn-back-pass" title="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="cn-step-label">Connectez-vous en tant que <strong id="cn-step-email-label"></strong></span>
        </div>
        <input class="cn-input" id="cn-pass" type="password" placeholder="Mot de passe" autocomplete="current-password">
        <div id="cn-err"></div>
        <button class="cn-submit-btn" id="cn-pass-submit">Se connecter</button>
      </div>

      <!-- Step 3: New account profile -->
      <div id="cn-step-profile">
        <div class="cn-step-header">
          <button class="cn-step-back" id="cn-back-profile" title="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="cn-step-label">Créer votre compte</span>
        </div>
        <div id="cn-profile-grid">
          <input class="cn-input" id="cn-firstname" type="text" placeholder="Prénom" autocomplete="given-name">
          <input class="cn-input" id="cn-lastname" type="text" placeholder="Nom" autocomplete="family-name">
        </div>
        <select class="cn-input" id="cn-profession">${PROFESSIONS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}</select>
        <input class="cn-input" id="cn-pass-new" type="password" placeholder="Choisir un mot de passe (6+ caractères)" autocomplete="new-password">
        <div id="cn-err-profile"></div>
        <button class="cn-submit-btn" id="cn-profile-submit">Créer mon compte</button>
      </div>

      <p id="cn-legal">En continuant, vous acceptez la <a id="cn-legal-cgu-link">Politique de confidentialité</a> et les <a id="cn-legal-cgu2-link">Conditions d'utilisation</a> de Wikimind.</p>
    </div>
  </div>
</div>

<!-- ── FORFAIT POPUP ── -->
<div id="cn-forfait-overlay">
  <div id="cn-forfait-box">
    <h2>Tarification</h2>
    <p>Choisissez le forfait adapté à vos besoins. Passez à niveau à tout moment.</p>
    <div class="cn-plans-grid">
      <div class="cn-plan-card">
        <div class="cn-plan-name">Free</div>
        <div class="cn-plan-price">0 €<span> / mois</span></div>
        <ul class="cn-plan-features">
          <li>Modèles Small & Medium</li>
          <li>50 messages / jour</li>
          <li>Flashcards & Quiz</li>
          <li>Historique 30 jours</li>
        </ul>
        <button class="cn-plan-btn" onclick="document.getElementById('cn-forfait-overlay').classList.remove('open')">Commencer gratis</button>
      </div>
      <div class="cn-plan-card popular">
        <div class="cn-plan-badge">POPULAIRE</div>
        <div class="cn-plan-name">Plus</div>
        <div class="cn-plan-price">9 €<span> / mois</span></div>
        <ul class="cn-plan-features">
          <li>Tous les modèles</li>
          <li>500 messages / jour</li>
          <li>Connecteurs Google</li>
          <li>Historique illimité</li>
          <li>Génération d'images</li>
        </ul>
        <button class="cn-plan-btn" onclick="window.location.href='mailto:${CONTACT_EMAIL}?subject=Demande forfait Plus'">Passer à Plus</button>
      </div>
      <div class="cn-plan-card">
        <div class="cn-plan-name">Pro</div>
        <div class="cn-plan-price">24 €<span> / mois</span></div>
        <ul class="cn-plan-features">
          <li>Accès prioritaire</li>
          <li>Messages illimités</li>
          <li>Tous les connecteurs</li>
          <li>API BYOK avancée</li>
          <li>Support dédié</li>
        </ul>
        <button class="cn-plan-btn" onclick="window.location.href='mailto:${CONTACT_EMAIL}?subject=Demande forfait Pro'">Passer à Pro</button>
      </div>
      <div class="cn-plan-card">
        <div class="cn-plan-name">Entreprise</div>
        <div class="cn-plan-price">Sur devis</div>
        <ul class="cn-plan-features">
          <li>Déploiement privé</li>
          <li>SSO & sécurité avancée</li>
          <li>Formation équipes</li>
          <li>SLA garanti</li>
          <li>Intégrations sur mesure</li>
        </ul>
        <button class="cn-plan-btn" onclick="window.location.href='mailto:${CONTACT_EMAIL}?subject=Demande forfait Entreprise'">Nous contacter</button>
      </div>
    </div>
    <button id="cn-forfait-close">Fermer</button>
  </div>
</div>

<!-- ── LEGAL POPUP ── -->
<div id="cn-legal-overlay">
  <div id="cn-legal-box">
    <h2>Mentions légales & Confidentialité</h2>
    <button id="cn-legal-close">✕</button>
    <div class="cn-legal-tabs">
      <button class="cn-legal-tab active" data-tab="privacy">Confidentialité</button>
      <button class="cn-legal-tab" data-tab="cgu">Conditions</button>
      <button class="cn-legal-tab" data-tab="cookies">Cookies</button>
      <button class="cn-legal-tab" data-tab="mentions">Mentions légales</button>
    </div>
    <div class="cn-legal-content active" id="cn-tab-privacy">
      <h3>Collecte des données</h3>
      <p>Wikimind collecte uniquement les données nécessaires au fonctionnement du service : adresse e-mail, nom d'affichage, profession et historique de conversations. Ces données sont stockées de manière sécurisée sur Firebase (Google Cloud, serveurs en Europe).</p>
      <h3>Utilisation</h3>
      <p>Vos données ne sont jamais vendues à des tiers. Elles sont utilisées exclusivement pour personnaliser votre expérience, améliorer le service et assurer la sécurité de la plateforme.</p>
      <h3>Vos droits (RGPD)</h3>
      <ul>
        <li>Droit d'accès à vos données personnelles</li>
        <li>Droit de rectification et de suppression</li>
        <li>Droit à la portabilité des données</li>
        <li>Droit d'opposition au traitement</li>
      </ul>
      <p>Pour exercer vos droits, contactez-nous : <a href="mailto:${CONTACT_EMAIL}" style="color:#a0a0ff">${CONTACT_EMAIL}</a></p>
      <h3>Conservation</h3>
      <p>Les données sont conservées pendant la durée de vie du compte. À la suppression du compte, toutes les données sont effacées dans un délai de 30 jours.</p>
    </div>
    <div class="cn-legal-content" id="cn-tab-cgu">
      <h3>Acceptation des conditions</h3>
      <p>En utilisant Wikimind, vous acceptez les présentes conditions d'utilisation. L'accès au service est réservé aux personnes de 13 ans et plus.</p>
      <h3>Usage acceptable</h3>
      <ul>
        <li>Usage personnel, éducatif et professionnel autorisé</li>
        <li>Interdiction de générer du contenu illégal ou nuisible</li>
        <li>Pas de tentative de contournement des systèmes de modération</li>
        <li>Respect des droits d'auteur et de la propriété intellectuelle</li>
      </ul>
      <h3>Propriété intellectuelle</h3>
      <p>Le contenu généré par l'IA vous appartient. La marque Wikimind, son logo et ses interfaces sont protégés.</p>
      <h3>Limitation de responsabilité</h3>
      <p>Wikimind est un outil d'assistance. Les réponses de l'IA ne constituent pas des conseils médicaux, juridiques ou financiers professionnels. Vérifiez toujours les informations critiques auprès de professionnels qualifiés.</p>
    </div>
    <div class="cn-legal-content" id="cn-tab-cookies">
      <h3>Cookies essentiels</h3>
      <p>Wikimind utilise uniquement des cookies essentiels au fonctionnement du service : authentification Firebase, préférences utilisateur et état de session. Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>
      <h3>Stockage local</h3>
      <p>Certaines préférences (modèle sélectionné, connecteurs actifs, thème) sont stockées dans le localStorage de votre navigateur pour améliorer votre expérience. Ces données restent sur votre appareil.</p>
    </div>
    <div class="cn-legal-content" id="cn-tab-mentions">
      <h3>Éditeur</h3>
      <p>Wikimind AI est un projet indépendant. Pour tout contact : <a href="mailto:${CONTACT_EMAIL}" style="color:#a0a0ff">${CONTACT_EMAIL}</a></p>
      <h3>Hébergement</h3>
      <p>Le service est hébergé sur Firebase / Google Cloud Platform, serveurs situés en Europe (europe-west1).</p>
      <h3>Technologies</h3>
      <p>Wikimind utilise des modèles d'IA de Mistral AI, Meta (Llama), et d'autres fournisseurs. Les modèles sont accessibles via des API sécurisées. Wikimind n'entraîne pas ses propres modèles avec vos données.</p>
    </div>
  </div>
</div>
`;

  // ── STATE ───────────────────────────────────────────────────────────────
  let _step = 'email';
  let _emailVal = '';
  let _mounted = false;
  let _authReady = false;

  // ── WAIT FOR FIREBASE ────────────────────────────────────────────────────
  function waitForAuth(cb) {
    if (window.auth) { cb(window.auth); return; }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (window.auth) { clearInterval(iv); cb(window.auth); }
      else if (tries > 100) { clearInterval(iv); mount(); } // fallback: show anyway
    }, 80);
  }

  // ── MOUNT ────────────────────────────────────────────────────────────────
  function mount() {
    if (_mounted) return;
    _mounted = true;

    const root = document.createElement('div');
    root.id = 'cn-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0a0a0a;overflow:hidden;';
    root.innerHTML = HTML;
    document.body.appendChild(root);

    bindEvents();
  }

  // ── INIT ─────────────────────────────────────────────────────────────────
  function init() {
    // Check auth ASAP — if Firebase exposes onAuthStateChanged
    waitForAuth(function (auth) {
      // If there's already a cached user (very fast check)
      if (auth.currentUser) {
        // user already logged in — don't show page
        return;
      }
      // Listen for auth state
      const { onAuthStateChanged } = window._fbAuthFns || {};
      if (onAuthStateChanged) {
        onAuthStateChanged(auth, function (user) {
          if (user && _mounted) {
            // User just signed in through connect page — unmount
            unmount();
          } else if (!user && !_mounted) {
            mount();
          }
        });
      }
      // Also mount immediately if not logged in
      if (!auth.currentUser) mount();
    });
  }

  function unmount() {
    const root = document.getElementById('cn-root');
    if (root) {
      root.style.transition = 'opacity 0.3s';
      root.style.opacity = '0';
      setTimeout(() => root.remove(), 320);
    }
  }

  // ── BIND EVENTS ─────────────────────────────────────────────────────────
  function bindEvents() {
    const $ = id => document.getElementById(id);

    // Topbar
    $('cn-btn-tarif').onclick = () => $('cn-forfait-overlay').classList.add('open');
    $('cn-btn-legal').onclick = () => openLegal('privacy');
    $('cn-legal-cgu-link').onclick = () => openLegal('privacy');
    $('cn-legal-cgu2-link').onclick = () => openLegal('cgu');
    $('cn-forfait-close').onclick = () => $('cn-forfait-overlay').classList.remove('open');
    $('cn-legal-close').onclick = () => $('cn-legal-overlay').classList.remove('open');

    // Legal tabs
    document.querySelectorAll('.cn-legal-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.cn-legal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cn-legal-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        $('cn-tab-' + tab.dataset.tab).classList.add('active');
      };
    });

    // Close overlays on backdrop click
    $('cn-forfait-overlay').onclick = e => { if (e.target === $('cn-forfait-overlay')) $('cn-forfait-overlay').classList.remove('open'); };
    $('cn-legal-overlay').onclick = e => { if (e.target === $('cn-legal-overlay')) $('cn-legal-overlay').classList.remove('open'); };

    // Social auth
    $('cn-btn-google').onclick = () => socialAuth('google');
    $('cn-btn-microsoft').onclick = () => socialAuth('microsoft');
    $('cn-btn-facebook').onclick = () => socialAuth('facebook');
    $('cn-btn-github').onclick = () => socialAuth('github');

    // Email step
    const emailInput = $('cn-email');
    emailInput.onkeydown = e => { if (e.key === 'Enter') stepEmail(); };
    $('cn-email-go').onclick = stepEmail;

    // Password step
    $('cn-back-pass').onclick = () => showStep('email');
    $('cn-pass').onkeydown = e => { if (e.key === 'Enter') submitPass(); };
    $('cn-pass-submit').onclick = submitPass;

    // Profile step
    $('cn-back-profile').onclick = () => showStep('email');
    $('cn-profile-submit').onclick = submitProfile;
    $('cn-pass-new').onkeydown = e => { if (e.key === 'Enter') submitProfile(); };
  }

  // ── STEP NAVIGATION ──────────────────────────────────────────────────────
  function showStep(step) {
    _step = step;
    const $ = id => document.getElementById(id);
    $('cn-step-email').style.display = step === 'email' ? '' : 'none';

    const pass = $('cn-step-pass');
    const prof = $('cn-step-profile');
    pass.classList.toggle('active', step === 'pass');
    prof.classList.toggle('active', step === 'profile');

    if (step === 'pass') {
      $('cn-step-email-label').textContent = _emailVal;
      setTimeout(() => $('cn-pass').focus(), 50);
    }
    if (step === 'profile') {
      setTimeout(() => $('cn-firstname').focus(), 50);
    }
    setErr('');
    setErrProfile('');
  }

  // ── EMAIL STEP ──────────────────────────────────────────────────────────
  async function stepEmail() {
    const emailInput = document.getElementById('cn-email');
    const email = emailInput.value.trim();
    if (!validateEmail(email)) { emailInput.style.borderColor = '#ff5555'; return; }
    emailInput.style.borderColor = '';
    _emailVal = email;

    const btn = document.getElementById('cn-email-go');
    btn.disabled = true;
    btn.innerHTML = '<span class="cn-spinner"></span>';

    try {
      const { fetchSignInMethodsForEmail } = await getFirebaseFns();
      // [] = nouveau compte  /  ['password'] ou ['google.com'] = compte existant
      const methods = await fetchSignInMethodsForEmail(window.auth, email);
      if (methods && methods.length > 0) {
        // Compte existant → demander le mot de passe
        showStep('pass');
      } else {
        // Nouveau compte → collecte du profil
        showStep('profile');
      }
    } catch (err) {
      // Erreur réseau : fallback mot de passe
      showStep('pass');
    }

    btn.disabled = false;
    btn.textContent = 'Continuer';
  }

  // ── PASSWORD (LOGIN) ────────────────────────────────────────────────────
  async function submitPass() {
    const pass = document.getElementById('cn-pass').value;
    if (!pass) return;

    const btn = document.getElementById('cn-pass-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="cn-spinner" style="border-top-color:#000"></span>';

    try {
      const { signInWithEmailAndPassword } = await getFirebaseFns();
      await signInWithEmailAndPassword(window.auth, _emailVal, pass);
      // onAuthStateChanged in index.html will hide the overlay
      unmount();
    } catch (e) {
      setErr(friendlyError(e.code));
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  }

  // ── PROFILE (REGISTER) ──────────────────────────────────────────────────
  async function submitProfile() {
    const $ = id => document.getElementById(id);
    const firstname = $('cn-firstname').value.trim();
    const lastname = $('cn-lastname').value.trim();
    const profession = $('cn-profession').value;
    const pass = $('cn-pass-new').value;

    if (!firstname) { setErrProfile('Veuillez entrer votre prénom.'); return; }
    if (!pass || pass.length < 6) { setErrProfile('Le mot de passe doit contenir au moins 6 caractères.'); return; }

    const btn = $('cn-profile-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="cn-spinner" style="border-top-color:#000"></span>';

    try {
      const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, set, ref } = await getFirebaseFns();
      const cred = await createUserWithEmailAndPassword(window.auth, _emailVal, pass);
      const displayName = (firstname + ' ' + lastname).trim();
      await updateProfile(cred.user, { displayName });

      // Save profile to Firebase
      if (window.db && set && ref) {
        const uid = cred.user.uid;
        await set(ref(window.db, `${DB_PATH_PREFIX}/${uid}/profile`), {
          firstname,
          lastname,
          displayName,
          profession: profession || 'non_renseigne',
          email: _emailVal,
          createdAt: Date.now()
        });
      }

      await sendEmailVerification(cred.user);
      unmount();
      // index.html handles the verify screen
    } catch (e) {
      setErrProfile(friendlyError(e.code));
      btn.disabled = false;
      btn.textContent = 'Créer mon compte';
    }
  }

  // ── SOCIAL AUTH ─────────────────────────────────────────────────────────
  async function socialAuth(provider) {
    try {
      const fns = await getFirebaseFns();
      const auth = window.auth;
      let result;
      if (provider === 'google') {
        const p = new fns.GoogleAuthProvider();
        result = await fns.signInWithPopup(auth, p);
      } else if (provider === 'microsoft') {
        const p = new fns.OAuthProvider('microsoft.com');
        result = await fns.signInWithPopup(auth, p);
      } else if (provider === 'facebook') {
        const p = new fns.FacebookAuthProvider();
        result = await fns.signInWithPopup(auth, p);
      } else if (provider === 'github') {
        const p = new fns.GithubAuthProvider();
        result = await fns.signInWithPopup(auth, p);
      }
      if (result) {
        // Save basic profile if first sign in
        const user = result.user;
        const isNew = result._tokenResponse?.isNewUser;
        if (isNew && window.db && fns.set && fns.ref) {
          const nameParts = (user.displayName || '').split(' ');
          await fns.set(fns.ref(window.db, `${DB_PATH_PREFIX}/${user.uid}/profile`), {
            firstname: nameParts[0] || '',
            lastname: nameParts.slice(1).join(' ') || '',
            displayName: user.displayName || '',
            profession: 'non_renseigne',
            email: user.email || '',
            createdAt: Date.now()
          });
        }
        unmount();
      }
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setErr(friendlyError(e.code));
      }
    }
  }

  // ── GET FIREBASE FUNCTIONS ───────────────────────────────────────────────
  // index.html exposes auth/db globally. We also try to grab named functions.
  async function getFirebaseFns() {
    // Try from global window (index.html exposes these)
    const fns = {
      signInWithEmailAndPassword: window._fbSignIn,
      createUserWithEmailAndPassword: window._fbCreateUser,
      updateProfile: window._fbUpdateProfile,
      sendEmailVerification: window._fbSendVerification,
      fetchSignInMethodsForEmail: window._fbFetchSignInMethods,
      GoogleAuthProvider: window._fbGoogleProvider,
      OAuthProvider: window._fbOAuthProvider,
      FacebookAuthProvider: window._fbFacebookProvider,
      GithubAuthProvider: window._fbGithubProvider,
      signInWithPopup: window._fbSignInPopup,
      set: window._firebaseSet,
      ref: window._firebaseRef,
    };

    // If not pre-exposed, dynamically import from Firebase CDN (same version)
    if (!fns.signInWithEmailAndPassword) {
      const authMod = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
      fns.signInWithEmailAndPassword = authMod.signInWithEmailAndPassword;
      fns.createUserWithEmailAndPassword = authMod.createUserWithEmailAndPassword;
      fns.updateProfile = authMod.updateProfile;
      fns.sendEmailVerification = authMod.sendEmailVerification;
      fns.fetchSignInMethodsForEmail = authMod.fetchSignInMethodsForEmail;
      fns.GoogleAuthProvider = authMod.GoogleAuthProvider;
      fns.OAuthProvider = authMod.OAuthProvider;
      fns.FacebookAuthProvider = authMod.FacebookAuthProvider;
      fns.GithubAuthProvider = authMod.GithubAuthProvider;
      fns.signInWithPopup = authMod.signInWithPopup;
    }
    if (!fns.set) {
      const dbMod = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js');
      fns.set = dbMod.set;
      fns.ref = dbMod.ref;
    }
    return fns;
  }

  // ── UTILS ────────────────────────────────────────────────────────────────
  function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  function setErr(msg) {
    const el = document.getElementById('cn-err');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }
  function setErrProfile(msg) {
    const el = document.getElementById('cn-err-profile');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function friendlyError(code) {
    const map = {
      'auth/invalid-email': 'Adresse e-mail invalide.',
      'auth/user-not-found': 'Aucun compte trouvé avec cet e-mail.',
      'auth/wrong-password': 'Mot de passe incorrect.',
      'auth/email-already-in-use': 'Cet e-mail est déjà utilisé.',
      'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
      'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
      'auth/popup-blocked': 'Popup bloquée par le navigateur. Autorisez les popups.',
    };
    return map[code] || 'Une erreur est survenue. Réessayez.';
  }

  function openLegal(tab) {
    document.getElementById('cn-legal-overlay').classList.add('open');
    document.querySelectorAll('.cn-legal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.cn-legal-content').forEach(c => c.classList.remove('active'));
    const tabEl = document.querySelector(`.cn-legal-tab[data-tab="${tab}"]`);
    if (tabEl) tabEl.classList.add('active');
    const contentEl = document.getElementById('cn-tab-' + tab);
    if (contentEl) contentEl.classList.add('active');
  }

  // ── BOOT ─────────────────────────────────────────────────────────────────
  // Expose Firebase auth functions so connect.js can use them even if the
  // main module hasn't run yet. index.html should add these to window:
  //   window._fbSignIn = signInWithEmailAndPassword;
  //   window._fbCreateUser = createUserWithEmailAndPassword;
  //   window._fbUpdateProfile = updateProfile;
  //   window._fbSendVerification = sendEmailVerification;
  //   window._fbGoogleProvider = GoogleAuthProvider;
  //   window._fbOAuthProvider = OAuthProvider;
  //   window._fbSignInPopup = signInWithPopup;
  //   window._fbAuthFns = { onAuthStateChanged };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
