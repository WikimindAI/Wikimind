/* =============================================
   WIKIMIND SETTINGS MODAL — settings5.js
   Dépendances attendues dans index.html :
     - $(), toast(), openPersonalizeModal()
     - auth, db, ref, get, signOut  (Firebase)
     - currentUser, userId, overlay
   ============================================= */

const WM_SETTINGS_KEY = 'wm_app_settings';
let appSettings = {
  theme: 'system',
  animations: true,
  sounds: false,
  autosave: true,
  streaming: true,
  memoryEnabled: true
};
try { Object.assign(appSettings, JSON.parse(localStorage.getItem(WM_SETTINGS_KEY) || '{}')); } catch {}

function saveAppSettings() {
  localStorage.setItem(WM_SETTINGS_KEY, JSON.stringify(appSettings));
}

function applyTheme(theme) {
  const html = document.documentElement;
  html.removeAttribute('data-theme');
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else if (theme === 'system') {
    if (window.matchMedia('(prefers-color-scheme: light)').matches)
      html.setAttribute('data-theme', 'light');
  }
  document.querySelectorAll('.stg-theme-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.theme === theme)
  );
}

function openSettingsModal() {
  const emailEl  = document.getElementById('stg-account-email');
  const planEl   = document.getElementById('stg-account-plan');
  const avatarEl = document.getElementById('stg-avatar-initials');

  if (window.currentUser) {
    const email = window.currentUser.email || window.currentUser.displayName || 'Connecté';
    if (emailEl)  emailEl.textContent  = email;
    if (avatarEl) avatarEl.textContent = email[0].toUpperCase();

    if (window.userId && window.db) {
      // Forfait
      window._firebaseGet(window._firebaseRef(window.db, `wikimind5/users/${window.userId}/plan`))
        .then(snap => {
          const planNames = { 1:'Free', 2:'AI Plus', 3:'AI Pro', 4:'AI Premium', 5:'AI Premium+' };
          const p = snap.exists() ? snap.val() : 1;
          if (planEl) planEl.textContent = 'Forfait ' + (planNames[p] || 'Free');
        }).catch(() => {});

      // Mind Tokens
      window._firebaseGet(window._firebaseRef(window.db, `wikimind5/users/${window.userId}/tokens`))
        .then(snap => {
          const t = snap.exists() ? snap.val() : 0;
          const tokEl = document.getElementById('stg-tokens-count');
          if (tokEl) tokEl.textContent = `${Number(t).toLocaleString('fr-FR')} Mind Tokens disponibles`;
        }).catch(() => {
          const tokEl = document.getElementById('stg-tokens-count');
          if (tokEl) tokEl.textContent = '';
        });
    }
  } else {
    if (emailEl)  emailEl.textContent  = 'Non connecté';
    if (planEl)   planEl.textContent   = 'Forfait Free';
    if (avatarEl) avatarEl.textContent = '?';
    const tokEl = document.getElementById('stg-tokens-count');
    if (tokEl) tokEl.textContent = 'Connectez-vous pour voir vos tokens';
  }

  // Theme pills
  applyTheme(appSettings.theme);

  // Sync toggles
  const toggleMap = {
    'stg-animations-toggle': 'animations',
    'stg-sounds-toggle':     'sounds',
    'stg-autosave-toggle':   'autosave',
    'stg-streaming-toggle':  'streaming',
    'stg-memory-toggle':     'memoryEnabled',
  };
  Object.entries(toggleMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!appSettings[key];
  });

  document.getElementById('settings-overlay').classList.add('open');
}

function closeSettingsModal() {
  document.getElementById('settings-overlay').classList.remove('open');
}

// ── Event listeners ──────────────────────────────────────────────────────────

document.getElementById('stg-theme-pills')?.addEventListener('click', e => {
  const pill = e.target.closest('.stg-theme-pill');
  if (!pill) return;
  appSettings.theme = pill.dataset.theme;
  applyTheme(appSettings.theme);
  saveAppSettings();
});

const _stgToggleKeys = {
  'stg-animations-toggle': 'animations',
  'stg-sounds-toggle':     'sounds',
  'stg-autosave-toggle':   'autosave',
  'stg-streaming-toggle':  'streaming',
  'stg-memory-toggle':     'memoryEnabled',
};
Object.keys(_stgToggleKeys).forEach(id => {
  document.getElementById(id)?.addEventListener('change', e => {
    appSettings[_stgToggleKeys[id]] = e.target.checked;
    saveAppSettings();
    if (id === 'stg-streaming-toggle') {
      window._wmStreamingDisabled = !e.target.checked;
    }
  });
});

document.getElementById('stg-close-btn')?.addEventListener('click', closeSettingsModal);

document.getElementById('stg-signout-btn')?.addEventListener('click', async () => {
  closeSettingsModal();
  try {
    await window._firebaseSignOut(window.auth);
    if (typeof toast === 'function') toast("Déconnecté.");
  } catch {
    if (window.overlay) window.overlay.style.display = "flex";
  }
});

document.getElementById('stg-personalize-btn')?.addEventListener('click', () => {
  closeSettingsModal();
  if (typeof openPersonalizeModal === 'function') openPersonalizeModal();
});

document.getElementById('stg-help-btn')?.addEventListener('click', () => {
  closeSettingsModal();
  if (typeof toast === 'function') toast("Centre d'aide — Bientôt disponible");
});

document.getElementById('stg-tokens-row')?.addEventListener('click', () => {
  closeSettingsModal();
  if (typeof toast === 'function') toast("Mind Tokens — Consulte ton profil pour plus de détails");
});

document.getElementById('settings-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('settings-overlay')) closeSettingsModal();
});

// Apply theme on load
applyTheme(appSettings.theme);

// Expose globally
window.openSettingsModal  = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
