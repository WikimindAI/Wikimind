/* ══════════════════════════════════════════════
   BYOK — Bring Your Own Key (Pollinations)
   Permet à l'utilisateur de connecter son propre
   compte Pollinations pour la génération d'images
   ══════════════════════════════════════════════ */

(function () {

  const STORAGE_KEY   = 'wikimind_byok_pollinations_key';
  const STORAGE_INFO  = 'wikimind_byok_pollinations_info';
  const AUTH_BASE     = 'https://enter.pollinations.ai/authorize';
  let _appKey = 'pk_k17pnl1BAXA1Lqsb';

  // Charger l'app key depuis models.json si dispo
  async function getAppKey() {
    try {
      const r = await fetch('models.json');
      const d = await r.json();
      _appKey = d.apiKeys?.pollinations_app_key || _appKey;
    } catch {}
    return _appKey;
  }

  // ── Stockage local ───────────────────────────────────────────────────────
  function getUserKey() {
    return localStorage.getItem(STORAGE_KEY);
  }
  function getUserInfo() {
    try { return JSON.parse(localStorage.getItem(STORAGE_INFO) || 'null'); }
    catch { return null; }
  }
  function setUserKey(key, info) {
    localStorage.setItem(STORAGE_KEY, key);
    if (info) localStorage.setItem(STORAGE_INFO, JSON.stringify(info));
  }
  function clearUserKey() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_INFO);
  }
  function isConnected() {
    return !!getUserKey();
  }

  // ── Démarrer le flow OAuth (redirect) ────────────────────────────────────
  async function connect() {
    const appKey = await getAppKey();
    const params = new URLSearchParams({
      redirect_uri: location.href.split('#')[0],
      client_id: appKey,
      scope: 'generate',
    });
    // On stocke un flag pour savoir au retour qu'on attend une clé BYOK
    sessionStorage.setItem('wikimind_byok_pending', '1');
    window.location.href = `${AUTH_BASE}?${params.toString()}`;
  }

  // ── Gérer le retour de redirection (fragment #api_key=sk_...) ────────────
  async function handleRedirect() {
    if (!location.hash) return false;
    const hashParams = new URLSearchParams(location.hash.slice(1));
    const apiKey = hashParams.get('api_key');
    const error  = hashParams.get('error');

    if (error) {
      // Nettoyer l'URL
      history.replaceState(null, '', location.pathname + location.search);
      sessionStorage.removeItem('wikimind_byok_pending');
      if (window.toast) window.toast("Connexion BYOK annulée");
      return false;
    }

    if (apiKey && sessionStorage.getItem('wikimind_byok_pending')) {
      sessionStorage.removeItem('wikimind_byok_pending');
      // Nettoyer le fragment de l'URL (la clé ne reste pas dans l'historique)
      history.replaceState(null, '', location.pathname + location.search);

      // Récupérer infos utilisateur (qui est connecté)
      let info = null;
      try {
        const r = await fetch('https://enter.pollinations.ai/api/device/userinfo', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (r.ok) info = await r.json();
      } catch {}

      setUserKey(apiKey, info);
      if (window.toast) window.toast(`Compte Pollinations connecté${info?.preferred_username ? " · " + info.preferred_username : ""} !`);
      _emit();
      return true;
    }
    return false;
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────
  function disconnect() {
    clearUserKey();
    if (window.toast) window.toast("Compte Pollinations déconnecté");
    _emit();
  }

  // ── Event bus ─────────────────────────────────────────────────────────────
  const _listeners = [];
  function onChange(fn) { _listeners.push(fn); }
  function _emit() { _listeners.forEach(fn => fn({ connected: isConnected(), info: getUserInfo() })); }

  // ── Exposer ───────────────────────────────────────────────────────────────
  window.WMBYOK = {
    connect, disconnect, isConnected, getUserKey, getUserInfo, onChange, handleRedirect
  };

  // Gérer un éventuel retour de redirection au chargement de la page
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleRedirect);
  } else {
    handleRedirect();
  }

})();
