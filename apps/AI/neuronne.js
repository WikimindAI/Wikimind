/* ============================================================
   NEURONNE.JS — Organisation neuronale de la conversation
   Wikimind — module autonome, ne modifie aucune fonction existante.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- ÉTAT GLOBAL ---------- */
  const NRN = {
    active: false,                 // mode activé/désactivé (bouton dans la barre d'écriture)
    savedNeurons: {},              // { convId: [neuron, ...] }  -> persistant (localStorage)
    forgottenNeurons: [],          // neurones de la session courante non sauvegardés (perdus au reload)
    selectedId: null,
    currentTab: "actuelle",        // "actuelle" | "oubliees"
    seenBubbles: new WeakSet(),    // bulles déjà transformées en neurones
    idCounter: 0,
    graphOffset: { x: 0, y: 0 },
    graphZoom: 1,
  };

  const STORE_KEY = "wm_neuronnes_v1";
  const ACTIVE_KEY = "wm_neuronnes_active";

  /* ---------- 30+ SUJETS AVEC MOTS-CLÉS ---------- */
  const TOPICS = [
    { id: "sciences", label: "Sciences", color: "#4d8fff", kws: ["physique","chimie","biologie","atome","énergie","expérience","gravité","cellule","molécule","science"] },
    { id: "mathematiques", label: "Mathématiques", color: "#6c5ce7", kws: ["équation","calcul","algèbre","géométrie","fonction","dérivée","intégrale","nombre","probabilité","matrice"] },
    { id: "informatique", label: "Informatique", color: "#00cec9", kws: ["code","programme","fonction","javascript","python","html","css","serveur","api","bug","algorithme","logiciel"] },
    { id: "ia", label: "Intelligence Artificielle", color: "#a29bfe", kws: ["ia","intelligence artificielle","modèle","réseau de neurones","machine learning","gpt","chatbot","llm"] },
    { id: "histoire", label: "Histoire", color: "#e17055", kws: ["guerre","empire","révolution","roi","siècle","historique","bataille","civilisation","moyen-âge"] },
    { id: "geographie", label: "Géographie", color: "#00b894", kws: ["pays","capitale","continent","carte","frontière","climat","montagne","fleuve","région"] },
    { id: "economie", label: "Économie", color: "#fdcb6e", kws: ["argent","marché","inflation","bourse","entreprise","investissement","salaire","budget","prix","économie"] },
    { id: "politique", label: "Politique", color: "#d63031", kws: ["gouvernement","élection","président","loi","parti","ministre","vote","état","politique"] },
    { id: "sante", label: "Santé", color: "#ff7675", kws: ["médecin","maladie","symptôme","traitement","santé","douleur","hôpital","médicament","vaccin"] },
    { id: "sport", label: "Sport", color: "#fab1a0", kws: ["football","match","entraînement","équipe","sport","course","musculation","tennis","basket"] },
    { id: "cuisine", label: "Cuisine", color: "#e84393", kws: ["recette","cuisine","ingrédient","plat","four","cuisson","repas","gâteau","sauce"] },
    { id: "voyage", label: "Voyage", color: "#0984e3", kws: ["voyage","vol","hôtel","vacances","visa","aéroport","destination","itinéraire","tourisme"] },
    { id: "education", label: "Éducation", color: "#00a8ff", kws: ["école","cours","étude","examen","université","apprendre","professeur","devoir","note"] },
    { id: "travail", label: "Travail / Carrière", color: "#636e72", kws: ["travail","emploi","carrière","entretien","cv","poste","salaire","patron","collègue"] },
    { id: "droit", label: "Droit / Juridique", color: "#2d3436", kws: ["loi","contrat","juridique","tribunal","avocat","droit","procès","réglementation"] },
    { id: "psychologie", label: "Psychologie", color: "#fd79a8", kws: ["émotion","stress","anxiété","psychologie","comportement","motivation","confiance","thérapie"] },
    { id: "relations", label: "Relations / Social", color: "#e66767", kws: ["ami","famille","couple","relation","amour","conflit","communication","social"] },
    { id: "art", label: "Art / Culture", color: "#a29bfe", kws: ["peinture","musique","film","art","artiste","culture","dessin","photographie","cinéma"] },
    { id: "litterature", label: "Littérature", color: "#786fa6", kws: ["livre","roman","auteur","poème","littérature","écrivain","histoire (récit)","personnage"] },
    { id: "technologie", label: "Technologie", color: "#00cec9", kws: ["smartphone","ordinateur","technologie","appareil","internet","réseau","innovation","gadget"] },
    { id: "environnement", label: "Environnement", color: "#00b894", kws: ["climat","écologie","pollution","environnement","énergie renouvelable","réchauffement","biodiversité"] },
    { id: "religion", label: "Religion / Spiritualité", color: "#b2947a", kws: ["religion","dieu","spiritualité","croyance","prière","foi","église"] },
    { id: "philosophie", label: "Philosophie", color: "#576574", kws: ["philosophie","pensée","éthique","morale","existence","conscience","raison"] },
    { id: "finance_perso", label: "Finance personnelle", color: "#fdcb6e", kws: ["épargne","budget personnel","dette","crédit","impôt","investir","banque"] },
    { id: "musique", label: "Musique", color: "#e84393", kws: ["chanson","musique","instrument","concert","album","artiste musical","guitare","piano"] },
    { id: "jeux_video", label: "Jeux vidéo", color: "#6c5ce7", kws: ["jeu vidéo","gaming","console","steam","niveau","personnage jouable","multijoueur"] },
    { id: "mode", label: "Mode / Style", color: "#e84393", kws: ["vêtement","mode","style","tendance","fashion","tenue"] },
    { id: "animaux", label: "Animaux", color: "#00b894", kws: ["animal","chien","chat","animaux","nature","espèce","faune"] },
    { id: "bricolage", label: "Bricolage / Maison", color: "#e17055", kws: ["bricolage","maison","rénovation","outil","construction","décoration"] },
    { id: "transport", label: "Transport", color: "#0984e3", kws: ["voiture","train","avion","transport","conduite","moto","essence"] },
    { id: "actualite", label: "Actualité", color: "#d63031", kws: ["actualité","news","information récente","événement","aujourd'hui"] },
    { id: "meteo", label: "Météo", color: "#74b9ff", kws: ["météo","température","pluie","soleil","neige","climat local"] },
    { id: "securite", label: "Sécurité / Vie privée", color: "#2d3436", kws: ["sécurité","mot de passe","piratage","vie privée","données","protection"] },
    { id: "general", label: "Général", color: "#7c5cff", kws: [] } // fallback
  ];

  /* ---------- TYPES DE NEURONES ---------- */
  const TYPES = {
    question:    { label: "Question",   color: "#4d8fff" },
    information: { label: "Information",color: "#00b894" },
    fichier:     { label: "Fichier",    color: "#fdcb6e" },
    reponse:     { label: "Réponse",    color: "#a29bfe" },
    definition:  { label: "Définition", color: "#00cec9" },
    tache:       { label: "Tâche",      color: "#ff7675" },
    code:        { label: "Code",       color: "#e17055" },
    erreur:      { label: "Erreur",     color: "#d63031" },
    emotion:     { label: "Émotion",    color: "#e84393" },
  };

  /* ---------- PERSISTENCE ---------- */
  function loadSaved() {
    try { NRN.savedNeurons = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch { NRN.savedNeurons = {}; }
    try { NRN.active = localStorage.getItem(ACTIVE_KEY) === "1"; }
    catch { NRN.active = false; }
  }
  function persistSaved() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(NRN.savedNeurons)); } catch {}
  }
  function persistActive() {
    try { localStorage.setItem(ACTIVE_KEY, NRN.active ? "1" : "0"); } catch {}
  }

  function getConvId() {
    return window.currentConvId || window._wmCurrentConvId || "session_" + (window._wmGuestSession || "default");
  }

  function currentList() {
    const id = getConvId();
    if (!NRN.savedNeurons[id]) NRN.savedNeurons[id] = [];
    return NRN.savedNeurons[id];
  }

  /* ---------- CLASSIFICATION ---------- */
  function detectTopic(text) {
    const low = (text || "").toLowerCase();
    let best = null, bestScore = 0;
    for (const t of TOPICS) {
      if (!t.kws.length) continue;
      let score = 0;
      for (const kw of t.kws) if (low.includes(kw)) score++;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return best || TOPICS[TOPICS.length - 1];
  }

  function detectType(role, text, hasFile) {
    const low = (text || "").toLowerCase();
    if (hasFile) return "fichier";
    if (role === "user") {
      if (/\?\s*$/.test(text.trim()) || /^(pourquoi|comment|quoi|qui|quand|où|est[- ]ce que|peux[- ]tu|est-il|combien)\b/i.test(text.trim())) return "question";
      if (/\b(fais|crée|génère|écris|corrige|ajoute|modifie|supprime)\b/i.test(low)) return "tache";
      if (/(je me sens|j'ai peur|je suis (triste|content|stressé|anxieux|heureux)|ça me stresse)/i.test(low)) return "emotion";
      return "information";
    }
    // role === ai
    if (/```/.test(text) || /\b(fonction|const |let |var |import |class )\b/.test(text)) return "code";
    if (/(erreur|désolé|je ne peux pas|impossible de)/i.test(low.slice(0, 120))) return "erreur";
    if (/(c'est|se définit|désigne|signifie|est un[e]? )/i.test(low.slice(0, 80))) return "definition";
    return "reponse";
  }

  function truncate(text, n) {
    if (!text) return "";
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
  }

  /* ---------- CRÉATION D'UN NEURONE ---------- */
  function createNeuron(role, rawText, hasFile) {
    const text = truncate(rawText, 400);
    const topic = detectTopic(rawText);
    const type = detectType(role, rawText || "", hasFile);
    const list = currentList();

    // Lien : chaîne conversationnelle (avec le neurone précédent de la même conv)
    const links = [];
    const pool = NRN.active ? list : NRN.forgottenNeurons;
    if (pool.length) links.push(pool[pool.length - 1].id);
    // + lien avec les 3 derniers neurones qui partagent le même sujet
    let shared = 0;
    for (let i = pool.length - 1; i >= 0 && shared < 2; i--) {
      if (pool[i].topicId === topic.id && !links.includes(pool[i].id)) { links.push(pool[i].id); shared++; }
    }

    const neuron = {
      id: "n" + (++NRN.idCounter) + "_" + Date.now().toString(36),
      role, type, text,
      topicId: topic.id, topicLabel: topic.label, topicColor: topic.color,
      ts: Date.now(),
      links,
    };
    return neuron;
  }

  function recordMessage(role, rawText, hasFile) {
    if (!rawText || !rawText.trim()) return;
    const neuron = createNeuron(role, rawText, hasFile);
    if (NRN.active) {
      currentList().push(neuron);
      persistSaved();
    } else {
      NRN.forgottenNeurons.push(neuron);
      // on limite la mémoire des oubliés pour éviter une fuite mémoire
      if (NRN.forgottenNeurons.length > 400) NRN.forgottenNeurons.shift();
    }
    updateViewBtn();
  }

  /* ---------- CAPTURE AUTOMATIQUE DES MESSAGES (MutationObserver) ---------- */
  function extractBubbleText(bubbleEl) {
    return (bubbleEl.innerText || bubbleEl.textContent || "").trim();
  }

  function initObserver() {
    const messagesEl = document.getElementById("messages");
    if (!messagesEl) { setTimeout(initObserver, 400); return; }

    const scan = (node) => {
      if (!(node instanceof HTMLElement)) return;
      const groups = node.matches?.(".msg-group") ? [node] : node.querySelectorAll?.(".msg-group") || [];
      groups.forEach((g) => {
        const userBubble = g.querySelector(".bubble.user");
        const aiBubble = g.querySelector(".bubble.ai");
        const hasFile = !!g.querySelector(".file-attachment");
        if (userBubble && !NRN.seenBubbles.has(userBubble)) {
          NRN.seenBubbles.add(userBubble);
          recordMessage("user", extractBubbleText(userBubble), hasFile);
        } else if (!userBubble && hasFile && g.classList.contains("msg-group") && !NRN.seenBubbles.has(g)) {
          NRN.seenBubbles.add(g);
          recordMessage("user", "[Fichier joint]", true);
        }
        if (aiBubble && !NRN.seenBubbles.has(aiBubble)) {
          // on attend un peu que le streaming soit terminé avant de capter le texte final
          let stableCount = 0, lastLen = -1;
          const check = () => {
            const len = (aiBubble.textContent || "").length;
            if (len === lastLen) {
              stableCount++;
              if (stableCount >= 2) {
                NRN.seenBubbles.add(aiBubble);
                recordMessage("ai", extractBubbleText(aiBubble), false);
                return;
              }
            } else { stableCount = 0; lastLen = len; }
            if (stableCount < 2) setTimeout(check, 700);
          };
          setTimeout(check, 700);
        }
      });
    };

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(scan);
      }
    });
    obs.observe(messagesEl, { childList: true, subtree: true });
    // scan initial (messages déjà présents au chargement)
    scan(messagesEl);
  }

  /* ---------- UI : BOUTON TOGGLE DANS LA BARRE D'ÉCRITURE ---------- */
  function injectToggleButton() {
    const row = document.querySelector("#input-row .input-row-left");
    if (!row) { setTimeout(injectToggleButton, 400); return; }
    if (document.getElementById("neuronne-toggle-btn")) return;

    const btn = document.createElement("button");
    btn.id = "neuronne-toggle-btn";
    btn.type = "button";
    btn.title = "Organisation neuronale : mémorise et relie les informations de la conversation";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="12" cy="13" r="2.6"/><circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="19" r="2.4"/>
        <path d="M8 7.3L10 11.5M16 7.3L14 11.5M10.5 15L7.5 17.3M13.5 15L16.5 17.3"/>
      </svg>
      <span class="nrn-dot"></span>
      <span>Neuronnes</span>
    `;
    btn.addEventListener("click", () => {
      NRN.active = !NRN.active;
      persistActive();
      btn.classList.toggle("active", NRN.active);
      if (window.toast) window.toast(NRN.active ? "Organisation neuronale activée ✦" : "Organisation neuronale désactivée");
      updateViewBtn();
    });
    // insérer avant le bouton "plus"
    const plusBtn = document.getElementById("plus-btn");
    if (plusBtn) row.insertBefore(btn, plusBtn); else row.appendChild(btn);
    btn.classList.toggle("active", NRN.active);
  }

  /* ---------- BOUTON FLOTTANT POUR OUVRIR LA VUE ---------- */
  function injectViewButton() {
    if (document.getElementById("neuronne-view-btn")) return;
    const btn = document.createElement("button");
    btn.id = "neuronne-view-btn";
    btn.title = "Voir les neuronnes de la conversation";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="12" r="2.2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
        <path d="M7.7 7.3L10.4 10.8M16.3 7.3L13.6 10.8M10.4 13.2L7.7 16.7M13.6 13.2L16.3 16.7"/>
      </svg>
      <span class="nrn-count" style="display:none">0</span>
    `;
    btn.addEventListener("click", openPanel);
    document.body.appendChild(btn);
    updateViewBtn();
  }

  function updateViewBtn() {
    const btn = document.getElementById("neuronne-view-btn");
    if (!btn) return;
    const total = currentList().length + NRN.forgottenNeurons.length;
    btn.classList.toggle("show", total > 0);
    const countEl = btn.querySelector(".nrn-count");
    if (countEl) {
      countEl.style.display = total > 0 ? "flex" : "none";
      countEl.textContent = total > 99 ? "99+" : String(total);
    }
  }

  /* ---------- PANNEAU / OVERLAY ---------- */
  function ensureOverlay() {
    if (document.getElementById("neuronne-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "neuronne-overlay";
    overlay.innerHTML = `
      <div id="neuronne-panel">
        <div id="neuronne-header">
          <div class="nrn-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="13" r="2.2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 7.3L10 11.5M16 7.3L14 11.5M10.5 15L7.5 17.3M13.5 15L16.5 17.3"/></svg>
            Réseau neuronal de la conversation
          </div>
          <button id="neuronne-close-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="neuronne-tabs">
          <div class="nrn-tab active" data-tab="actuelle">Conversation actuelle <span class="nrn-tab-count"></span></div>
          <div class="nrn-tab" data-tab="oubliees">Neuronnes oubliés <span class="nrn-tab-count"></span></div>
        </div>
        <div id="neuronne-body">
          <div id="neuronne-graph-zone">
            <svg id="neuronne-svg" viewBox="0 0 800 560"></svg>
            <div id="neuronne-empty" style="display:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="13" r="2.2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
              <div class="nrn-empty-title">Aucun neurone pour l'instant</div>
              <div class="nrn-empty-sub">Active le mode Neuronnes dans la barre d'écriture, puis discute : chaque question, information ou fichier sera mémorisé et relié ici.</div>
            </div>
            <div id="neuronne-legend"></div>
          </div>
          <div id="neuronne-sidebar">
            <div id="neuronne-sidebar-search"><input id="neuronne-search-input" placeholder="Rechercher un neurone, un sujet…" /></div>
            <div id="neuronne-sidebar-list"></div>
            <div id="neuronne-detail"></div>
          </div>
        </div>
        <div id="neuronne-footer">
          <div class="nrn-footer-info" id="neuronne-footer-info"></div>
          <div class="nrn-footer-actions">
            <button class="nrn-btn-small danger" id="neuronne-clear-btn">Vider cette liste</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closePanel(); });
    document.getElementById("neuronne-close-btn").addEventListener("click", closePanel);
    overlay.querySelectorAll(".nrn-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        NRN.currentTab = tab.dataset.tab;
        overlay.querySelectorAll(".nrn-tab").forEach((t) => t.classList.toggle("active", t === tab));
        NRN.selectedId = null;
        renderPanel();
      });
    });
    document.getElementById("neuronne-search-input").addEventListener("input", renderPanel);
    document.getElementById("neuronne-clear-btn").addEventListener("click", () => {
      if (NRN.currentTab === "actuelle") {
        const id = getConvId();
        NRN.savedNeurons[id] = [];
        persistSaved();
      } else {
        NRN.forgottenNeurons = [];
      }
      NRN.selectedId = null;
      renderPanel();
      updateViewBtn();
      if (window.toast) window.toast("Liste de neuronnes vidée");
    });

    // drag to pan graph
    const zone = document.getElementById("neuronne-graph-zone");
    let dragging = false, sx = 0, sy = 0;
    zone.addEventListener("mousedown", (e) => { dragging = true; zone.classList.add("dragging"); sx = e.clientX; sy = e.clientY; });
    window.addEventListener("mouseup", () => { dragging = false; zone.classList.remove("dragging"); });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      NRN.graphOffset.x += e.clientX - sx; NRN.graphOffset.y += e.clientY - sy;
      sx = e.clientX; sy = e.clientY;
      applyGraphTransform();
    });
    zone.addEventListener("wheel", (e) => {
      e.preventDefault();
      NRN.graphZoom = Math.min(2.2, Math.max(0.4, NRN.graphZoom + (e.deltaY < 0 ? 0.08 : -0.08)));
      applyGraphTransform();
    }, { passive: false });
  }

  function applyGraphTransform() {
    const g = document.getElementById("neuronne-graph-content");
    if (g) g.setAttribute("transform", `translate(${NRN.graphOffset.x},${NRN.graphOffset.y}) scale(${NRN.graphZoom})`);
  }

  function openPanel() {
    ensureOverlay();
    document.getElementById("neuronne-overlay").classList.add("show");
    NRN.graphOffset = { x: 0, y: 0 };
    NRN.graphZoom = 1;
    renderPanel();
  }
  function closePanel() {
    const o = document.getElementById("neuronne-overlay");
    if (o) o.classList.remove("show");
  }

  function currentDataset() {
    return NRN.currentTab === "actuelle" ? currentList() : NRN.forgottenNeurons;
  }

  /* ---------- RENDU DU PANNEAU ---------- */
  function renderPanel() {
    if (!document.getElementById("neuronne-overlay")) return;
    const data = currentDataset();
    const searchVal = (document.getElementById("neuronne-search-input")?.value || "").toLowerCase();
    const filtered = searchVal
      ? data.filter((n) => n.text.toLowerCase().includes(searchVal) || n.topicLabel.toLowerCase().includes(searchVal) || TYPES[n.type].label.toLowerCase().includes(searchVal))
      : data;

    // tab counts
    document.querySelectorAll(".nrn-tab").forEach((t) => {
      const c = t.dataset.tab === "actuelle" ? currentList().length : NRN.forgottenNeurons.length;
      t.querySelector(".nrn-tab-count").textContent = c ? `(${c})` : "";
    });

    document.getElementById("neuronne-footer-info").textContent =
      NRN.currentTab === "actuelle"
        ? `${data.length} neurone(s) sauvegardé(s) pour cette conversation`
        : `${data.length} neurone(s) de session, non sauvegardés (perdus au rechargement)`;

    // sidebar list
    const listEl = document.getElementById("neuronne-sidebar-list");
    listEl.innerHTML = filtered.length
      ? filtered.slice().reverse().map((n) => `
        <div class="nrn-list-item ${n.id === NRN.selectedId ? "selected" : ""}" data-id="${n.id}">
          <div class="nrn-list-dot" style="background:${TYPES[n.type].color}"></div>
          <div class="nrn-list-info">
            <div class="nrn-list-type" style="color:${TYPES[n.type].color}">${TYPES[n.type].label} · ${n.role === "user" ? "Toi" : "IA"}</div>
            <div class="nrn-list-text">${escapeHtml(n.text)}</div>
            <div class="nrn-list-topic">🏷 ${n.topicLabel}</div>
          </div>
        </div>`).join("")
      : "";
    listEl.querySelectorAll(".nrn-list-item").forEach((item) => {
      item.addEventListener("click", () => { NRN.selectedId = item.dataset.id; renderPanel(); });
    });

    renderDetail(filtered);
    renderGraph(filtered);
    renderLegend(filtered);

    const empty = document.getElementById("neuronne-empty");
    empty.style.display = data.length === 0 ? "flex" : "none";
  }

  function renderDetail(list) {
    const box = document.getElementById("neuronne-detail");
    const n = list.find((x) => x.id === NRN.selectedId);
    if (!n) { box.classList.remove("show"); box.innerHTML = ""; return; }
    box.classList.add("show");
    const linkChips = (n.links || []).map((lid) => {
      const target = currentDataset().find((x) => x.id === lid);
      if (!target) return "";
      return `<span class="nrn-link-chip" data-goto="${lid}">${escapeHtml(truncate(target.text, 26))}</span>`;
    }).join("");
    box.innerHTML = `
      <div class="nrn-detail-type" style="background:${TYPES[n.type].color}22;color:${TYPES[n.type].color}">${TYPES[n.type].label}</div>
      <div class="nrn-detail-text">${escapeHtml(n.text)}</div>
      <div class="nrn-detail-meta">
        <span>🏷 Sujet : ${n.topicLabel}</span>
        <span>👤 Origine : ${n.role === "user" ? "Toi" : "IA"}</span>
        <span>🕒 ${new Date(n.ts).toLocaleString("fr", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      ${linkChips ? `<div class="nrn-detail-links">${linkChips}</div>` : ""}
    `;
    box.querySelectorAll("[data-goto]").forEach((chip) => {
      chip.addEventListener("click", () => { NRN.selectedId = chip.dataset.goto; renderPanel(); });
    });
  }

  function renderLegend(list) {
    const el = document.getElementById("neuronne-legend");
    const topicsUsed = [...new Set(list.map((n) => n.topicId))].slice(0, 8);
    el.innerHTML = topicsUsed.map((tid) => {
      const t = TOPICS.find((x) => x.id === tid);
      if (!t) return "";
      return `<span class="nrn-legend-item"><span class="nrn-legend-dot" style="background:${t.color}"></span>${t.label}</span>`;
    }).join("");
  }

  /* ---------- GRAPHE SVG (layout radial simple, sans dépendance) ---------- */
  function renderGraph(list) {
    const svg = document.getElementById("neuronne-svg");
    if (!svg) return;
    svg.innerHTML = "";
    if (!list.length) return;

    const W = 800, H = 560, cx = W / 2, cy = H / 2;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.id = "neuronne-graph-content";

    // Positionnement : spirale pour éviter les recoupements, groupé approximativement par sujet
    const byTopic = {};
    list.forEach((n) => { (byTopic[n.topicId] = byTopic[n.topicId] || []).push(n); });
    const topicIds = Object.keys(byTopic);
    const positions = {};
    const angleStep = (2 * Math.PI) / Math.max(1, topicIds.length);

    topicIds.forEach((tid, ti) => {
      const baseAngle = ti * angleStep;
      const nodes = byTopic[tid];
      const clusterR = 70 + Math.min(nodes.length * 14, 160);
      nodes.forEach((n, i) => {
        const a = baseAngle + (i / Math.max(nodes.length, 1)) * 1.4 - 0.7;
        const r = 60 + (i % 4) * 42;
        positions[n.id] = {
          x: cx + Math.cos(a) * (clusterR * 0.5 + r * 0.5),
          y: cy + Math.sin(a) * (clusterR * 0.5 + r * 0.5),
        };
      });
    });

    // liens
    const linksLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    list.forEach((n) => {
      (n.links || []).forEach((lid) => {
        const p1 = positions[n.id], p2 = positions[lid];
        if (!p1 || !p2) return;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "line");
        path.setAttribute("x1", p1.x); path.setAttribute("y1", p1.y);
        path.setAttribute("x2", p2.x); path.setAttribute("y2", p2.y);
        path.setAttribute("class", "nrn-link" + ((n.id === NRN.selectedId || lid === NRN.selectedId) ? " highlight" : ""));
        linksLayer.appendChild(path);
      });
    });
    g.appendChild(linksLayer);

    // nœuds
    list.forEach((n) => {
      const p = positions[n.id];
      if (!p) return;
      const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      nodeG.setAttribute("class", "nrn-node-g" + (n.id === NRN.selectedId ? " selected" : ""));
      nodeG.setAttribute("transform", `translate(${p.x},${p.y})`);

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", "nrn-node-circle");
      circle.setAttribute("r", n.id === NRN.selectedId ? 10 : 7.5);
      circle.setAttribute("fill", TYPES[n.type].color);
      nodeG.appendChild(circle);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("class", "nrn-node-label");
      label.setAttribute("y", 18);
      label.textContent = truncate(n.text, 14);
      nodeG.appendChild(label);

      nodeG.addEventListener("click", () => { NRN.selectedId = n.id; renderPanel(); });
      g.appendChild(nodeG);
    });

    svg.appendChild(g);
    applyGraphTransform();
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- INIT ---------- */
  function init() {
    loadSaved();
    injectToggleButton();
    injectViewButton();
    initObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose une petite API publique si besoin ailleurs dans l'app
  window.Neuronne = {
    isActive: () => NRN.active,
    getSavedForCurrentConv: () => currentList(),
    getForgotten: () => NRN.forgottenNeurons,
    open: openPanel,
    close: closePanel,
  };
})();
