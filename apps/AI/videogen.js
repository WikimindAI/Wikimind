/* ══════════════════════════════════════════════
   VIDEOGEN — Wikimind Génération Vidéo (LTX-2)
   Via Pollinations AI — gen.pollinations.ai
   ══════════════════════════════════════════════ */

(function () {

  const POLLINATIONS_API = 'https://gen.pollinations.ai/v1/videos/generations';
  const VIDEO_MODEL      = 'ltx-2';
  const POLL_INTERVAL_MS = 4000;
  const POLL_MAX_TRIES   = 60; // ~4min max

  // ── Injection CSS ────────────────────────────────────────────────────────
  function injectCSS() {
    if (!document.querySelector('link[href="videogen.css"]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = 'videogen.css';
      document.head.appendChild(l);
    }
  }

  // ── Récupérer la clé Pollinations depuis models.json ────────────────────
  let _pollinationsKey = null;
  async function getKey() {
    if (_pollinationsKey) return _pollinationsKey;
    try {
      const r = await fetch('models.json');
      const d = await r.json();
      _pollinationsKey = d.apiKeys?.pollinations ?? '';
    } catch { _pollinationsKey = ''; }
    return _pollinationsKey;
  }

  // ── Build UI ─────────────────────────────────────────────────────────────
  function buildPanel() {
    if (document.getElementById('vg-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'vg-overlay';
    document.body.appendChild(overlay);

    const panel = document.createElement('div');
    panel.id = 'vg-panel';
    panel.innerHTML = `
      <div id="vg-header">
        <div id="vg-header-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <span>Génération Vidéo</span>
          <span id="vg-model-badge">LTX-2</span>
        </div>
        <div id="vg-header-right">
          <div id="vg-tokens-display">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span id="vg-tokens-count">—</span>
            <span id="vg-tokens-label">tokens</span>
          </div>
          <button id="vg-close" title="Fermer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="vg-body">
        <div id="vg-prompt-section">
          <label id="vg-prompt-label">Décrivez votre vidéo</label>
          <textarea id="vg-prompt" placeholder="Un coucher de soleil sur l'océan, vagues douces, lumière dorée..." rows="3" maxlength="500"></textarea>
          <div id="vg-prompt-meta">
            <span id="vg-char-count">0/500</span>
          </div>
        </div>

        <div id="vg-options">
          <div class="vg-option-group">
            <label>Durée</label>
            <div class="vg-select-wrap">
              <select id="vg-duration">
                <option value="3">3 secondes</option>
                <option value="5" selected>5 secondes</option>
                <option value="8">8 secondes</option>
              </select>
            </div>
          </div>
          <div class="vg-option-group">
            <label>Format</label>
            <div class="vg-select-wrap">
              <select id="vg-ratio">
                <option value="16:9" selected>16:9 Paysage</option>
                <option value="9:16">9:16 Portrait</option>
                <option value="1:1">1:1 Carré</option>
              </select>
            </div>
          </div>
        </div>

        <div id="vg-cost-info">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Coût : <strong>500 AI Tokens</strong> par vidéo
        </div>

        <button id="vg-generate-btn" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Générer la vidéo
        </button>

        <!-- Progress -->
        <div id="vg-progress" class="hidden">
          <div id="vg-progress-anim">
            <div class="vg-dot"></div><div class="vg-dot"></div><div class="vg-dot"></div>
          </div>
          <div id="vg-progress-text">Génération en cours…</div>
          <div id="vg-progress-sub">LTX-2 · cela peut prendre 1 à 3 minutes</div>
        </div>

        <!-- Result -->
        <div id="vg-result" class="hidden">
          <video id="vg-video" controls loop playsinline></video>
          <div id="vg-result-actions">
            <button class="vg-action-btn" id="vg-download-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Télécharger
            </button>
            <button class="vg-action-btn" id="vg-send-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Envoyer dans le chat
            </button>
            <button class="vg-action-btn" id="vg-retry-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
              Regénérer
            </button>
          </div>
        </div>

        <!-- Upgrade wall -->
        <div id="vg-upgrade-wall" class="hidden">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p>La génération vidéo est réservée aux abonnés <strong>Plus</strong> et <strong>Pro</strong>.</p>
          <button id="vg-upgrade-cta" onclick="WMForfait && WMForfait.open(); document.getElementById('vg-overlay').classList.remove('open'); document.getElementById('vg-panel').classList.remove('open');">
            Voir les forfaits →
          </button>
        </div>

        <!-- No tokens -->
        <div id="vg-no-tokens" class="hidden">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Plus assez de tokens aujourd'hui.<br><span>Recharge quotidienne à minuit.</span></p>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  // ── Ouvrir / Fermer ──────────────────────────────────────────────────────
  function open() {
    buildPanel();
    bindEvents();
    refreshTokenDisplay();
    checkAccess();
    document.getElementById('vg-overlay').classList.add('open');
    document.getElementById('vg-panel').classList.add('open');
  }

  function close() {
    const o = document.getElementById('vg-overlay');
    const p = document.getElementById('vg-panel');
    if (o) o.classList.remove('open');
    if (p) p.classList.remove('open');
  }

  // ── Vérifier accès ───────────────────────────────────────────────────────
  function checkAccess() {
    const tokens = window.WMAITokens;
    const upgradeWall = document.getElementById('vg-upgrade-wall');
    const noTokens    = document.getElementById('vg-no-tokens');
    const promptSec   = document.getElementById('vg-prompt-section');
    const options     = document.getElementById('vg-options');
    const costInfo    = document.getElementById('vg-cost-info');
    const genBtn      = document.getElementById('vg-generate-btn');

    if (!tokens || tokens.getForfait() < 2) {
      // Free — mur d'upgrade
      upgradeWall.classList.remove('hidden');
      promptSec.classList.add('hidden');
      options.classList.add('hidden');
      costInfo.classList.add('hidden');
      genBtn.classList.add('hidden');
      return;
    }

    if (!tokens.canGenerate()) {
      // Plus/Pro mais plus de tokens
      noTokens.classList.remove('hidden');
      genBtn.disabled = true;
      return;
    }

    // OK
    upgradeWall.classList.add('hidden');
    noTokens.classList.add('hidden');
    promptSec.classList.remove('hidden');
    options.classList.remove('hidden');
    costInfo.classList.remove('hidden');
    genBtn.classList.remove('hidden');
    updateGenerateBtn();
  }

  function refreshTokenDisplay() {
    const tokens = window.WMAITokens;
    const el = document.getElementById('vg-tokens-count');
    if (!el || !tokens) return;
    el.textContent = `${tokens.getTokens()} / ${tokens.getMax()}`;
  }

  function updateGenerateBtn() {
    const btn = document.getElementById('vg-generate-btn');
    const prompt = document.getElementById('vg-prompt');
    if (!btn || !prompt) return;
    const hasText = prompt.value.trim().length > 5;
    const canGen = window.WMAITokens?.canGenerate() ?? false;
    btn.disabled = !hasText || !canGen;
  }

  // ── Events ───────────────────────────────────────────────────────────────
  let _eventsBound = false;
  function bindEvents() {
    if (_eventsBound) return;
    _eventsBound = true;

    document.getElementById('vg-close').addEventListener('click', close);
    document.getElementById('vg-overlay').addEventListener('click', close);

    const prompt = document.getElementById('vg-prompt');
    const charCount = document.getElementById('vg-char-count');
    prompt.addEventListener('input', () => {
      charCount.textContent = `${prompt.value.length}/500`;
      updateGenerateBtn();
    });

    document.getElementById('vg-generate-btn').addEventListener('click', generate);
    document.getElementById('vg-retry-btn').addEventListener('click', () => {
      document.getElementById('vg-result').classList.add('hidden');
      updateGenerateBtn();
    });
  }

  // ── Génération ───────────────────────────────────────────────────────────
  let _currentVideoUrl = null;

  async function generate() {
    const promptVal = document.getElementById('vg-prompt').value.trim();
    if (!promptVal) return;

    const tokens = window.WMAITokens;
    if (!tokens || !tokens.canGenerate()) {
      checkAccess();
      return;
    }

    // Débit immédiat (optimiste)
    const spent = await tokens.spend(tokens.VIDEO_COST);
    if (!spent) { checkAccess(); return; }

    refreshTokenDisplay();

    // UI loading
    document.getElementById('vg-generate-btn').disabled = true;
    document.getElementById('vg-result').classList.add('hidden');
    document.getElementById('vg-progress').classList.remove('hidden');

    const duration = document.getElementById('vg-duration').value;
    const ratio    = document.getElementById('vg-ratio').value;
    const key      = await getKey();

    try {
      const body = {
        model: VIDEO_MODEL,
        prompt: promptVal,
        duration: parseInt(duration),
        aspectRatio: ratio,
      };

      const resp = await fetch(POLLINATIONS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'Authorization': `Bearer ${key}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();

      // Pollinations retourne soit directement une URL, soit un job id à poller
      if (data.url) {
        showResult(data.url);
      } else if (data.id) {
        await pollStatus(data.id, key);
      } else if (data.data?.[0]?.url) {
        showResult(data.data[0].url);
      } else {
        throw new Error('Réponse inattendue de l\'API');
      }

    } catch (err) {
      console.error('[VideoGen]', err);
      showError(err.message);
    }
  }

  // ── Polling statut ───────────────────────────────────────────────────────
  async function pollStatus(jobId, key) {
    const statusUrl = `https://gen.pollinations.ai/v1/videos/generations/${jobId}`;
    let tries = 0;

    while (tries < POLL_MAX_TRIES) {
      await sleep(POLL_INTERVAL_MS);
      tries++;

      const r = await fetch(statusUrl, {
        headers: key ? { 'Authorization': `Bearer ${key}` } : {},
      });

      if (!r.ok) continue;
      const d = await r.json();

      if (d.status === 'succeeded' || d.url) {
        showResult(d.url || d.data?.[0]?.url);
        return;
      }
      if (d.status === 'failed') {
        throw new Error('Génération échouée côté serveur');
      }

      const prog = document.getElementById('vg-progress-text');
      if (prog) prog.textContent = `Génération en cours… (${tries * 4}s)`;
    }

    throw new Error('Timeout — la génération a pris trop de temps');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Afficher résultat ────────────────────────────────────────────────────
  function showResult(url) {
    _currentVideoUrl = url;
    document.getElementById('vg-progress').classList.add('hidden');
    const result = document.getElementById('vg-result');
    const video  = document.getElementById('vg-video');
    video.src = url;
    result.classList.remove('hidden');
    video.play().catch(() => {});

    // Download
    document.getElementById('vg-download-btn').onclick = () => {
      const a = document.createElement('a');
      a.href = url; a.download = `wikimind-video-${Date.now()}.mp4`;
      a.click();
    };

    // Envoyer dans le chat
    document.getElementById('vg-send-btn').onclick = () => {
      injectVideoInChat(url);
      close();
    };
  }

  function showError(msg) {
    document.getElementById('vg-progress').classList.add('hidden');
    const btn = document.getElementById('vg-generate-btn');
    btn.disabled = false;
    btn.textContent = '⚠ Erreur — Réessayer';
    if (window.toast) window.toast(`Erreur vidéo : ${msg}`);
  }

  // ── Injecter dans le chat ────────────────────────────────────────────────
  function injectVideoInChat(url) {
    // Crée un message IA avec la vidéo intégrée
    const msgs = document.getElementById('messages-container') || document.getElementById('chat-messages');
    if (!msgs) return;

    const wrap = document.createElement('div');
    wrap.className = 'message ai-message videogen-message';
    wrap.innerHTML = `
      <div class="videogen-chat-block">
        <div class="videogen-chat-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          Vidéo générée par LTX-2
        </div>
        <video src="${url}" controls loop playsinline style="max-width:100%;border-radius:10px;margin-top:8px;"></video>
        <a href="${url}" download="wikimind-video.mp4" class="videogen-dl-link">Télécharger le MP4</a>
      </div>`;
    msgs.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Exposer ───────────────────────────────────────────────────────────────
  window.WMVideoGen = { open, close };

  // Auto-init CSS
  injectCSS();

})();
