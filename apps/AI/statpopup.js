// ═══════════════════════════════════════════════
// STAT POPUP — Wikimind AI v5
// Lit wikimind5_public_stats dans Firebase
// Champs: model, modelName, provider, responseTime, ts, msgLength
// ═══════════════════════════════════════════════
(function () {
  'use strict';

  // ── Fournisseurs connus ──────────────────────────────────────────────────────
  const PROVIDER_LOGOS = {
    mistral:      'mistrallogo.png',
    groq:         'groqlogo.png',
    pollinations: 'pollinationai.png',
    cerebras:     'cerebraslogo.png',
    openai:       'openailogo.png',
  };

  const PROVIDER_NAMES = {
    mistral:      'Mistral',
    groq:         'Groq',
    pollinations: 'Pollinations',
    cerebras:     'Cerebras',
    openai:       'OpenAI',
  };

  // ── DOM ──────────────────────────────────────────────────────────────────────
  function injectDOM() {
    if (document.getElementById('stat-popup-overlay')) return;

    // Bouton dans #topbar-right, tout à gauche (avant les autres boutons)
    const topbarRight = document.getElementById('topbar-right');
    if (topbarRight) {
      const btn = document.createElement('button');
      btn.id = 'tb-stats';
      btn.className = 'tb-btn';
      btn.title = 'Statistiques des modèles';
      
      // L'image avec un svg de secours propre, sans conflit de guillemets
      btn.innerHTML = `<img src="statlogo.png" alt="Stats" width="17" height="17" style="border-radius:3px;object-fit:contain;" onerror="this.outerHTML='<svg width=&quot;15&quot; height=&quot;15&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot;><line x1=&quot;18&quot; y1=&quot;20&quot; x2=&quot;18&quot; y2=&quot;10&quot;/><line x1=&quot;12&quot; y1=&quot;20&quot; x2=&quot;12&quot; y2=&quot;4&quot;/><line x1=&quot;6&quot; y1=&quot;20&quot; x2=&quot;6&quot; y2=&quot;14&quot;/><line x1=&quot;3&quot; y1=&quot;20&quot; x2=&quot;21&quot; y2=&quot;20&quot;/></svg>'">`;
      
      // On l'insère en premier enfant de topbar-right pour le mettre à gauche
      topbarRight.insertBefore(btn, topbarRight.firstChild);
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        StatPopup.open();
      });
    }

    // Overlay + popup HTML
    const overlay = document.createElement('div');
    overlay.id = 'stat-popup-overlay';
    overlay.innerHTML = `
      <div id="stat-popup">
        <div id="stat-popup-header">
          <div id="stat-popup-icon">
            <img src="statlogo.png" alt="Stats" onerror="this.style.display='none'">
          </div>
          <div id="stat-popup-title-wrap">
            <h2>Statistiques des modèles</h2>
            <p>Données en direct — communauté Wikimind</p>
          </div>
          <button id="stat-popup-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div id="stat-summary-row">
          <div class="stat-summary-card">
            <div class="stat-summary-value" id="stat-total-msgs">—</div>
            <div class="stat-summary-label">Réponses</div>
          </div>
          <div class="stat-summary-card">
            <div class="stat-summary-value" id="stat-total-models">—</div>
            <div class="stat-summary-label">Modèles actifs</div>
          </div>
          <div class="stat-summary-card">
            <div class="stat-summary-value" id="stat-avg-cps">—</div>
            <div class="stat-summary-label">CPS moyen</div>
          </div>
          <div class="stat-summary-card">
            <div class="stat-summary-value" id="stat-avg-time">—</div>
            <div class="stat-summary-label">Temps moyen</div>
          </div>
        </div>

        <div id="stat-popup-body">
          <div id="stat-loading">
            <div class="stat-spinner"></div>
            Chargement des statistiques…
          </div>
          <div id="stat-models-list" style="display:none"></div>
          <div id="stat-no-data" class="stat-no-data" style="display:none">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <div>Aucune donnée disponible</div>
            <div style="font-size:0.72rem;color:#333">Les stats s'alimentent après vos premières conversations.</div>
          </div>
        </div>

        <div id="stat-popup-footer">
          <div class="stat-footer-note">Données anonymisées · Mise à jour en direct</div>
          <button id="stat-refresh-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            Actualiser
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Fermeture
    document.getElementById('stat-popup-close').addEventListener('click', StatPopup.close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) StatPopup.close();
    });
    document.getElementById('stat-refresh-btn').addEventListener('click', () => StatPopup.load());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) StatPopup.close();
    });
  }

  // ── Calcul des stats ─────────────────────────────────────────────────────────
  function computeStats(rawData) {
    // rawData est un object {id: {model, modelName, provider, responseTime, ts, msgLength}, ...}
    const byModel = {}; // clé = apiModelName

    Object.values(rawData).forEach(entry => {
      if (!entry || !entry.model) return;
      const key = entry.model;
      if (!byModel[key]) {
        byModel[key] = {
          apiModel:    entry.model,
          modelName:   entry.modelName || entry.model,
          provider:    entry.provider  || 'mistral',
          count:       0,
          totalTime:   0,      // ms
          totalLen:    0,      // chars
          timeSamples: 0,
          lenSamples:  0,
        };
      }
      const s = byModel[key];
      s.count++;

      if (entry.responseTime && entry.responseTime > 0) {
        s.totalTime += entry.responseTime;
        s.timeSamples++;
      }
      if (entry.msgLength && entry.msgLength > 0) {
        s.totalLen += entry.msgLength;
        s.lenSamples++;
      }
    });

    // Calculer les dérivés
    const results = Object.values(byModel).map(s => {
      const avgTime = s.timeSamples > 0 ? s.totalTime / s.timeSamples : 0;   // ms
      const avgLen  = s.lenSamples  > 0 ? s.totalLen  / s.lenSamples  : 0;   // chars
      // CPS = chars / secondes
      const cps = (avgTime > 0 && avgLen > 0) ? (avgLen / (avgTime / 1000)) : 0;
      return { ...s, avgTime, avgLen, cps };
    });

    // Trier par count décroissant
    results.sort((a, b) => b.count - a.count);
    return results;
  }

  // ── Formatters ───────────────────────────────────────────────────────────────
  function fmtTime(ms) {
    if (!ms || ms <= 0) return '—';
    return ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(1) + ' s';
  }
  function fmtCPS(cps) {
    if (!cps || cps <= 0) return '—';
    return Math.round(cps) + ' c/s';
  }
  function fmtLen(len) {
    if (!len || len <= 0) return '—';
    return len >= 1000 ? (len / 1000).toFixed(1) + ' k' : Math.round(len) + ' c';
  }
  function fmtCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  function renderStats(stats) {
    const list      = document.getElementById('stat-models-list');
    const loading   = document.getElementById('stat-loading');
    const noData    = document.getElementById('stat-no-data');

    loading.style.display = 'none';

    if (!stats || stats.length === 0) {
      list.style.display   = 'none';
      noData.style.display = 'flex';
      return;
    }

    noData.style.display = 'none';
    list.style.display   = 'block';
    list.innerHTML       = '';

    // Totaux pour les summary cards
    const totalMsgs    = stats.reduce((a, s) => a + s.count, 0);
    const activeModels = stats.filter(s => s.count > 0).length;
    const allCPS       = stats.filter(s => s.cps > 0).map(s => s.cps);
    const globalCPS    = allCPS.length ? allCPS.reduce((a, b) => a + b, 0) / allCPS.length : 0;
    const allTime      = stats.filter(s => s.avgTime > 0).map(s => s.avgTime);
    const globalTime   = allTime.length ? allTime.reduce((a, b) => a + b, 0) / allTime.length : 0;

    document.getElementById('stat-total-msgs').textContent   = fmtCount(totalMsgs);
    document.getElementById('stat-total-models').textContent = activeModels;
    document.getElementById('stat-avg-cps').textContent      = fmtCPS(globalCPS);
    document.getElementById('stat-avg-time').textContent     = fmtTime(globalTime);

    // Regrouper par provider
    const byProvider = {};
    stats.forEach(s => {
      const p = s.provider || 'mistral';
      if (!byProvider[p]) byProvider[p] = [];
      byProvider[p].push(s);
    });

    // Max CPS global pour la barre
    const maxCPS = Math.max(...stats.map(s => s.cps), 1);

    Object.entries(byProvider).forEach(([provider, models]) => {
      const section = document.createElement('div');
      section.className = 'stat-provider-section';

      const logoSrc = PROVIDER_LOGOS[provider] || '';
      const provName = PROVIDER_NAMES[provider] || provider;
      section.innerHTML = `
        <div class="stat-provider-label">
          ${logoSrc ? `<img src="${logoSrc}" alt="${provName}" onerror="this.style.display='none'">` : ''}
          ${provName}
        </div>
      `;

      models.forEach(s => {
        const card = document.createElement('div');
        card.className = 'stat-model-card';

        const cpsBarPct = maxCPS > 0 ? Math.min(100, (s.cps / maxCPS) * 100) : 0;
        const logoSrcM  = PROVIDER_LOGOS[s.provider] || '';

        card.innerHTML = `
          <div class="stat-model-head">
            <div class="stat-model-logo">
              ${logoSrcM ? `<img src="${logoSrcM}" alt="${s.provider}" onerror="this.style.display='none'">` : ''}
            </div>
            <div class="stat-model-names">
              <div class="stat-model-display">${escStatHtml(s.modelName)}</div>
              <div class="stat-model-api">${escStatHtml(s.apiModel)}</div>
            </div>
            <div class="stat-model-count">${fmtCount(s.count)} réponse${s.count > 1 ? 's' : ''}</div>
          </div>

          <div class="stat-model-metrics">
            <div class="stat-metric">
              <div class="stat-metric-label">CPS</div>
              <div class="stat-metric-value accent-cps">${fmtCPS(s.cps)}</div>
              <div class="stat-metric-sub">car. / seconde</div>
            </div>
            <div class="stat-metric">
              <div class="stat-metric-label">Temps moyen</div>
              <div class="stat-metric-value accent-time">${fmtTime(s.avgTime)}</div>
              <div class="stat-metric-sub">par réponse</div>
            </div>
            <div class="stat-metric">
              <div class="stat-metric-label">Taille moyenne</div>
              <div class="stat-metric-value accent-len">${fmtLen(s.avgLen)}</div>
              <div class="stat-metric-sub">caractères</div>
            </div>
          </div>

          ${s.cps > 0 ? `
          <div class="stat-cps-bar-wrap">
            <div class="stat-cps-bar-track">
              <div class="stat-cps-bar-fill" style="width:${cpsBarPct}%"></div>
            </div>
            <div class="stat-cps-bar-label">${fmtCPS(s.cps)}</div>
          </div>` : ''}
        `;

        section.appendChild(card);
      });

      list.appendChild(section);
    });
  }

  function escStatHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Chargement Firebase ───────────────────────────────────────────────────────
  async function loadStats() {
    const refreshBtn = document.getElementById('stat-refresh-btn');
    const loading    = document.getElementById('stat-loading');
    const list       = document.getElementById('stat-models-list');
    const noData     = document.getElementById('stat-no-data');

    if (refreshBtn) refreshBtn.classList.add('loading');
    loading.style.display  = 'flex';
    list.style.display     = 'none';
    noData.style.display   = 'none';

    // Réinitialiser summary
    ['stat-total-msgs','stat-total-models','stat-avg-cps','stat-avg-time']
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });

    try {
      // Utiliser les handles Firebase exposés par le script principal
      const db  = window.db;
      const ref = window._firebaseRef;
      const get = window._firebaseGet;

      if (!db || !ref || !get) {
        throw new Error('Firebase non disponible');
      }

      const snapshot = await get(ref(db, 'wikimind5_public_stats'));
      let stats = [];
      if (snapshot.exists()) {
        const raw = snapshot.val();
        stats = computeStats(raw);
      }

      renderStats(stats);

    } catch (err) {
      console.error('[StatPopup] Erreur chargement stats:', err);
      const loading = document.getElementById('stat-loading');
      if (loading) {
        loading.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style="color:#444">Impossible de charger les statistiques</div>
          <div style="font-size:0.7rem;color:#333">${escStatHtml(err.message)}</div>
        `;
        loading.style.display = 'flex';
      }
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('loading');
    }
  }

  // ── API publique ─────────────────────────────────────────────────────────────
  const StatPopup = {
    open() {
      injectDOM();
      const overlay = document.getElementById('stat-popup-overlay');
      if (!overlay) return;
      overlay.classList.add('open');
      this.load();
    },
    close() {
      const overlay = document.getElementById('stat-popup-overlay');
      if (overlay) overlay.classList.remove('open');
    },
    load: loadStats,
  };

  window.StatPopup = StatPopup;

  // Init DOM dès que possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDOM);
  } else {
    injectDOM();
  }
})();
