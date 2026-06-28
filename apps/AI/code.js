/* ═══════════════════════════════════════════════════════════════
   WIKIMIND CODE — code.js
   Panneau code latéral + rate limiting Firebase par forfait
   ═══════════════════════════════════════════════════════════════
   INTÉGRATION dans index.html :
     <link rel="stylesheet" href="code.css">
     <script src="code.js" defer></script>
   
   DÉPENDANCES (déjà présentes dans Wikimind) :
     - Firebase Realtime Database (db, ref, get, set, update, runTransaction)
     - window.currentUser / window.userId
     - window._userForfait  (1=Free, 2=Plus, 3=Pro, 4=Premium, 5=Premium+)
     - toast() function
     - Anthropic API (fetch via code)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════════════════════════════
// 1. CONFIG — Rate limits par forfait pour Wikimind Code
// ══════════════════════════════════════════════════════════════
const WM_CODE_CONFIG = {
  // Messages max par heure selon le forfait
  rateLimits: {
    1: 5,   // Free
    2: 10,  // Plus
    3: 15,  // Pro
    4: 25,  // Premium
    5: 50,  // Premium+
  },
  forfaitNames: {
    1: 'Free',
    2: 'Plus',
    3: 'Pro',
    4: 'Premium',
    5: 'Premium+',
  },
  // Modèle cible (le meilleur code dispo)
  model: 'claude-sonnet-4-6',
  apiUrl: 'https://api.anthropic.com/v1/messages',
  maxTokens: 4096,
};

// ══════════════════════════════════════════════════════════════
// 2. LANGAGES SUPPORTÉS
// ══════════════════════════════════════════════════════════════
const WM_CODE_LANGS = [
  { id: 'javascript', label: 'JavaScript', ext: 'js', color: '#f7df1e' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', color: '#3178c6' },
  { id: 'python',     label: 'Python',     ext: 'py', color: '#3776ab' },
  { id: 'html',       label: 'HTML',       ext: 'html', color: '#e34c26' },
  { id: 'css',        label: 'CSS',        ext: 'css', color: '#264de4' },
  { id: 'json',       label: 'JSON',       ext: 'json', color: '#ffa94d' },
  { id: 'sql',        label: 'SQL',        ext: 'sql', color: '#4ecdc4' },
  { id: 'rust',       label: 'Rust',       ext: 'rs', color: '#ce422b' },
  { id: 'go',         label: 'Go',         ext: 'go', color: '#00add8' },
  { id: 'java',       label: 'Java',       ext: 'java', color: '#f89820' },
  { id: 'cpp',        label: 'C++',        ext: 'cpp', color: '#004482' },
  { id: 'csharp',     label: 'C#',         ext: 'cs', color: '#239120' },
  { id: 'php',        label: 'PHP',        ext: 'php', color: '#777bb4' },
  { id: 'ruby',       label: 'Ruby',       ext: 'rb', color: '#cc342d' },
  { id: 'swift',      label: 'Swift',      ext: 'swift', color: '#f05138' },
  { id: 'kotlin',     label: 'Kotlin',     ext: 'kt', color: '#7f52ff' },
  { id: 'bash',       label: 'Bash',       ext: 'sh', color: '#4eaa25' },
  { id: 'yaml',       label: 'YAML',       ext: 'yaml', color: '#cb171e' },
  { id: 'markdown',   label: 'Markdown',   ext: 'md', color: '#083fa1' },
  { id: 'dockerfile', label: 'Dockerfile', ext: 'dockerfile', color: '#2496ed' },
  { id: 'vue',        label: 'Vue',        ext: 'vue', color: '#41b883' },
  { id: 'react',      label: 'React/JSX',  ext: 'jsx', color: '#61dafb' },
];

// ══════════════════════════════════════════════════════════════
// 3. ÉTAT GLOBAL DU MODULE
// ══════════════════════════════════════════════════════════════
const WMCode = {
  isOpen: false,
  isWide: false,
  tabs: [],          // [{ id, name, lang, content, modified }]
  activeTabId: null,
  streaming: false,
  abortCtrl: null,
  outputCollapsed: false,

  // Rate limit state (chargé depuis Firebase)
  quota: {
    windowHourly: null,   // ex: "2026-06-28T14"
    used: 0,
    limit: 5,
  },
};

let _panelEl, _overlayEl, _editorEl, _lineNumsEl, _outputEl, _responseEl,
    _aiInputEl, _aiSendBtn, _quotaBadgeEl, _tabsEl, _rateblockerEl,
    _loadingEl, _welcomeEl, _cursorInfoEl, _countdownTimer;

// ══════════════════════════════════════════════════════════════
// 4. FIREBASE RATE LIMITING
// ══════════════════════════════════════════════════════════════

/** Retourne la fenêtre horaire courante ex: "2026-06-28T14" */
function _currentHourWindow() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}`;
}

/** Retourne les ms avant la prochaine heure */
function _msUntilNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next - now;
}

/** Charge le quota depuis Firebase ou local state */
async function _loadCodeQuota() {
  const uid = window.userId;
  if (!uid) {
    // Non connecté = Free limits, pas de persistance
    WMCode.quota.limit = WM_CODE_CONFIG.rateLimits[1];
    WMCode.quota.used = 0;
    WMCode.quota.windowHourly = _currentHourWindow();
    return;
  }

  try {
    const { get, ref } = await _getFirebase();
    const snap = await get(ref(window._wmDb, `wikimind5/${uid}/codeQuota`));
    const forfait = window._userForfait || 1;
    const limit = WM_CODE_CONFIG.rateLimits[forfait] || 5;
    const curWindow = _currentHourWindow();

    if (snap.exists()) {
      const data = snap.val();
      if (data.windowHourly === curWindow) {
        // Même heure → on reprend le compteur existant
        WMCode.quota.windowHourly = curWindow;
        WMCode.quota.used = data.used || 0;
        WMCode.quota.limit = limit;
      } else {
        // Nouvelle heure → reset
        WMCode.quota.windowHourly = curWindow;
        WMCode.quota.used = 0;
        WMCode.quota.limit = limit;
        // Écrire le reset
        await _resetCodeQuotaFirebase(uid, curWindow, limit);
      }
    } else {
      // Première utilisation
      WMCode.quota.windowHourly = curWindow;
      WMCode.quota.used = 0;
      WMCode.quota.limit = limit;
      await _resetCodeQuotaFirebase(uid, curWindow, limit);
    }
  } catch (e) {
    console.warn('[WMCode] quota load error', e);
    const forfait = window._userForfait || 1;
    WMCode.quota.limit = WM_CODE_CONFIG.rateLimits[forfait] || 5;
    WMCode.quota.used = 0;
    WMCode.quota.windowHourly = _currentHourWindow();
  }
}

async function _resetCodeQuotaFirebase(uid, windowHourly, limit) {
  try {
    const { set, ref } = await _getFirebase();
    await set(ref(window._wmDb, `wikimind5/${uid}/codeQuota`), {
      windowHourly,
      used: 0,
      limit,
      updatedAt: Date.now(),
    });
  } catch (e) { console.warn('[WMCode] reset quota error', e); }
}

/** Incrémente le compteur et retourne true si OK, false si limité */
async function _incrementCodeQuota() {
  const uid = window.userId;
  const curWindow = _currentHourWindow();

  // Vérifier reset de fenêtre
  if (WMCode.quota.windowHourly !== curWindow) {
    WMCode.quota.windowHourly = curWindow;
    WMCode.quota.used = 0;
    if (uid) await _resetCodeQuotaFirebase(uid, curWindow, WMCode.quota.limit);
  }

  // Vérifier la limite
  if (WMCode.quota.used >= WMCode.quota.limit) {
    return false;
  }

  // Incrémenter
  WMCode.quota.used += 1;

  if (uid) {
    try {
      const { ref, update } = await _getFirebase();
      await update(ref(window._wmDb, `wikimind5/${uid}/codeQuota`), {
        used: WMCode.quota.used,
        windowHourly: curWindow,
        updatedAt: Date.now(),
      });
    } catch (e) { console.warn('[WMCode] increment quota error', e); }
  }

  return true;
}

/** Helper pour accéder aux fonctions Firebase déjà importées dans la page */
async function _getFirebase() {
  // La page principale importe déjà Firebase — on réutilise ses globals
  // window._wmDb est exposé par le script principal (voir note d'intégration)
  return {
    ref: window._wmFireRef || window.firebaseRef,
    get: window._wmFireGet || window.firebaseGet,
    set: window._wmFireSet || window.firebaseSet,
    update: window._wmFireUpdate || window.firebaseUpdate,
  };
}

// ══════════════════════════════════════════════════════════════
// 5. CONSTRUCTION DU DOM
// ══════════════════════════════════════════════════════════════

function _buildPanel() {
  if (document.getElementById('wm-code-panel')) return;

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'wm-code-overlay';
  overlay.addEventListener('click', () => WMCodePanel.close());
  document.body.appendChild(overlay);
  _overlayEl = overlay;

  // Panel principal
  const panel = document.createElement('div');
  panel.id = 'wm-code-panel';
  panel.innerHTML = `
    <!-- Resize handle -->
    <div id="wm-code-resize-handle"></div>

    <!-- Header -->
    <div id="wm-code-header">
      <div id="wm-code-header-title">
        <div class="wm-code-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        Wikimind Code
      </div>
      <!-- Badge quota -->
      <div id="wm-code-quota-badge">
        <div class="quota-dot"></div>
        <span id="wm-code-quota-text">5/5 msg/h</span>
      </div>
      <!-- Bouton wide -->
      <button class="wm-code-hbtn" id="wm-code-wide-btn" title="Agrandir">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      </button>
      <!-- Bouton nouveau fichier -->
      <button class="wm-code-hbtn" id="wm-code-newfile-btn" title="Nouveau fichier">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </button>
      <!-- Fermer -->
      <button class="wm-code-hbtn" id="wm-code-close-btn" title="Fermer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Tabs -->
    <div id="wm-code-tabs">
      <button id="wm-code-tab-add" title="Nouveau fichier">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- Corps éditeur -->
    <div id="wm-code-body">
      <!-- Welcome state -->
      <div id="wm-code-welcome">
        <div class="wc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <h3>Wikimind Code</h3>
        <p>Un éditeur AI-powered. Crée un fichier ou décris ce que tu veux construire.</p>
        <div class="wc-suggestions">
          <div class="wc-suggestion-chip" data-prompt="Crée une fonction JavaScript de tri rapide">Quicksort JS</div>
          <div class="wc-suggestion-chip" data-prompt="Crée un composant React de formulaire de contact avec validation">Formulaire React</div>
          <div class="wc-suggestion-chip" data-prompt="Écris un script Python pour scraper une page web avec BeautifulSoup">Scraper Python</div>
          <div class="wc-suggestion-chip" data-prompt="Crée une API REST Express.js avec routes CRUD">API Express</div>
        </div>
      </div>

      <!-- Éditeur (caché tant qu'aucun tab) -->
      <div id="wm-code-editor-wrap" style="display:none;flex:1">
        <div id="wm-code-line-nums"></div>
        <textarea id="wm-code-editor" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
      </div>

      <!-- Rate limit blocker -->
      <div id="wm-code-rate-blocker">
        <div class="rb-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </div>
        <div class="rb-title">Limite horaire atteinte</div>
        <div class="rb-subtitle">Tu as utilisé toutes tes requêtes Code pour cette heure. Réessaie dans :</div>
        <div class="rb-countdown" id="wm-code-countdown">00:00</div>
        <div class="rb-plan-table" id="wm-code-plan-table"></div>
        <button class="rb-upgrade-btn" id="wm-code-upgrade-btn">Passer à un forfait supérieur ↗</button>
      </div>
    </div>

    <!-- Response AI -->
    <div id="wm-code-response"></div>

    <!-- Loading indicator -->
    <div id="wm-code-loading">
      <div class="wm-code-dots"><span></span><span></span><span></span></div>
      <span>Wikimind Code génère…</span>
    </div>

    <!-- Output console -->
    <div id="wm-code-output-wrap">
      <div id="wm-code-output-header">
        <div id="wm-code-output-status"></div>
        <div id="wm-code-output-label">Console</div>
        <div id="wm-code-cursor-info"></div>
        <div id="wm-code-output-collapse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </div>
      </div>
      <div id="wm-code-output">Prêt.</div>
    </div>

    <!-- Toolbar éditeur -->
    <div id="wm-code-toolbar">
      <button class="wm-code-tbtn" id="wm-code-copy-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Copier
      </button>
      <button class="wm-code-tbtn" id="wm-code-format-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
          <line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="11" y2="18"/>
        </svg>
        Formater
      </button>
      <button class="wm-code-tbtn" id="wm-code-download-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Télécharger
      </button>
      <div class="wm-code-tb-spacer"></div>
      <button class="wm-code-tbtn danger" id="wm-code-clear-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        Effacer
      </button>
    </div>

    <!-- Zone prompt AI -->
    <div id="wm-code-ai-zone">
      <div id="wm-code-ai-input-wrap">
        <textarea id="wm-code-ai-input"
          placeholder="Décris ce que tu veux coder, ou demande une modification…"
          rows="1"></textarea>
        <button id="wm-code-ai-send" title="Envoyer (⌘↵)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div id="wm-code-ai-hint">
        <span id="wm-code-hint-text"></span>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  _panelEl = panel;

  // Capturer les références
  _editorEl = document.getElementById('wm-code-editor');
  _lineNumsEl = document.getElementById('wm-code-line-nums');
  _outputEl = document.getElementById('wm-code-output');
  _responseEl = document.getElementById('wm-code-response');
  _aiInputEl = document.getElementById('wm-code-ai-input');
  _aiSendBtn = document.getElementById('wm-code-ai-send');
  _quotaBadgeEl = document.getElementById('wm-code-quota-badge');
  _tabsEl = document.getElementById('wm-code-tabs');
  _rateblockerEl = document.getElementById('wm-code-rate-blocker');
  _loadingEl = document.getElementById('wm-code-loading');
  _welcomeEl = document.getElementById('wm-code-welcome');
  _cursorInfoEl = document.getElementById('wm-code-cursor-info');

  _bindEvents();
  _buildRateLimitTable();
  _setupResizeHandle();
}

// ══════════════════════════════════════════════════════════════
// 6. EVENTS
// ══════════════════════════════════════════════════════════════

function _bindEvents() {
  // Fermer
  document.getElementById('wm-code-close-btn').addEventListener('click', () => WMCodePanel.close());

  // Wide toggle
  document.getElementById('wm-code-wide-btn').addEventListener('click', () => {
    WMCode.isWide = !WMCode.isWide;
    _panelEl.classList.toggle('wide', WMCode.isWide);
    document.body.classList.toggle('code-panel-wide', WMCode.isWide);
    const btn = document.getElementById('wm-code-wide-btn');
    btn.classList.toggle('active', WMCode.isWide);
  });

  // Nouveau fichier
  document.getElementById('wm-code-newfile-btn').addEventListener('click', () => _openLangModal());
  document.getElementById('wm-code-tab-add').addEventListener('click', () => _openLangModal());

  // Éditeur — line nums + cursor info
  _editorEl.addEventListener('input', () => {
    _updateLineNums();
    _saveActiveTabContent();
  });
  _editorEl.addEventListener('keydown', _handleEditorKeydown);
  _editorEl.addEventListener('scroll', () => {
    _lineNumsEl.scrollTop = _editorEl.scrollTop;
  });
  _editorEl.addEventListener('click', _updateCursorInfo);
  _editorEl.addEventListener('keyup', _updateCursorInfo);

  // AI Send
  _aiSendBtn.addEventListener('click', () => _sendCodePrompt());
  _aiInputEl.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      _sendCodePrompt();
    }
    // Auto-resize
    setTimeout(() => {
      _aiInputEl.style.height = 'auto';
      _aiInputEl.style.height = Math.min(_aiInputEl.scrollHeight, 120) + 'px';
    }, 0);
  });

  // Toolbar
  document.getElementById('wm-code-copy-btn').addEventListener('click', _copyCode);
  document.getElementById('wm-code-format-btn').addEventListener('click', _formatCode);
  document.getElementById('wm-code-download-btn').addEventListener('click', _downloadCode);
  document.getElementById('wm-code-clear-btn').addEventListener('click', () => {
    if (_editorEl.value && !confirm('Effacer tout le contenu ?')) return;
    _editorEl.value = '';
    _updateLineNums();
    _saveActiveTabContent();
    _printOutput('<span class="out-info">Fichier effacé.</span>');
  });

  // Output collapse
  document.getElementById('wm-code-output-header').addEventListener('click', () => {
    WMCode.outputCollapsed = !WMCode.outputCollapsed;
    document.getElementById('wm-code-output-wrap').classList.toggle('collapsed', WMCode.outputCollapsed);
  });

  // Upgrade btn
  document.getElementById('wm-code-upgrade-btn').addEventListener('click', () => {
    // Ouvrir le popup forfait de Wikimind (déjà géré par forfait.js)
    if (typeof window.openForfaitPanel === 'function') window.openForfaitPanel();
    else if (document.getElementById('pp-upgrade')) document.getElementById('pp-upgrade').click();
  });

  // Suggestions welcome
  document.querySelectorAll('.wc-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (!WMCode.tabs.length) _createTab('javascript');
      _aiInputEl.value = prompt;
      _aiInputEl.focus();
    });
  });

  // Keyboard shortcut global : Cmd+Shift+K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      WMCode.isOpen ? WMCodePanel.close() : WMCodePanel.open();
    }
  });
}

// ══════════════════════════════════════════════════════════════
// 7. ÉDITEUR — Ligne nums, tab, indentation
// ══════════════════════════════════════════════════════════════

function _updateLineNums() {
  const lines = (_editorEl.value + '\n').split('\n').length;
  let html = '';
  for (let i = 1; i < lines; i++) html += i + '\n';
  _lineNumsEl.textContent = html;
  _lineNumsEl.scrollTop = _editorEl.scrollTop;
}

function _updateCursorInfo() {
  const val = _editorEl.value;
  const pos = _editorEl.selectionStart;
  const lines = val.substring(0, pos).split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  _cursorInfoEl.textContent = `Ln ${line}, Col ${col}`;
}

function _handleEditorKeydown(e) {
  // Tab → 2 espaces
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = _editorEl.selectionStart;
    const end = _editorEl.selectionEnd;
    _editorEl.value = _editorEl.value.substring(0, start) + '  ' + _editorEl.value.substring(end);
    _editorEl.selectionStart = _editorEl.selectionEnd = start + 2;
    _updateLineNums();
    return;
  }
  // Auto-fermeture des paires
  const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
  if (pairs[e.key]) {
    const start = _editorEl.selectionStart;
    const end = _editorEl.selectionEnd;
    if (start === end) {
      e.preventDefault();
      const closing = pairs[e.key];
      _editorEl.value = _editorEl.value.substring(0, start) + e.key + closing + _editorEl.value.substring(end);
      _editorEl.selectionStart = _editorEl.selectionEnd = start + 1;
      _updateLineNums();
    }
  }
  // Enter → auto-indentation
  if (e.key === 'Enter') {
    const start = _editorEl.selectionStart;
    const lineStart = _editorEl.value.lastIndexOf('\n', start - 1) + 1;
    const currentLine = _editorEl.value.substring(lineStart, start);
    const indent = currentLine.match(/^(\s*)/)[1];
    const charBefore = _editorEl.value[start - 1];
    const charAfter = _editorEl.value[start];
    if (charBefore === '{' || charBefore === '[' || charBefore === '(') {
      e.preventDefault();
      const extraIndent = indent + '  ';
      _editorEl.value = _editorEl.value.substring(0, start) + '\n' + extraIndent + '\n' + indent + _editorEl.value.substring(start);
      _editorEl.selectionStart = _editorEl.selectionEnd = start + extraIndent.length + 1;
      _updateLineNums();
    }
  }
}

// ══════════════════════════════════════════════════════════════
// 8. TABS
// ══════════════════════════════════════════════════════════════

function _createTab(langId, name = null) {
  const lang = WM_CODE_LANGS.find(l => l.id === langId) || WM_CODE_LANGS[0];
  const id = 'tab_' + Date.now();
  const tabName = name || `fichier.${lang.ext}`;
  WMCode.tabs.push({ id, name: tabName, lang: langId, content: '', modified: false });
  _renderTabs();
  _switchTab(id);
  _showEditor();
}

function _renderTabs() {
  // Supprimer les anciens onglets (garder le bouton +)
  const existingTabs = _tabsEl.querySelectorAll('.wm-code-tab');
  existingTabs.forEach(t => t.remove());

  WMCode.tabs.forEach(tab => {
    const lang = WM_CODE_LANGS.find(l => l.id === tab.lang) || WM_CODE_LANGS[0];
    const el = document.createElement('div');
    el.className = 'wm-code-tab' + (tab.id === WMCode.activeTabId ? ' active' : '');
    el.dataset.id = tab.id;
    el.innerHTML = `
      <div class="tab-lang-dot" style="background:${lang.color}"></div>
      <span>${tab.name}${tab.modified ? ' •' : ''}</span>
      <button class="tab-close" title="Fermer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    el.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) {
        _closeTab(tab.id);
      } else {
        _switchTab(tab.id);
      }
    });
    _tabsEl.insertBefore(el, document.getElementById('wm-code-tab-add'));
  });
}

function _switchTab(id) {
  // Sauvegarder l'onglet courant
  if (WMCode.activeTabId) {
    const cur = WMCode.tabs.find(t => t.id === WMCode.activeTabId);
    if (cur) cur.content = _editorEl.value;
  }
  WMCode.activeTabId = id;
  const tab = WMCode.tabs.find(t => t.id === id);
  if (tab) {
    _editorEl.value = tab.content;
    _updateLineNums();
    _editorEl.focus();
  }
  _renderTabs();
}

function _closeTab(id) {
  const idx = WMCode.tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  WMCode.tabs.splice(idx, 1);
  if (WMCode.tabs.length === 0) {
    WMCode.activeTabId = null;
    _editorEl.value = '';
    _updateLineNums();
    _showWelcome();
  } else {
    const newActive = WMCode.tabs[Math.min(idx, WMCode.tabs.length - 1)].id;
    _switchTab(newActive);
  }
  _renderTabs();
}

function _saveActiveTabContent() {
  const tab = WMCode.tabs.find(t => t.id === WMCode.activeTabId);
  if (tab) {
    tab.content = _editorEl.value;
    tab.modified = true;
  }
}

function _showEditor() {
  _welcomeEl.style.display = 'none';
  document.getElementById('wm-code-editor-wrap').style.display = 'flex';
}

function _showWelcome() {
  _welcomeEl.style.display = 'flex';
  document.getElementById('wm-code-editor-wrap').style.display = 'none';
}

// ══════════════════════════════════════════════════════════════
// 9. MODAL LANGAGE
// ══════════════════════════════════════════════════════════════

function _openLangModal() {
  let modal = document.getElementById('wm-code-lang-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'wm-code-lang-modal';
    modal.innerHTML = `
      <div id="wm-code-lang-box">
        <h3>Choisir un langage</h3>
        <input id="wm-code-lang-search" type="text" placeholder="Rechercher…" autocomplete="off">
        <div id="wm-code-lang-grid"></div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
    document.body.appendChild(modal);
    document.getElementById('wm-code-lang-search').addEventListener('input', (e) => {
      _renderLangGrid(e.target.value);
    });
  }
  document.getElementById('wm-code-lang-search').value = '';
  _renderLangGrid('');
  modal.classList.add('open');
  setTimeout(() => document.getElementById('wm-code-lang-search').focus(), 80);
}

function _renderLangGrid(filter) {
  const grid = document.getElementById('wm-code-lang-grid');
  const filtered = filter
    ? WM_CODE_LANGS.filter(l => l.label.toLowerCase().includes(filter.toLowerCase()) || l.ext.includes(filter.toLowerCase()))
    : WM_CODE_LANGS;
  grid.innerHTML = filtered.map(l => `
    <div class="wm-lang-chip" data-lang="${l.id}">
      <div class="lang-dot" style="background:${l.color}"></div>
      ${l.label}
    </div>
  `).join('');
  grid.querySelectorAll('.wm-lang-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('wm-code-lang-modal').classList.remove('open');
      _createTab(chip.dataset.lang);
    });
  });
}

// ══════════════════════════════════════════════════════════════
// 10. TOOLBAR ACTIONS
// ══════════════════════════════════════════════════════════════

function _copyCode() {
  const code = _editorEl.value;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    _codeToast('Code copié !', 'success');
  });
}

function _downloadCode() {
  const tab = WMCode.tabs.find(t => t.id === WMCode.activeTabId);
  const content = _editorEl.value;
  if (!content && !tab) return;
  const name = tab ? tab.name : 'code.txt';
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  _codeToast('Fichier téléchargé !', 'success');
}

function _formatCode() {
  // Formatage basique : normalise l'indentation (2 espaces)
  let code = _editorEl.value;
  if (!code.trim()) return;
  // Pour JSON → auto-format
  const tab = WMCode.tabs.find(t => t.id === WMCode.activeTabId);
  if (tab && tab.lang === 'json') {
    try {
      code = JSON.stringify(JSON.parse(code), null, 2);
      _editorEl.value = code;
      _updateLineNums();
      _saveActiveTabContent();
      _codeToast('JSON formaté !', 'success');
      return;
    } catch (e) {
      _codeToast('JSON invalide', 'error');
      return;
    }
  }
  // Normalisation tabs → 2 espaces
  code = code.replace(/\t/g, '  ');
  _editorEl.value = code;
  _updateLineNums();
  _saveActiveTabContent();
  _codeToast('Code formaté', 'success');
}

// ══════════════════════════════════════════════════════════════
// 11. CONSOLE OUTPUT
// ══════════════════════════════════════════════════════════════

function _printOutput(html) {
  _outputEl.innerHTML = html;
  // Expand si collapsed
  if (WMCode.outputCollapsed) {
    WMCode.outputCollapsed = false;
    document.getElementById('wm-code-output-wrap').classList.remove('collapsed');
  }
}

function _setOutputStatus(state) {
  const dot = document.getElementById('wm-code-output-status');
  dot.className = 'wm-code-output-status';
  if (state) dot.classList.add(state);
}

// ══════════════════════════════════════════════════════════════
// 12. APPEL API — ANTHROPIC (streaming)
// ══════════════════════════════════════════════════════════════

async function _sendCodePrompt() {
  const prompt = _aiInputEl.value.trim();
  if (!prompt || WMCode.streaming) return;

  // ── Rate limit check ──
  await _loadCodeQuota(); // refresh depuis Firebase
  const allowed = await _incrementCodeQuota();
  if (!allowed) {
    _showRateLimitBlocker();
    return;
  }

  // ── Préparer le contexte ──
  const currentCode = _editorEl.value.trim();
  const activeLang = (() => {
    const tab = WMCode.tabs.find(t => t.id === WMCode.activeTabId);
    return tab ? tab.lang : 'javascript';
  })();
  const forfait = window._userForfait || 1;

  const systemPrompt = `Tu es Wikimind Code, un assistant de développement expert. 
Tu génères du code propre, commenté et production-ready.
Langage de travail actuel : ${activeLang}
Forfait utilisateur : ${WM_CODE_CONFIG.forfaitNames[forfait] || 'Free'}

Règles :
- Réponds TOUJOURS avec le code complet dans un bloc de code markdown
- Si du code existant t'est fourni, retourne le fichier ENTIER modifié (pas de "..." ou de troncature)
- Commente le code en français
- Pour les modifications : explique brièvement les changements AVANT le bloc code
- Pour les nouveaux fichiers : explique brièvement ce que tu crées AVANT le bloc code
- Sois concis dans les explications, généreux dans le code`;

  const userContent = currentCode
    ? `Fichier actuel (${activeLang}) :\n\`\`\`${activeLang}\n${currentCode}\n\`\`\`\n\nDemande : ${prompt}`
    : prompt;

  // ── UI streaming ──
  WMCode.streaming = true;
  _aiSendBtn.disabled = true;
  _aiInputEl.disabled = true;
  _loadingEl.classList.add('active');
  _responseEl.classList.add('active');
  _responseEl.innerHTML = '<span class="wm-stream-cursor"></span>';
  _setOutputStatus('running');
  _printOutput('<span class="out-info">Génération en cours…</span>');

  // Scroller vers la response
  _responseEl.scrollTop = 0;

  let fullText = '';
  WMCode.abortCtrl = new AbortController();

  try {
    const res = await fetch(WM_CODE_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: WMCode.abortCtrl.signal,
      body: JSON.stringify({
        model: WM_CODE_CONFIG.model,
        max_tokens: WM_CODE_CONFIG.maxTokens,
        system: systemPrompt,
        stream: true,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.delta?.text || parsed.content?.[0]?.text || '';
          if (delta) {
            fullText += delta;
            _responseEl.innerHTML = _renderMarkdown(fullText) + '<span class="wm-stream-cursor"></span>';
            _responseEl.scrollTop = _responseEl.scrollHeight;
          }
        } catch (_) {}
      }
    }

    // Fin du streaming
    _responseEl.innerHTML = _renderMarkdown(fullText);
    _addApplyButtons();

    // Auto-appliquer si le fichier est vide
    if (!currentCode) {
      const firstCode = _extractFirstCodeBlock(fullText, activeLang);
      if (firstCode) {
        if (!WMCode.tabs.length) _createTab(activeLang);
        _applyCodeToEditor(firstCode);
        _printOutput('<span class="out-success">✓ Code appliqué au fichier.</span>');
      } else {
        _printOutput('<span class="out-info">Réponse reçue (pas de bloc code détecté).</span>');
      }
    } else {
      _printOutput('<span class="out-success">✓ Réponse reçue. Clique "Appliquer" pour mettre à jour le fichier.</span>');
    }

    _setOutputStatus('ok');
    _updateQuotaBadge();

  } catch (err) {
    if (err.name === 'AbortError') {
      _printOutput('<span class="out-warn">Génération annulée.</span>');
      _setOutputStatus('');
    } else {
      console.error('[WMCode]', err);
      _printOutput(`<span class="out-error">Erreur : ${err.message}</span>`);
      _setOutputStatus('error');
      // Rembourser le quota si erreur API
      WMCode.quota.used = Math.max(0, WMCode.quota.used - 1);
    }
  } finally {
    WMCode.streaming = false;
    _aiSendBtn.disabled = false;
    _aiInputEl.disabled = false;
    _aiInputEl.value = '';
    _aiInputEl.style.height = 'auto';
    _loadingEl.classList.remove('active');
    WMCode.abortCtrl = null;
  }
}

// ══════════════════════════════════════════════════════════════
// 13. RENDU MARKDOWN LÉGER
// ══════════════════════════════════════════════════════════════

function _renderMarkdown(text) {
  // Blocs code
  let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang || 'text'}">${_escapeHtml(code.trim())}</code></pre>`;
  });
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italique
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Titres
  html = html.replace(/^### (.*$)/gm, '<h4 style="font-size:0.82rem;font-weight:600;color:var(--text);margin:10px 0 4px">$1</h4>');
  html = html.replace(/^## (.*$)/gm, '<h3 style="font-size:0.86rem;font-weight:600;color:var(--text);margin:10px 0 4px">$1</h3>');
  html = html.replace(/^# (.*$)/gm, '<h2 style="font-size:0.9rem;font-weight:700;color:var(--text);margin:10px 0 4px">$1</h2>');
  // Listes
  html = html.replace(/^\- (.*$)/gm, '<li style="margin-left:16px;color:var(--text2)">$1</li>');
  // Retours à la ligne
  html = html.replace(/\n(?!<)/g, '<br>');
  return html;
}

function _escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _extractFirstCodeBlock(text, preferredLang) {
  // Cherche d'abord le bloc du langage préféré
  const langRegex = new RegExp('```' + preferredLang + '\\n?([\\s\\S]*?)```', 'i');
  let m = text.match(langRegex);
  if (m) return m[1].trim();
  // Sinon premier bloc code
  m = text.match(/```\w*\n?([\s\S]*?)```/);
  if (m) return m[1].trim();
  return null;
}

function _addApplyButtons() {
  _responseEl.querySelectorAll('pre').forEach((pre, idx) => {
    const code = pre.querySelector('code');
    if (!code) return;
    const btn = document.createElement('button');
    btn.className = 'wm-code-apply-btn';
    btn.textContent = 'Appliquer';
    btn.addEventListener('click', () => {
      _applyCodeToEditor(code.textContent);
      btn.textContent = '✓ Appliqué';
      btn.style.background = 'var(--code-green)';
      btn.style.borderColor = 'var(--code-green)';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.textContent = 'Appliquer';
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

function _applyCodeToEditor(code) {
  if (!WMCode.tabs.length) _createTab('javascript');
  _editorEl.value = code;
  _updateLineNums();
  _saveActiveTabContent();
  // Marquer tab comme modifié
  const tab = WMCode.tabs.find(t => t.id === WMCode.activeTabId);
  if (tab) tab.modified = true;
  _renderTabs();
  _codeToast('Code appliqué !', 'success');
}

// ══════════════════════════════════════════════════════════════
// 14. RATE LIMIT UI
// ══════════════════════════════════════════════════════════════

function _updateQuotaBadge() {
  if (!_quotaBadgeEl) return;
  const { used, limit } = WMCode.quota;
  const remaining = Math.max(0, limit - used);
  document.getElementById('wm-code-quota-text').textContent = `${remaining}/${limit} msg/h`;
  _quotaBadgeEl.classList.remove('quota-warn', 'quota-critical');
  if (remaining === 0) {
    _quotaBadgeEl.classList.add('quota-critical');
  } else if (remaining <= Math.ceil(limit * 0.3)) {
    _quotaBadgeEl.classList.add('quota-warn');
  }
}

function _buildRateLimitTable() {
  const table = document.getElementById('wm-code-plan-table');
  if (!table) return;
  const forfait = window._userForfait || 1;
  table.innerHTML = Object.entries(WM_CODE_CONFIG.rateLimits).map(([f, msgs]) => `
    <div class="rb-plan-row ${parseInt(f) === forfait ? 'current' : ''}">
      <span class="rp-name">${WM_CODE_CONFIG.forfaitNames[f]}</span>
      <span class="rp-val">${msgs} msg/h</span>
    </div>
  `).join('');
}

function _showRateLimitBlocker() {
  _rateblockerEl.classList.add('active');
  _buildRateLimitTable();
  _startCountdown();
}

function _hideRateLimitBlocker() {
  _rateblockerEl.classList.remove('active');
  if (_countdownTimer) clearInterval(_countdownTimer);
}

function _startCountdown() {
  const el = document.getElementById('wm-code-countdown');
  if (_countdownTimer) clearInterval(_countdownTimer);

  function update() {
    const ms = _msUntilNextHour();
    const totalSec = Math.ceil(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
    if (ms <= 0) {
      clearInterval(_countdownTimer);
      _hideRateLimitBlocker();
      WMCode.quota.used = 0;
      _updateQuotaBadge();
    }
  }
  update();
  _countdownTimer = setInterval(update, 1000);
}

// ══════════════════════════════════════════════════════════════
// 15. RESIZE HANDLE
// ══════════════════════════════════════════════════════════════

function _setupResizeHandle() {
  const handle = document.getElementById('wm-code-resize-handle');
  let startX, startW;

  handle.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startW = _panelEl.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';

    function onMove(e) {
      const delta = startX - e.clientX;
      const newW = Math.max(360, Math.min(window.innerWidth * 0.8, startW + delta));
      _panelEl.style.width = newW + 'px';
      document.body.style.setProperty('--code-panel-w', newW + 'px');
    }
    function onUp() {
      handle.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });
}

// ══════════════════════════════════════════════════════════════
// 16. TOAST
// ══════════════════════════════════════════════════════════════

function _codeToast(msg, type = '') {
  let toast = document.querySelector('.wm-code-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'wm-code-toast';
    document.body.appendChild(toast);
  }
  const icons = {
    success: '<svg class="ct-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg class="ct-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    '': '<svg class="ct-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  toast.className = `wm-code-toast ${type}`;
  toast.innerHTML = (icons[type] || icons['']) + msg;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ══════════════════════════════════════════════════════════════
// 17. API PUBLIQUE
// ══════════════════════════════════════════════════════════════

const WMCodePanel = {
  async open() {
    _buildPanel();
    WMCode.isOpen = true;
    _panelEl.classList.add('open');
    _overlayEl.classList.add('active');
    document.body.classList.add('code-panel-open');

    // Charger le quota
    await _loadCodeQuota();
    _updateQuotaBadge();

    // Update hint
    const forfait = window._userForfait || 1;
    const remaining = Math.max(0, WMCode.quota.limit - WMCode.quota.used);
    const hintEl = document.getElementById('wm-code-hint-text');
    if (hintEl) {
      hintEl.innerHTML = `Forfait <strong>${WM_CODE_CONFIG.forfaitNames[forfait]}</strong> — ${remaining} requêtes restantes cette heure · <a onclick="WMCodePanel.close()">⌘⇧K</a> pour fermer`;
    }

    // Focus input
    setTimeout(() => _aiInputEl && _aiInputEl.focus(), 100);
  },

  close() {
    if (!_panelEl) return;
    WMCode.isOpen = false;
    _panelEl.classList.remove('open');
    _overlayEl.classList.remove('active');
    document.body.classList.remove('code-panel-open', 'code-panel-wide');
    WMCode.isWide = false;

    // Annuler stream en cours
    if (WMCode.abortCtrl) WMCode.abortCtrl.abort();
  },

  toggle() {
    WMCode.isOpen ? this.close() : this.open();
  },
};

window.WMCodePanel = WMCodePanel;

// ══════════════════════════════════════════════════════════════
// 18. HOOK BOUTON SIDEBAR (code.js s'auto-connecte)
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Attendre que la page principale ait fini
  setTimeout(() => {
    const sidebarBtn = document.getElementById('sidebar-code-btn');
    if (!sidebarBtn) return;

    // Remplacer l'ancien listener simple par le nouveau système
    const newBtn = sidebarBtn.cloneNode(true);
    sidebarBtn.parentNode.replaceChild(newBtn, sidebarBtn);

    newBtn.addEventListener('click', () => {
      // Fermer la sidebar si ouverte
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
      }
      WMCodePanel.toggle();
      newBtn.classList.toggle('code-active', WMCode.isOpen);
    });

    // Exposer _wmDb si pas encore exposé (pour que code.js puisse y accéder)
    // Le script principal doit faire : window._wmDb = db; window._wmFireRef = ref; etc.
    // Si pas encore fait, on essaie de récupérer depuis les globals Firebase
    if (!window._wmDb) {
      // Polling léger
      const check = setInterval(() => {
        if (window._wmDb) { clearInterval(check); return; }
        // Essayer d'accéder via le db exposé par la page principale
        if (window.db) { window._wmDb = window.db; clearInterval(check); }
      }, 500);
    }
    if (!window._wmFireRef && window.firebaseRef) window._wmFireRef = window.firebaseRef;

  }, 600);
});

// ══════════════════════════════════════════════════════════════
// NOTE D'INTÉGRATION FIREBASE
// ══════════════════════════════════════════════════════════════
// Dans index.html, après l'import Firebase, ajouter :
//
//   window._wmDb        = db;
//   window._wmFireRef   = ref;
//   window._wmFireGet   = get;
//   window._wmFireSet   = set;
//   window._wmFireUpdate = update;
//
// Ces 5 lignes permettent à code.js d'accéder à Firebase
// sans re-importer le SDK.
// ══════════════════════════════════════════════════════════════
