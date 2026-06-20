/* ══════════════════════════════════════════════
   MODERATION — Wikimind Auto-Modération
   Analyse chaque message via mistral-moderation-2603
   et journalise les contenus suspects dans Firebase
   sous "wikimind5_flagged".
   ══════════════════════════════════════════════ */

(function () {

  const MODERATION_ENDPOINT = 'https://api.mistral.ai/v1/moderations';
  const MODERATION_MODEL    = 'mistral-moderation-2603';

  // Seuils — au-delà, le message est considéré comme suspect
  const THRESHOLDS = {
    sexual: 0.5,
    hate_and_discrimination: 0.5,
    violence_and_threats: 0.5,
    dangerous_and_criminal_content: 0.5,
    selfharm: 0.4,
    health: 0.7,
    financial: 0.7,
    law: 0.7,
    pii: 0.6,
  };

  let _apiKey = null;
  async function getKey() {
    if (_apiKey) return _apiKey;
    try {
      const r = await fetch('models.json');
      const d = await r.json();
      _apiKey = d.apiKeys?.mistral ?? '';
    } catch { _apiKey = ''; }
    return _apiKey;
  }

  // ── Analyse d'un message ─────────────────────────────────────────────────
  async function analyze(text) {
    if (!text || !text.trim()) return { flagged: false };

    const key = await getKey();
    if (!key) return { flagged: false, error: 'no_key' };

    try {
      const resp = await fetch(MODERATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODERATION_MODEL,
          input: [text],
        }),
      });

      if (!resp.ok) {
        console.warn('[Moderation] HTTP', resp.status);
        return { flagged: false, error: `http_${resp.status}` };
      }

      const data = await resp.json();
      const result = data.results?.[0];
      if (!result) return { flagged: false };

      const scores = result.category_scores || {};
      const categories = result.categories || {};

      let flagged = false;
      let topCategory = null;
      let topScore = 0;

      for (const [cat, score] of Object.entries(scores)) {
        if (score > topScore) { topScore = score; topCategory = cat; }
        const threshold = THRESHOLDS[cat] ?? 0.5;
        if (score >= threshold) flagged = true;
      }

      if (!flagged && Object.values(categories).some(v => v === true)) {
        flagged = true;
      }

      return { flagged, categories, scores, topCategory, topScore };

    } catch (err) {
      console.warn('[Moderation] error', err);
      return { flagged: false, error: err.message };
    }
  }

  // ── Enregistrer un message signalé dans Firebase ─────────────────────────
  async function reportMessage({ uid, userEmail, convId, msgId, content, result }) {
    try {
      const db   = window.db;
      const ref  = window._firebaseRef;
      const push = window._firebasePush;
      const set  = window._firebaseSet;

      if (!db || !ref || !push || !set) {
        console.warn('[Moderation] Firebase handles indisponibles, log impossible');
        return;
      }

      const entry = {
        uid: uid || 'anonyme',
        userEmail: userEmail || null,
        convId: convId || null,
        msgId: msgId || null,
        content: (content || '').slice(0, 2000),
        topCategory: result.topCategory || null,
        topScore: result.topScore || 0,
        scores: result.scores || {},
        categories: result.categories || {},
        status: 'pending', // pending | reviewed_ok | warned | banned
        ts: Date.now(),
      };

      const newRef = push(ref(db, 'wikimind5_flagged'));
      await set(newRef, entry);

      console.warn('[Moderation] Message signalé →', entry.topCategory, `(${(entry.topScore*100).toFixed(1)}%)`);
    } catch (err) {
      console.error('[Moderation] reportMessage error', err);
    }
  }

  // ── Point d'entrée principal : à appeler à chaque message utilisateur ────
  async function checkMessage({ uid, userEmail, convId, msgId, content }) {
    const result = await analyze(content);
    if (result.flagged) {
      await reportMessage({ uid, userEmail, convId, msgId, content, result });
    }
    return result;
  }

  // ── Exposer ───────────────────────────────────────────────────────────────
  window.WMModeration = { analyze, checkMessage, reportMessage, THRESHOLDS };

})();
