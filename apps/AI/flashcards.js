/* =============================================
   FLASHCARDS.JS — Wikimind AI v5
   Génération IA • Recto/Verso • Firebase • Édition
   ============================================= */

(function() {
'use strict';

// ── STATE ──
let fcCards = [];          // { id, front, back }
let fcDeckId = null;       // ID Firebase du deck courant
let fcDeckTitle = "";
let fcCurrentIdx = 0;
let fcPanelOpen = false;
let fcMode = "list";       // "list" | "review"
let fcFlipped = false;

// ── REFS DOM (créées dynamiquement) ──
let fcPanel, fcCardsArea, fcCountEl, fcNavIndicator, fcNavPrev, fcNavNext;
let fcProgressBar, fcProgressWrap;

// ── INIT ──
function init() {
  injectHTML();
  bindEvents();
  window.FlashcardsEngine = { generate, openPanel, loadDeck };
}

// ── INJECT HTML ──
function injectHTML() {
  // Panel principal
  const panel = document.createElement('div');
  panel.id = 'fc-panel';
  panel.innerHTML = `
    <div id="fc-panel-head">
      <div id="fc-panel-head-icon">
        <img src="flashcards.png" alt="Flashcards" onerror="this.style.display='none'">
      </div>
      <div style="flex:1;min-width:0">
        <div id="fc-panel-title">Flashcards</div>
        <div id="fc-panel-subtitle">0 carte</div>
      </div>
      <button id="fc-close-btn" title="Fermer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div id="fc-toolbar">
      <span id="fc-count">0 carte</span>
      <button class="fc-tool-btn" id="fc-mode-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Réviser
      </button>
      <button class="fc-tool-btn" id="fc-add-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ajouter
      </button>
      <button class="fc-tool-btn primary" id="fc-ai-regen-btn" title="Régénérer avec l'IA">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        IA
      </button>
    </div>
    <div id="fc-progress-bar-wrap" style="display:none">
      <div id="fc-progress-bar" style="width:0%"></div>
    </div>
    <div id="fc-nav" style="display:none">
      <button class="fc-nav-btn" id="fc-prev-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span id="fc-nav-indicator">1 / 1</span>
      <button class="fc-nav-btn" id="fc-next-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div id="fc-cards-area">
      <div id="fc-empty">
        <img src="flashcards.png" alt="">
        <p>Aucune flashcard.<br>Demandez à l'IA d'en créer !</p>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // Modal édition IA
  const aiModal = document.createElement('div');
  aiModal.id = 'fc-ai-edit-overlay';
  aiModal.innerHTML = `
    <div id="fc-ai-edit-box">
      <h3>✦ Modifier avec l'IA</h3>
      <textarea id="fc-ai-edit-instruction" placeholder="Ex: Reformule plus simplement, ajoute des exemples, traduis en anglais..." rows="3"></textarea>
      <div id="fc-ai-edit-btns">
        <button class="fc-edit-cancel" id="fc-ai-edit-cancel">Annuler</button>
        <button class="fc-edit-save" id="fc-ai-edit-confirm">Appliquer</button>
      </div>
    </div>
  `;
  document.body.appendChild(aiModal);

  // Cacher l'overlay si clic extérieur
  aiModal.addEventListener('click', e => { if (e.target === aiModal) closeAiModal(); });

  // Refs
  fcPanel = panel;
  fcCardsArea = document.getElementById('fc-cards-area');
  fcCountEl = document.getElementById('fc-count');
  fcNavIndicator = document.getElementById('fc-nav-indicator');
  fcNavPrev = document.getElementById('fc-prev-btn');
  fcNavNext = document.getElementById('fc-next-btn');
  fcProgressBar = document.getElementById('fc-progress-bar');
  fcProgressWrap = document.getElementById('fc-progress-bar-wrap');
}

// ── BIND EVENTS ──
function bindEvents() {
  document.getElementById('fc-close-btn').addEventListener('click', closePanel);
  document.getElementById('fc-mode-btn').addEventListener('click', toggleMode);
  document.getElementById('fc-add-btn').addEventListener('click', addCardManually);
  document.getElementById('fc-ai-regen-btn').addEventListener('click', regenWithAI);
  document.getElementById('fc-prev-btn').addEventListener('click', () => navigate(-1));
  document.getElementById('fc-next-btn').addEventListener('click', () => navigate(1));
  document.getElementById('fc-ai-edit-cancel').addEventListener('click', closeAiModal);
  document.getElementById('fc-ai-edit-confirm').addEventListener('click', applyAiEdit);
}

// ── PANEL OPEN/CLOSE ──
function openPanel(title, cards, deckId) {
  if (title) fcDeckTitle = title;
  if (cards) fcCards = cards;
  if (deckId) fcDeckId = deckId;
  fcMode = "list";
  fcCurrentIdx = 0;
  fcPanelOpen = true;
  document.body.classList.add('fc-panel-open');
  fcPanel.classList.add('open');
  renderCards();
  updateHeader();
}

function closePanel() {
  fcPanelOpen = false;
  document.body.classList.remove('fc-panel-open');
  fcPanel.classList.remove('open');
}

// ── GENERATE (appelé depuis index.html) ──
async function generate(topic, apiKey, model, userId, db, ref, push, set, requestedCount) {
  const steps = [
    "Ouverture de Flashcards 5.1...",
    "Création des Flashcards...",
    "Finalisation des Flashcards..."
  ];

  // Afficher l'animation thinking dans le chat
  showFcThinking(steps);

  try {
    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model || "mistral-small-latest",
        max_tokens: 3200,
        temperature: 0.4,
        messages: [{
          role: "user",
          content: `Crée exactement ${Math.min(30, Math.max(5, requestedCount || 10))} flashcards sur le sujet suivant : "${topic}".
Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.
Format EXACT :
{"title":"Titre du deck","cards":[{"front":"Question ou terme","back":"Réponse ou définition"},...]}`
        }]
      })
    });

    if (!resp.ok) throw new Error('API error ' + resp.status);
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

    // Parser le JSON
    const clean = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/,'').trim();
    const parsed = JSON.parse(clean);

    fcCards = (parsed.cards || []).map((c, i) => ({ id: 'fc_' + Date.now() + '_' + i, front: c.front, back: c.back }));
    fcDeckTitle = parsed.title || topic;
    fcCurrentIdx = 0;
    fcMode = "list";

    // Sauvegarder dans Firebase WorkFlows
    if (userId && db && ref && push && set) {
      try {
        const deckRef = push(ref(db, `wikimind5/users/${userId}/workflows/flashcards`));
        fcDeckId = deckRef.key;
        // Firebase ne supporte pas les arrays → convertir en objet keyed
        const cardsObj = {};
        fcCards.forEach((c, i) => { cardsObj[c.id || ('c' + i)] = c; });
        await set(deckRef, {
          title: fcDeckTitle,
          cards: cardsObj,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          topic: topic
        });
      } catch (fbErr) { console.warn('FC Firebase save error:', fbErr); }
    }

    hideFcThinking();
    return { title: fcDeckTitle, cards: fcCards, deckId: fcDeckId };

  } catch (err) {
    hideFcThinking();
    console.error('FC generate error:', err);
    throw err;
  }
}

// ── LOAD DECK EXISTANT ──
async function loadDeck(deckId, userId, db, ref, get) {
  try {
    const snap = await get(ref(db, `wikimind5/users/${userId}/workflows/flashcards/${deckId}`));
    if (snap.exists()) {
      const data = snap.val();
      // Firebase stocke les cards comme objet keyed → reconvertir en array
      let rawCards = data.cards || [];
      if (!Array.isArray(rawCards) && typeof rawCards === 'object') rawCards = Object.values(rawCards);
      fcCards = rawCards;
      fcDeckTitle = data.title || 'Flashcards';
      fcDeckId = deckId;
      openPanel();
    }
  } catch (e) { console.error('FC loadDeck error:', e); }
}

// ── SAVE TO FIREBASE ──
async function saveToFirebase() {
  if (!fcDeckId) return;
  try {
    const { userId, db, ref, set } = getFirebaseHandles();
    if (!userId || !db) return;
    const cardsObj = {};
    fcCards.forEach((c, i) => { cardsObj[c.id || ('c' + i)] = c; });
    await set(ref(db, `wikimind5/users/${userId}/workflows/flashcards/${fcDeckId}`), {
      title: fcDeckTitle,
      cards: cardsObj,
      updatedAt: Date.now()
    });
  } catch (e) { console.warn('FC save error:', e); }
}

function getFirebaseHandles() {
  return {
    userId: window._fcUserId || null,
    db: window.db || null,
    ref: window._firebaseRef || null,
    set: window._firebaseSet || null
  };
}

// ── RENDER ──
function renderCards() {
  if (!fcCardsArea) return;

  // Mode révision
  if (fcMode === 'review' && fcCards.length > 0) {
    document.getElementById('fc-nav').style.display = 'flex';
    fcProgressWrap.style.display = 'block';
    fcFlipped = false;
    fcCardsArea.innerHTML = '';
    fcCardsArea.className = 'fc-cards-area single-mode';

    const card = fcCards[fcCurrentIdx];
    const flip = document.createElement('div');
    flip.className = 'fc-flip-container';
    flip.id = 'fc-flip-card';
    flip.innerHTML = `
      <div class="fc-flip-inner">
        <div class="fc-flip-front">
          <span class="fc-flip-badge">Question</span>
          <div class="fc-flip-text">${escHtml(card.front)}</div>
          <span class="fc-flip-hint">Cliquez pour retourner</span>
        </div>
        <div class="fc-flip-back">
          <span class="fc-flip-badge">Réponse</span>
          <div class="fc-flip-text">${escHtml(card.back)}</div>
          <span class="fc-flip-hint">Cliquez pour retourner</span>
        </div>
      </div>`;
    flip.addEventListener('click', () => {
      fcFlipped = !fcFlipped;
      flip.classList.toggle('flipped', fcFlipped);
    });
    fcCardsArea.appendChild(flip);
    updateNav();
    updateProgress();
    return;
  }

  // Mode liste
  document.getElementById('fc-nav').style.display = 'none';
  fcProgressWrap.style.display = 'none';
  fcCardsArea.className = 'fc-cards-area';
  fcCardsArea.innerHTML = '';

  if (fcCards.length === 0) {
    fcCardsArea.innerHTML = `<div id="fc-empty"><img src="flashcards.png" alt=""><p>Aucune flashcard.<br>Demandez à l'IA d'en créer !</p></div>`;
    return;
  }

  fcCards.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'fc-card';
    el.dataset.idx = idx;
    el.innerHTML = `
      <div class="fc-card-actions">
        <button class="fc-card-act-btn" title="Modifier" data-action="edit" data-idx="${idx}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="fc-card-act-btn" title="Modifier par IA" data-action="ai-edit" data-idx="${idx}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
        </button>
        <button class="fc-card-act-btn danger" title="Supprimer" data-action="delete" data-idx="${idx}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
        </button>
      </div>
      <div class="fc-card-label">Recto</div>
      <div class="fc-card-text">${escHtml(card.front)}</div>
      <div class="fc-card-label" style="margin-top:12px">Verso</div>
      <div class="fc-card-text" style="color:var(--text2)">${escHtml(card.back)}</div>
    `;

    // Actions
    el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const i = parseInt(btn.dataset.idx);
        if (action === 'edit') startInlineEdit(el, i);
        else if (action === 'ai-edit') openAiModal(i);
        else if (action === 'delete') deleteCard(i);
      });
    });

    fcCardsArea.appendChild(el);
  });
  updateHeader();
}

function updateHeader() {
  const n = fcCards.length;
  if (document.getElementById('fc-panel-subtitle'))
    document.getElementById('fc-panel-subtitle').textContent = n + ' carte' + (n > 1 ? 's' : '');
  if (fcCountEl) fcCountEl.textContent = n + ' carte' + (n > 1 ? 's' : '');
}

function updateNav() {
  if (!fcNavIndicator) return;
  fcNavIndicator.textContent = (fcCurrentIdx + 1) + ' / ' + fcCards.length;
  fcNavPrev.disabled = fcCurrentIdx === 0;
  fcNavNext.disabled = fcCurrentIdx >= fcCards.length - 1;
}

function updateProgress() {
  const pct = fcCards.length > 1 ? ((fcCurrentIdx) / (fcCards.length - 1)) * 100 : 100;
  if (fcProgressBar) fcProgressBar.style.width = pct + '%';
}

function navigate(dir) {
  fcCurrentIdx = Math.max(0, Math.min(fcCards.length - 1, fcCurrentIdx + dir));
  fcFlipped = false;
  renderCards();
}

function toggleMode() {
  const btn = document.getElementById('fc-mode-btn');
  if (fcMode === 'list') {
    fcMode = 'review';
    fcCurrentIdx = 0;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> Liste`;
  } else {
    fcMode = 'list';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Réviser`;
  }
  renderCards();
}

// ── EDIT INLINE ──
function startInlineEdit(cardEl, idx) {
  const card = fcCards[idx];
  cardEl.classList.add('editing');
  cardEl.innerHTML = `
    <div class="fc-card-label">Recto</div>
    <textarea class="fc-edit-field" id="fc-edit-front">${escHtml(card.front)}</textarea>
    <div class="fc-card-label">Verso</div>
    <textarea class="fc-edit-field" id="fc-edit-back">${escHtml(card.back)}</textarea>
    <div class="fc-edit-actions">
      <button class="fc-edit-cancel" id="fc-inline-cancel">Annuler</button>
      <button class="fc-edit-save" id="fc-inline-save">Enregistrer</button>
    </div>`;
  document.getElementById('fc-inline-cancel').addEventListener('click', renderCards);
  document.getElementById('fc-inline-save').addEventListener('click', () => {
    const newFront = document.getElementById('fc-edit-front').value.trim();
    const newBack = document.getElementById('fc-edit-back').value.trim();
    if (!newFront || !newBack) return;
    fcCards[idx] = { ...fcCards[idx], front: newFront, back: newBack };
    saveToFirebase();
    renderCards();
    if (window.toast) window.toast('Carte modifiée ✓');
  });
  document.getElementById('fc-edit-front').focus();
}

// ── ADD CARD MANUALLY ──
function addCardManually() {
  fcCards.push({ id: 'fc_' + Date.now(), front: '', back: '' });
  const newIdx = fcCards.length - 1;
  renderCards();
  // Lancer l'édition de la nouvelle carte
  const cardEl = fcCardsArea.querySelectorAll('.fc-card')[newIdx];
  if (cardEl) {
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => startInlineEdit(cardEl, newIdx), 100);
  }
}

// ── DELETE CARD ──
function deleteCard(idx) {
  if (!confirm('Supprimer cette carte ?')) return;
  fcCards.splice(idx, 1);
  saveToFirebase();
  renderCards();
  if (window.toast) window.toast('Carte supprimée');
}

// ── AI EDIT MODAL ──
let _aiEditIdx = null;
function openAiModal(idx) {
  _aiEditIdx = idx;
  const overlay = document.getElementById('fc-ai-edit-overlay');
  document.getElementById('fc-ai-edit-instruction').value = '';
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('fc-ai-edit-instruction').focus(), 80);
}
function closeAiModal() {
  document.getElementById('fc-ai-edit-overlay').classList.remove('open');
  _aiEditIdx = null;
}

async function applyAiEdit() {
  if (_aiEditIdx === null) return;
  const instruction = document.getElementById('fc-ai-edit-instruction').value.trim();
  if (!instruction) return;
  const card = fcCards[_aiEditIdx];
  const btn = document.getElementById('fc-ai-edit-confirm');
  btn.textContent = '...';
  btn.disabled = true;

  try {
    const apiKey = window._wmApiKey || "5lnrIIlTIjlETLxr4Xqv0lkZdk8tPigj";
    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: "mistral-small-latest",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Modifie cette flashcard selon l'instruction donnée.
Réponds UNIQUEMENT en JSON : {"front":"...","back":"..."}

Carte actuelle :
- Recto: ${card.front}
- Verso: ${card.back}

Instruction: ${instruction}`
        }]
      })
    });
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const clean = raw.replace(/^```json?\s*/i,'').replace(/```\s*$/,'').trim();
    const parsed = JSON.parse(clean);
    if (parsed.front && parsed.back) {
      fcCards[_aiEditIdx] = { ...fcCards[_aiEditIdx], front: parsed.front, back: parsed.back };
      saveToFirebase();
      renderCards();
      if (window.toast) window.toast('Carte modifiée par IA ✓');
    }
  } catch (e) {
    if (window.toast) window.toast('Erreur IA');
  } finally {
    btn.textContent = 'Appliquer';
    btn.disabled = false;
    closeAiModal();
  }
}

// ── REGEN WITH AI ──
async function regenWithAI() {
  if (!fcDeckTitle) return;
  const topic = prompt('Modifier le sujet des flashcards :', fcDeckTitle) || fcDeckTitle;
  const apiKey = window._wmApiKey || "5lnrIIlTIjlETLxr4Xqv0lkZdk8tPigj";
  const { userId, db, ref: fbRef, set: fbSet } = getFirebaseHandles();
  const push = window._firebasePush;
  try {
    const result = await generate(topic, apiKey, window._wmSelectedModelObj?.id || 'mistral-small-latest', userId, db, fbRef, push, fbSet);
    openPanel(result.title, result.cards, result.deckId);
  } catch(e) { if (window.toast) window.toast('Erreur de génération'); }
}

// ── THINKING ANIMATION ──
let _fcThinkingEl = null;
let _fcThinkingTimer = null;
const FC_STEPS = [
  "Ouverture de Flashcards 5.1...",
  "Création des Flashcards...",
  "Finalisation des Flashcards..."
];

function showFcThinking(steps) {
  hideFcThinking();
  const messages = document.getElementById('messages');
  if (!messages) return;

  const g = document.createElement('div');
  g.className = 'msg-group ai';
  g.id = 'fc-thinking-group';

  g.innerHTML = `<div class="msg-inner">
    <div class="thinking-fc">
      <div class="thinking-fc-icon">
        <img src="flashcards.png" alt="FC" onerror="this.style.display='none'">
      </div>
      <div>
        <div style="font-size:0.78rem;font-weight:600;color:var(--text);margin-bottom:2px">Flashcards 5.1</div>
        <div id="fc-thinking-step" style="font-size:0.75rem;color:var(--text3)">${steps[0]}</div>
      </div>
      <div class="thinking-dots" style="margin-left:auto"><span></span><span></span><span></span></div>
    </div>
  </div>`;
  messages.appendChild(g);
  messages.parentElement.scrollTop = messages.parentElement.scrollHeight;
  _fcThinkingEl = g;

  let stepIdx = 0;
  _fcThinkingTimer = setInterval(() => {
    stepIdx = (stepIdx + 1) % steps.length;
    const el = document.getElementById('fc-thinking-step');
    if (el) el.textContent = steps[stepIdx];
  }, 1400);
}

function hideFcThinking() {
  if (_fcThinkingTimer) { clearInterval(_fcThinkingTimer); _fcThinkingTimer = null; }
  const el = document.getElementById('fc-thinking-group');
  if (el) el.remove();
  _fcThinkingEl = null;
}

// ── UTILS ──
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── CHIP DANS LA ROW D'INPUT ──
window.renderFcChip = function(active) {
  const row = document.getElementById('active-connectors-row');
  if (!row) return;
  const existing = row.querySelector('.fc-active-chip');
  if (existing) existing.remove();
  if (!active) return;
  const chip = document.createElement('div');
  chip.className = 'fc-active-chip';
  chip.innerHTML = `
    <img src="flashcards.png" alt="FC" onerror="this.style.display='none'">
    <span>Flashcards</span>
    <button class="fc-active-chip-remove" title="Désactiver">✕</button>
  `;
  chip.querySelector('.fc-active-chip-remove').addEventListener('click', () => {
    window._fcModeActive = false;
    chip.remove();
    if (window.toast) window.toast('Mode Flashcards désactivé');
  });
  row.appendChild(chip);
};

// ── AUTO-INIT ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
