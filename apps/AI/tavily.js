/* ================================================================
   TAVILY.JS — Recherche web temps réel pour Wikimind AI
   Détection avancée du besoin de recherche (scoring multi-signaux)
   + appel API Tavily + cache anti-gaspillage + gestion d'erreurs fine
   ================================================================ */
(function () {
  "use strict";

  // ---------------------------------------------------------------
  // 1. CONTEXTE TEMPOREL — pour que le modèle sache toujours "on est le combien"
  // ---------------------------------------------------------------
  function _nowParts() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris'
    });
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
    });
    return { now, dateStr, timeStr };
  }

  window._wmNowContext = function () {
    const { dateStr, timeStr } = _nowParts();
    return `Nous sommes le ${dateStr}, il est ${timeStr} (heure de Paris).`;
  };

  // ---------------------------------------------------------------
  // 2. MOTEUR DE DÉTECTION — scoring multi-signaux, pas un simple OU de mots-clés
  //    Chaque signal a un poids ; on additionne les poids des signaux présents.
  //    Seuil de déclenchement : score >= 3 (ajustable ci-dessous).
  // ---------------------------------------------------------------
  const SEARCH_THRESHOLD = 3;

  const SIGNALS = [
    // --- Temporalité explicite forte ---
    { w: 3, re: /\b(aujourd'?hui|en ce moment|actuellement|maintenant|à l'instant|présentement)\b/i },
    { w: 3, re: /\b(hier|avant[\s-]hier|cette semaine|ce week-?end|ce mois[\s-]ci|cette année)\b/i },
    { w: 2, re: /\b(demain|la semaine prochaine|le mois prochain)\b/i },

    // --- Demande explicite de recherche (l'utilisateur le dit clairement) ---
    { w: 6, re: /\b(cherche|recherche|v[ée]rifie|regarde|va voir)\s+(sur\s+)?(internet|le\s+net|le\s+web|en\s+ligne|google)\b/i },
    { w: 6, re: /\butilise\s+(la\s+)?recherche\s+web\b/i },

    // --- Actualité / nouvelles ---
    { w: 4, re: /\bdernières?\s+(nouvelles|actualit[ée]s|infos?)\b/i },
    { w: 3, re: /\bactualit[ée]s?\b/i },
    { w: 2, re: /\br[ée]cemment\b/i },
    { w: 2, re: /\bce\s+qui\s+se\s+passe\b/i },

    // --- Événements / résultats / compétitions ---
    { w: 4, re: /\bqui\s+a\s+gagn[ée]\b/i },
    { w: 3, re: /\br[ée]sultat[s]?\s+(du|de|d'|des)\b/i },
    { w: 3, re: /\bscore[s]?\s+(du|de|final)\b/i },
    { w: 2, re: /\bclassement\s+(actuel|général|en\s+direct)\b/i },

    // --- Données volatiles : bourse, crypto, prix, météo ---
    { w: 4, re: /\bcours\s+(du|de\s+l'|de\s+la)\s+(bourse|action|bitcoin|dollar|euro|crypto|ethereum)\b/i },
    { w: 3, re: /\bprix\s+(actuel|du|de)\b/i },
    { w: 4, re: /\bm[ée]t[ée]o\b/i },
    { w: 2, re: /\bcombien\s+co[uû]te\b/i },

    // --- Statut / poste actuel de quelqu'un (personnes, entreprises) ---
    { w: 4, re: /\bqui\s+est\s+(le|la|l')\s*(actuel|actuelle)?\s*(pr[ée]sident|premier\s+ministre|pdg|ceo|maire|ministre|patron)\b/i },
    { w: 2, re: /\best\s+(-t-)?(il|elle)\s+(toujours|encore)\b/i },   // "est-il toujours PDG"

    // --- Sorties / annonces récentes ---
    { w: 3, re: /\b(dernier|dernière|nouveau|nouvelle)\s+(album|film|jeu|match|livre|iphone|modèle|mise\s+à\s+jour)\b/i },
    { w: 3, re: /\bvient\s+de\s+(sortir|annoncer|publier|lancer|gagner)\b/i },

    // --- Années récentes / futures (signal faible seul, fort combiné) ---
    { w: 2, re: /\ben\s+202[6-9]\b/i },
    { w: 1, re: /\b202[6-9]\b/i },

    // --- Dates explicites précises : "20 août 2025", "15/03/2026", "en 2024" ---
    // Toute date précise mentionnée mérite vérification (l'utilisateur demande
    // souvent "que s'est-il passé le [date]" pour une date que le modèle ne connaît pas).
    { w: 4, re: /\b\d{1,2}\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+(19|20)\d{2}\b/i },
    { w: 3, re: /\b\d{1,2}\/\d{1,2}\/(19|20)\d{2}\b/ },
    { w: 1, re: /\ben\s+(19|20)\d{2}\b/i },
    { w: 3, re: /\b(que\s+s'est[\s-]il\s+pass[ée]|qu'est[\s-]ce\s+qui\s+s'est\s+pass[ée]|il\s+s'est\s+pass[ée]\s+quoi)\b/i },
  ];

  // Contextes où un mot-clé peut apparaître sans qu'une recherche ait du sens
  // (ex : demande de code contenant "2026" en commentaire, ou question théorique)
  const EXCLUDE_PATTERNS = [
    /```[\s\S]*```/,                          // gros bloc de code
    /\bfonction\s+\w+\s*\(/i,                 // extrait de code
    /\bimagine\s+(que|qu'|si)\b/i,            // hypothèse fictive ("imagine qu'on soit en 2026")
    /\bdans\s+un\s+monde\s+(imaginaire|fictif)\b/i,
  ];

  /**
   * Analyse un message et retourne :
   *  { needed: bool, score: number, forced: bool, cleanText: string }
   * - forced=true si l'utilisateur a explicitement tapé "/recherche ..." en début de message
   * - cleanText retire ce préfixe de commande avant d'envoyer la requête à Tavily
   */
  function detectSearchNeed(text) {
    if (!text || text.trim().length < 3) {
      return { needed: false, score: 0, forced: false, cleanText: text || "" };
    }

    // Forçage manuel explicite : /recherche, /search, /web en début de message
    const forceMatch = text.match(/^\s*\/(recherche|search|web)\b\s*/i);
    if (forceMatch) {
      return {
        needed: true,
        score: 99,
        forced: true,
        cleanText: text.slice(forceMatch[0].length).trim() || text
      };
    }

    for (const ex of EXCLUDE_PATTERNS) {
      if (ex.test(text)) {
        return { needed: false, score: 0, forced: false, cleanText: text };
      }
    }

    let score = 0;
    for (const s of SIGNALS) {
      if (s.re.test(text)) score += s.w;
    }

    return { needed: score >= SEARCH_THRESHOLD, score, forced: false, cleanText: text };
  }

  window._wmDetectSearchNeed = detectSearchNeed;

  // ---------------------------------------------------------------
  // 3. CACHE ANTI-GASPILLAGE — évite de reconsommer des crédits Tavily
  //    si (quasi) la même question revient dans un court laps de temps.
  // ---------------------------------------------------------------
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const CACHE_MAX_SIZE = 100;
  const _searchCache = new Map();

  function _cacheKey(query) {
    return query.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?!.,]+$/g, "");
  }

  function _getCached(query) {
    const hit = _searchCache.get(_cacheKey(query));
    if (hit && (Date.now() - hit.ts) < CACHE_TTL_MS) return hit.results;
    return null;
  }

  function _setCached(query, results) {
    const key = _cacheKey(query);
    _searchCache.set(key, { results, ts: Date.now() });
    if (_searchCache.size > CACHE_MAX_SIZE) {
      _searchCache.delete(_searchCache.keys().next().value);
    }
  }

  // ---------------------------------------------------------------
  // 4. APPEL API TAVILY — avec diagnostic d'erreur précis (auth/quota/réseau)
  // ---------------------------------------------------------------
  async function tavilySearch(query, opts = {}) {
    const key = (window.WM_API_KEYS && window.WM_API_KEYS.tavily) || "";
    if (!key) return { ok: false, reason: "no_key" };

    const cached = _getCached(query);
    if (cached) return { ok: true, results: cached, cached: true };

    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          query: query,
          search_depth: opts.depth || "basic",
          include_answer: false,
          max_results: opts.maxResults || 5,
          topic: opts.topic || "general"
        })
      });

      if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
      if (res.status === 429) return { ok: false, reason: "quota" };
      if (!res.ok) return { ok: false, reason: "http_" + res.status };

      const data = await res.json();
      const results = data.results || [];
      if (results.length > 0) _setCached(query, results);
      return { ok: true, results, cached: false };
    } catch (err) {
      console.warn("[Tavily] échec réseau :", err);
      return { ok: false, reason: "network" };
    }
  }

  window._wmTavilySearch = tavilySearch;

  // ---------------------------------------------------------------
  // 5. POINT D'ENTRÉE PRINCIPAL — appelé par sendMessage() avant chaque envoi.
  //    Ne montre JAMAIS de popup/notification : tout passe par setThinkingStep()
  //    (texte discret sous les points qui pulsent) et par le contexte caché
  //    envoyé au modèle, invisible dans la bulle utilisateur.
  // ---------------------------------------------------------------
  window.wmEnrichMessage = async function (fullContent) {
    const nowCtx = window._wmNowContext();
    const detection = detectSearchNeed(fullContent);
    let enrichedText = `[Contexte : ${nowCtx}]\n\n${fullContent}`;
    let extraSources = [];

    if (!detection.needed) {
      return { enrichedText, extraSources };
    }

    const hasKey = !!(window.WM_API_KEYS && window.WM_API_KEYS.tavily);

    if (!hasKey) {
      enrichedText = `[Contexte : ${nowCtx}]\n\nATTENTION : la question ci-dessous nécessite une information à jour (score de détection : ${detection.score}), mais aucune clé de recherche web n'est configurée. N'INVENTE AUCUN FAIT, AUCUNE DATE, AUCUN ÉVÉNEMENT RÉCENT. Dis clairement à l'utilisateur que tu ne peux pas vérifier cette information en temps réel.\n\n${fullContent}`;
      return { enrichedText, extraSources };
    }

    window.setThinkingStep?.("Recherche en cours...");
    const searchQuery = detection.cleanText || fullContent;
    const result = await tavilySearch(searchQuery);

    if (!result.ok) {
      const reasonText = {
        auth: "la clé API Tavily semble invalide",
        quota: "le quota de recherches est atteint pour l'instant",
        network: "la connexion à Tavily a échoué",
      }[result.reason] || "la recherche web a échoué";

      enrichedText = `[Contexte : ${nowCtx}]\n\nATTENTION : une recherche web a été tentée mais a échoué (${reasonText}). N'INVENTE AUCUN FAIT. Dis à l'utilisateur que tu n'as pas pu vérifier l'information en temps réel.\n\n${fullContent}`;
      return { enrichedText, extraSources };
    }

    if (!result.results || result.results.length === 0) {
      enrichedText = `[Contexte : ${nowCtx}]\n\nATTENTION : la recherche web n'a renvoyé aucun résultat pertinent pour cette question. N'INVENTE AUCUN FAIT. Dis-le à l'utilisateur.\n\n${fullContent}`;
      return { enrichedText, extraSources };
    }

    window.setThinkingStep?.("Analyse des sources...");
    const resultsBlock = result.results.map((r, i) =>
      `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content || "").slice(0, 500)}`
    ).join("\n\n");

    enrichedText = `[Contexte : ${nowCtx}]\n\n--- RÉSULTATS DE RECHERCHE WEB${result.cached ? " (cache récent)" : ""} ---\n${resultsBlock}\n--- FIN RÉSULTATS ---\nINSTRUCTIONS : Utilise ces résultats pour répondre avec des informations à jour et vérifiées. Cite tes sources avec leur numéro [1], [2] etc. Si les résultats ne répondent pas complètement à la question, dis-le explicitement et complète avec tes connaissances générales en le signalant clairement.\n\n${fullContent}`;

    extraSources = result.results.map(r => ({ title: r.title, url: r.url }));
    window.setThinkingStep?.("Wikimind réfléchit...");

    return { enrichedText, extraSources };
  };

})();
