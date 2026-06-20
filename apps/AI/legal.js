/* ══════════════════════════════════════════════
   LEGAL — Wikimind CGU & Transparence des données
   Popup plein écran
   ══════════════════════════════════════════════ */

(function () {

  // ── Injection CSS ────────────────────────────────────────────────────────
  function injectCSS() {
    if (!document.querySelector('link[href="legal.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "legal.css";
      document.head.appendChild(link);
    }
  }

  // ── Build HTML ───────────────────────────────────────────────────────────
  function buildPanel() {
    if (document.getElementById('legal-overlay')) return;

    const overlay = document.createElement("div");
    overlay.id = "legal-overlay";
    overlay.innerHTML = `
      <div id="legal-panel">
        <div id="legal-topbar">
          <div id="legal-topbar-left">
            <span id="legal-topbar-logo">Wikimind</span>
            <div id="legal-topbar-sep"></div>
            <span id="legal-topbar-title">Conditions & Transparence</span>
          </div>
          <button id="legal-close" title="Fermer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div id="legal-body">
          <div id="legal-content">
            <div id="legal-hero">
              <div id="legal-hero-eyebrow">
                <span></span>
                Légal & Confidentialité
                <span></span>
              </div>
              <h1 id="legal-hero-title">Conditions d'utilisation<br>& transparence des données</h1>
              <p id="legal-hero-sub">Tout ce que vous devez savoir sur l'utilisation de Wikimind : les règles de la plateforme, la modération automatique, et exactement quelles données nous collectons — sans rien caché.</p>
            </div>

            <div id="legal-tabs">
              <button class="legal-tab active" data-tab="cgu">Conditions d'utilisation</button>
              <button class="legal-tab" data-tab="moderation">Modération & Sécurité</button>
              <button class="legal-tab" data-tab="data">Données collectées</button>
              <button class="legal-tab" data-tab="rights">Vos droits</button>
            </div>

            <!-- CGU -->
            <div class="legal-section active" data-section="cgu">
              <div class="legal-block">
                <h3>Acceptation des conditions</h3>
                <p>En utilisant Wikimind, vous acceptez les présentes conditions d'utilisation. Wikimind est une plateforme d'intelligence artificielle conversationnelle proposant un accès à différents modèles de langage, génération d'images et de vidéos, et divers outils pédagogiques.</p>
              </div>
              <div class="legal-block">
                <h3>Utilisation acceptable</h3>
                <p>Wikimind doit être utilisé de manière responsable et légale. Sont strictement interdits :</p>
                <ul>
                  <li><strong>Contenu sexuel ou à caractère pornographique</strong>, y compris la nudité non artistique et le contenu impliquant des mineurs sous quelque forme que ce soit.</li>
                  <li><strong>Apologie, promotion ou diffusion d'idéologies haineuses</strong> (nazisme, racisme, discrimination, extrémisme).</li>
                  <li><strong>Contenu violent, menaçant ou incitant à la haine</strong> envers des individus ou groupes.</li>
                  <li><strong>Activités illégales</strong> : fraude, piratage, création de contenus dangereux (armes, explosifs, substances illicites).</li>
                  <li><strong>Usurpation d'identité, harcèlement ou désinformation</strong> délibérée.</li>
                  <li><strong>Tentatives de contournement</strong> des systèmes de sécurité ou de modération de la plateforme.</li>
                </ul>
              </div>
              <div class="legal-block">
                <h3>Comptes et accès</h3>
                <p>La création d'un compte avec adresse e-mail nécessite une vérification par lien de confirmation. Les comptes non vérifiés voient leur accès suspendu jusqu'à validation. Wikimind se réserve le droit de suspendre temporairement ou définitivement tout compte en cas de non-respect de ces conditions.</p>
              </div>
              <div class="legal-block">
                <h3>Forfaits et Mind Tokens</h3>
                <p>Les forfaits payants (Plus, Pro) donnent accès à des fonctionnalités et quotas additionnels, incluant les Mind Tokens (monnaie virtuelle interne sans valeur monétaire réelle, non remboursable, utilisable uniquement sur la plateforme).</p>
              </div>
              <div class="legal-block">
                <h3>Limitation de responsabilité</h3>
                <p>Les réponses générées par l'IA peuvent contenir des erreurs ou inexactitudes. Wikimind ne garantit pas l'exactitude, l'exhaustivité ou la pertinence des contenus générés et ne saurait être tenu responsable des décisions prises sur leur base.</p>
              </div>
            </div>

            <!-- MODERATION -->
            <div class="legal-section" data-section="moderation">
              <div class="legal-block">
                <h3>Analyse automatique des messages</h3>
                <p>Chaque message envoyé sur Wikimind est analysé automatiquement par un modèle de modération IA (Mistral Moderation) afin de détecter les contenus potentiellement contraires à nos règles : contenu sexuel, haine et discrimination, violence et menaces, contenu dangereux ou criminel, automutilation, et autres catégories sensibles.</p>
              </div>
              <div class="legal-block">
                <h3>Que se passe-t-il si un message est signalé ?</h3>
                <p>Si un message est détecté comme potentiellement problématique :</p>
                <ul>
                  <li>Le message est <strong>placé dans une file de vérification humaine</strong> — il n'est ni supprimé ni bloqué automatiquement.</li>
                  <li>Une icône d'avertissement apparaît sur le message concerné pour vous informer qu'une vérification est en cours.</li>
                  <li>Un membre de l'équipe Wikimind examine le contenu signalé.</li>
                  <li>Si le contenu est jugé conforme, aucune action n'est prise et le signalement est classé.</li>
                  <li>Si le contenu enfreint réellement les règles, un avertissement par e-mail peut être envoyé, ou le compte peut faire l'objet d'une <strong>suspension temporaire</strong> selon la gravité.</li>
                </ul>
              </div>
              <div class="legal-block">
                <h3>Faux positifs</h3>
                <p>La détection automatique n'est pas infaillible. Un message tout à fait normal peut occasionnellement être signalé par erreur (faux positif). Dans ce cas, la vérification humaine confirmera qu'aucune action n'est nécessaire — vous n'avez rien à faire.</p>
              </div>
            </div>

            <!-- DATA -->
            <div class="legal-section" data-section="data">
              <div class="legal-block">
                <h3>Notre engagement de transparence</h3>
                <p>Voici, sans exception, l'ensemble des données personnelles et techniques que Wikimind collecte et la raison de leur collecte.</p>
              </div>

              <div class="legal-block">
                <h3>Compte utilisateur</h3>
                <div class="legal-data-table">
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill req">Requis</span><br>Adresse e-mail</div>
                    <div class="legal-data-val">Authentification, vérification de compte, communication en cas de signalement de modération.</div>
                  </div>
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill opt">Optionnel</span><br>Nom affiché</div>
                    <div class="legal-data-val">Personnalisation de l'interface (affiché uniquement à vous).</div>
                  </div>
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill req">Requis</span><br>Identifiant unique (UID)</div>
                    <div class="legal-data-val">Identifiant technique généré par Firebase, sert de clé pour toutes vos données.</div>
                  </div>
                </div>
              </div>

              <div class="legal-block">
                <h3>Conversations & messages</h3>
                <div class="legal-data-table">
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill req">Requis</span><br>Contenu des messages</div>
                    <div class="legal-data-val">Stocké de manière privée et liée à votre compte uniquement, pour conserver l'historique de vos conversations. Jamais partagé publiquement sauf via la fonction "Partager" explicite.</div>
                  </div>
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill req">Requis</span><br>Horodatage, modèle utilisé</div>
                    <div class="legal-data-val">Affichage de l'historique et statistiques personnelles.</div>
                  </div>
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill opt">Optionnel</span><br>Réactions (j'aime / j'aime pas)</div>
                    <div class="legal-data-val">Amélioration de la qualité des réponses.</div>
                  </div>
                </div>
              </div>

              <div class="legal-block">
                <h3>Statistiques publiques (anonymes)</h3>
                <div class="legal-data-table">
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill req">Toujours actif</span><br>Modèle, temps de réponse, longueur</div>
                    <div class="legal-data-val">Statistiques publiques anonymisées (modèle utilisé, vitesse de réponse, heure). Aucun contenu de message n'est inclus. Collecté même sans compte (utilisateurs invités) via un identifiant anonyme local.</div>
                  </div>
                </div>
              </div>

              <div class="legal-block">
                <h3>Modération automatique</h3>
                <div class="legal-data-table">
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill req">Si signalé</span><br>Contenu du message signalé</div>
                    <div class="legal-data-val">Conservé temporairement dans une file de vérification accessible uniquement par les administrateurs, jusqu'à traitement humain.</div>
                  </div>
                  <div class="legal-data-row">
                    <div class="legal-data-key"><span class="legal-pill req">Si signalé</span><br>Catégorie & score de détection</div>
                    <div class="legal-data-val">Permet aux modérateurs de comprendre pourquoi le message a été signalé.</div>
                  </div>
                </div>
              </div>

              <div class="legal-block">
                <h3>Services tiers utilisés</h3>
                <ul>
                  <li><strong>Firebase (Google)</strong> — authentification, base de données, stockage.</li>
                  <li><strong>Mistral AI</strong> — génération de texte et modération automatique.</li>
                  <li><strong>Groq, Cerebras</strong> — génération de texte (modèles alternatifs).</li>
                  <li><strong>Pollinations AI</strong> — génération d'images et de vidéos.</li>
                </ul>
                <p>Le contenu de vos messages peut être transmis à ces fournisseurs uniquement pour générer une réponse — ils ne sont pas utilisés pour vous identifier personnellement par Wikimind au-delà de cet usage technique.</p>
              </div>
            </div>

            <!-- RIGHTS -->
            <div class="legal-section" data-section="rights">
              <div class="legal-block">
                <h3>Accès et suppression de vos données</h3>
                <p>Vous pouvez à tout moment consulter l'intégralité de vos conversations depuis l'historique de Wikimind. La suppression d'une conversation est définitive et immédiate.</p>
              </div>
              <div class="legal-block">
                <h3>Suppression de compte</h3>
                <p>La suppression de votre compte entraîne la suppression de l'ensemble de vos données personnelles (conversations, paramètres, historique) associées à votre identifiant utilisateur, à l'exception des statistiques publiques anonymes qui ne contiennent aucune information identifiante.</p>
              </div>
              <div class="legal-block">
                <h3>Contact</h3>
                <p>Pour toute question concernant vos données personnelles, une demande de suppression manuelle, ou pour contester une décision de modération, vous pouvez contacter l'équipe Wikimind via les paramètres de votre compte.</p>
              </div>
            </div>

            <div id="legal-footer-note">
              Wikimind — Plateforme d'intelligence artificielle. Ces conditions peuvent être mises à jour ; les changements significatifs vous seront signalés. <a id="legal-back-top">Retour en haut ↑</a>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // ── Ouvrir / Fermer ──────────────────────────────────────────────────────
  function open(tab) {
    buildPanel();
    bindEvents();
    if (tab) selectTab(tab);
    document.getElementById('legal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    const overlay = document.getElementById('legal-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function selectTab(tabName) {
    document.querySelectorAll('.legal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.legal-section').forEach(s => s.classList.toggle('active', s.dataset.section === tabName));
    const body = document.getElementById('legal-body');
    if (body) body.scrollTop = 0;
  }

  // ── Events ───────────────────────────────────────────────────────────────
  let _bound = false;
  function bindEvents() {
    if (_bound) return;
    _bound = true;

    document.getElementById('legal-close').addEventListener('click', close);

    document.querySelectorAll('.legal-tab').forEach(tab => {
      tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    });

    document.getElementById('legal-back-top')?.addEventListener('click', () => {
      const body = document.getElementById('legal-body');
      if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('legal-overlay');
        if (overlay && overlay.classList.contains('open')) close();
      }
    });
  }

  // ── Exposer ───────────────────────────────────────────────────────────────
  window.WMLegal = { open, close, selectTab };

  injectCSS();

})();
