// =====================================================================
// WIKIMIND — PANNEAU DE CODE LATÉRAL (façon Claude.ai)
// Détecte le code généré par l'IA, l'affiche dans un panneau à onglets,
// preview live pour HTML/CSS/JS, lecture/écriture de fichiers importés.
// Exposé sur window.WMCodePanel pour intégration depuis Wikimind_AI.html
// =====================================================================

(function () {
  "use strict";

  // ── État ──────────────────────────────────────────────────────────────────
  // Chaque fichier : { id, name, lang, content, source: 'ai'|'upload', msgId }
  const state = {
    files: [],          // tous les fichiers connus de la session (IA + uploads)
    activeFileId: null,
    isOpen: false,
    userClosed: false,  // l'utilisateur a fermé manuellement : on n'auto-rouvre plus pour CE message,
                         // mais un nouveau message avec du code peut réouvrir
    previewMode: false, // false = code, true = preview live
  };

  let panelEl, tabsEl, bodyEl, previewFrame, codeViewEl, reopenBtnEl, previewToggleBtn;

  // ── Détection du langage / "previewable" ────────────────────────────────
  const LANG_ALIASES = {
    js: "javascript", jsx: "javascript", mjs: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", yml: "yaml",
    htm: "html", md: "markdown", sh: "bash", shell: "bash",
  };

  function normalizeLang(lang) {
    if (!lang) return "plaintext";
    const l = lang.toLowerCase().trim();
    return LANG_ALIASES[l] || l;
  }

  // Un fichier est "previewable" si lui seul (ou combiné aux autres fichiers ouverts)
  // peut produire un rendu visuel dans une iframe.
  const PREVIEWABLE_LANGS = new Set(["html", "css", "javascript"]);

  function isPreviewable(file) {
    if (!file) return false;
    if (PREVIEWABLE_LANGS.has(file.lang)) return true;
    // HTML complet détecté même si le langage annoncé est faux (l'IA oublie parfois la balise)
    if (/<html[\s>]|<!doctype html/i.test(file.content || "")) return true;
    return false;
  }

  // ── Extension de fichier à partir du langage ────────────────────────────
  function extFromLang(lang) {
    const map = {
      html: "html", css: "css", javascript: "js", typescript: "ts",
      python: "py", json: "json", markdown: "md", bash: "sh",
      yaml: "yml", sql: "sql", xml: "xml", c: "c", cpp: "cpp",
      java: "java", php: "php", go: "go", rust: "rs", ruby: "rb",
    };
    return map[lang] || "txt";
  }

  let _fileCounter = 0;
  function genFileId() { return "wmcf-" + (++_fileCounter) + "-" + Date.now(); }

  // ── API publique ─────────────────────────────────────────────────────────
  const WMCodePanel = {
    /**
     * Enregistre un fichier de code détecté dans une réponse IA.
     * Si un fichier du même nom existe déjà pour ce msgId, son contenu est mis à jour
     * (utile pendant le streaming : le bloc grandit progressivement).
     */
    registerAIFile(msgId, lang, content, suggestedName) {
      const normLang = normalizeLang(lang);
      const name = suggestedName || `code-${msgId}-${normLang}.${extFromLang(normLang)}`;
      let file = state.files.find(f => f.msgId === msgId && f.name === name);
      if (file) {
        file.content = content;
        file.lang = normLang;
      } else {
        file = { id: genFileId(), name, lang: normLang, content, source: "ai", msgId };
        state.files.push(file);
      }
      _renderTabs();
      if (state.activeFileId === file.id || !state.activeFileId) {
        this.setActiveFile(file.id);
      }
      _maybeAutoOpen(msgId);
      return file.id;
    },

    /**
     * Enregistre un fichier importé par l'utilisateur (visible dans le panneau
     * dès l'upload, indépendamment de toute réponse IA).
     */
    registerUploadedFile(name, content) {
      // Devine le langage depuis l'extension
      const ext = (name.split(".").pop() || "").toLowerCase();
      const extToLang = {
        html: "html", htm: "html", css: "css", js: "javascript", mjs: "javascript",
        ts: "typescript", py: "python", json: "json", md: "markdown",
        sh: "bash", yml: "yaml", yaml: "yaml", xml: "xml", sql: "sql",
      };
      const lang = extToLang[ext] || "plaintext";
      let file = state.files.find(f => f.source === "upload" && f.name === name);
      if (file) {
        file.content = content;
      } else {
        file = { id: genFileId(), name, lang, content, source: "upload", msgId: null };
        state.files.push(file);
      }
      _renderTabs();
      this.setActiveFile(file.id);
      this.open();
      return file.id;
    },

    setActiveFile(fileId) {
      state.activeFileId = fileId;
      _renderTabs();
      _renderActiveFile();
    },

    getFile(fileId) {
      return state.files.find(f => f.id === fileId) || null;
    },

    getAllFiles() {
      return state.files.slice();
    },

    open() {
      state.isOpen = true;
      state.userClosed = false;
      document.body.classList.add("wm-code-panel-open");
      if (reopenBtnEl) reopenBtnEl.style.display = "none";
      _renderTabs();
      _renderActiveFile();
    },

    close() {
      state.isOpen = false;
      state.userClosed = true;
      document.body.classList.remove("wm-code-panel-open");
      if (reopenBtnEl) reopenBtnEl.style.display = state.files.length ? "flex" : "none";
    },

    toggle() {
      if (state.isOpen) this.close(); else this.open();
    },

    isOpenState() { return state.isOpen; },

    reset() {
      state.files = [];
      state.activeFileId = null;
      this.close();
      if (reopenBtnEl) reopenBtnEl.style.display = "none";
    },
  };

  // Auto-ouverture : dès qu'un fichier IA est enregistré pour un nouveau message,
  // on rouvre le panneau (sauf si l'utilisateur vient juste de le fermer pour CE message précis).
  let _lastAutoOpenMsgId = null;
  function _maybeAutoOpen(msgId) {
    if (state.userClosed && _lastAutoOpenMsgId === msgId) return; // l'utilisateur a fermé pour ce message précis : on respecte
    _lastAutoOpenMsgId = msgId;
    WMCodePanel.open();
  }

  // ── Icônes SVG inline (cohérent avec le reste de l'app, pas de dépendance externe) ──
  const ICONS = {
    html: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    css: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    javascript: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    typescript: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    python: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    json: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></svg>`,
    markdown: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15V9l3 3 3-3v6"/><path d="M17 9v6m-2-2l2 2 2-2"/></svg>`,
    bash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    default: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  };
  function _iconSvg(lang) { return ICONS[lang] || ICONS.default; }

  function _renderTabs() {
    if (!tabsEl) return;
    if (!state.files.length) {
      tabsEl.innerHTML = "";
      return;
    }
    tabsEl.innerHTML = state.files.map(f => `
      <button class="wm-code-tab${f.id === state.activeFileId ? " active" : ""}" data-file-id="${f.id}" title="${_esc(f.name)}">
        ${_iconSvg(f.lang)}
        <span class="wm-code-tab-name">${_esc(f.name)}</span>
      </button>
    `).join("");
    tabsEl.querySelectorAll(".wm-code-tab").forEach(btn => {
      btn.addEventListener("click", () => WMCodePanel.setActiveFile(btn.dataset.fileId));
    });
  }

  function _esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ── Rendu : contenu actif (code ou preview) ─────────────────────────────
  function _renderActiveFile() {
    const file = WMCodePanel.getFile(state.activeFileId);
    if (!file) {
      if (codeViewEl) codeViewEl.innerHTML = `<div class="wm-code-empty">Aucun fichier sélectionné</div>`;
      if (previewToggleBtn) previewToggleBtn.style.display = "none";
      return;
    }

    const canPreview = isPreviewable(file);
    if (previewToggleBtn) {
      previewToggleBtn.style.display = canPreview ? "inline-flex" : "none";
    }
    if (!canPreview) state.previewMode = false;

    if (state.previewMode && canPreview) {
      _renderPreview(file);
    } else {
      _renderCode(file);
    }
    _updatePreviewToggleLabel();
  }

  function _renderCode(file) {
    if (previewFrame) previewFrame.style.display = "none";
    if (!codeViewEl) return;
    codeViewEl.style.display = "block";
    const langClass = `language-${file.lang}`;
    codeViewEl.innerHTML = `<pre class="wm-code-pre"><code class="${langClass}">${_esc(file.content)}</code></pre>`;
    // Coloration syntaxique via marked/highlight si disponible globalement (l'app principale charge déjà marked)
    if (window.hljs) {
      try { window.hljs.highlightElement(codeViewEl.querySelector("code")); } catch {}
    }
  }

  // Combine les fichiers ouverts pertinents pour produire un document HTML complet pour la preview
  function _buildPreviewDocument(activeFile) {
    const files = state.files;
    const htmlFile = files.find(f => f.lang === "html") || (activeFile.lang === "html" ? activeFile : null);
    const cssFiles = files.filter(f => f.lang === "css");
    const jsFiles = files.filter(f => f.lang === "javascript");

    if (htmlFile) {
      let doc = htmlFile.content;
      // Injecte les CSS externes juste avant </head> si pas déjà liés
      const cssBlock = cssFiles.map(f => `<style>\n${f.content}\n</style>`).join("\n");
      const jsBlock = jsFiles.filter(f => f !== activeFile || activeFile.lang === "javascript")
        .map(f => `<script>\n${f.content}\n</script>`).join("\n");
      if (cssBlock && /<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, cssBlock + "\n</head>");
      else if (cssBlock) doc = cssBlock + "\n" + doc;
      if (jsBlock && /<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, jsBlock + "\n</body>");
      else if (jsBlock) doc += "\n" + jsBlock;
      return doc;
    }

    // Pas de fichier HTML : on construit un document minimal autour du fichier actif (CSS seul ou JS seul)
    if (activeFile.lang === "css") {
      return `<!DOCTYPE html><html><head><style>${activeFile.content}</style></head><body><div style="padding:24px;font-family:sans-serif;color:#888;">Aperçu CSS — ajoutez un fichier HTML pour voir le rendu complet.</div></body></html>`;
    }
    if (activeFile.lang === "javascript") {
      return `<!DOCTYPE html><html><head></head><body><div id="app" style="padding:24px;font-family:sans-serif;"></div><script>${activeFile.content}</script></body></html>`;
    }
    return `<!DOCTYPE html><html><body><pre>${_esc(activeFile.content)}</pre></body></html>`;
  }

  function _renderPreview(file) {
    if (codeViewEl) codeViewEl.style.display = "none";
    if (!previewFrame) return;
    previewFrame.style.display = "block";
    const doc = _buildPreviewDocument(file);
    // srcdoc dans une iframe sandboxée : aucun accès au DOM parent, exécution isolée
    previewFrame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-popups");
    previewFrame.srcdoc = doc;
  }

  function _updatePreviewToggleLabel() {
    if (!previewToggleBtn) return;
    const codeSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
    const playSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    previewToggleBtn.innerHTML = state.previewMode
      ? `${codeSvg} Code`
      : `${playSvg} Aperçu`;
  }

  // ── Détection automatique des blocs de code dans une réponse IA ─────────
  // Appelé depuis Wikimind_AI.html (dans addCodeButtons) avec la bulle de message et son msgId.
  const COMMAND_LIKE_LANGS = new Set(["bash", "shell", "sh", "plaintext", "text", "console"]);

  WMCodePanel.scanMessageForCode = function (bubbleEl, msgId) {
    if (!bubbleEl || !msgId) return;
    const pres = bubbleEl.querySelectorAll("pre > code");
    pres.forEach((codeEl, idx) => {
      const langMatch = (codeEl.className || "").match(/language-(\S+)/);
      const lang = langMatch ? langMatch[1] : "plaintext";
      const content = codeEl.textContent || "";
      if (!content.trim()) return;

      const normLang = normalizeLang(lang);

      // Heuristique : un one-liner de COMMANDE (bash, shell, texte brut sans langage précisé)
      // reste affiché inline dans le chat — pas besoin du panneau pour "npm install react".
      // Les langages structurés (html/css/js/python/...) ouvrent toujours le panneau, même courts :
      // un composant de 2 lignes ou un court extrait reste un vrai fichier à voir séparément.
      if (COMMAND_LIKE_LANGS.has(normLang)) {
        const lineCount = content.split("\n").length;
        if (lineCount < 3 && content.length < 40) return;
      }

      const ext = extFromLang(normLang);
      const suggestedName = `fichier-${idx + 1}.${ext}`;
      WMCodePanel.registerAIFile(msgId + "-" + idx, normLang, content, suggestedName);
    });
  };

  // ── Construction du DOM du panneau (appelé une fois au chargement) ──────
  function _buildPanelDOM() {
    const chatWrap = document.getElementById("chat-wrap");
    if (!chatWrap || !chatWrap.parentNode) return;

    // Wrapper horizontal autour de chat-wrap + panneau (split view)
    const splitWrap = document.createElement("div");
    splitWrap.id = "wm-split-wrap";
    chatWrap.parentNode.insertBefore(splitWrap, chatWrap);
    splitWrap.appendChild(chatWrap);

    panelEl = document.createElement("div");
    panelEl.id = "wm-code-panel";
    panelEl.innerHTML = `
      <div id="wm-code-panel-header">
        <div id="wm-code-tabs"></div>
        <div id="wm-code-panel-actions">
          <button id="wm-code-preview-toggle" class="wm-code-action-btn" style="display:none;"></button>
          <button id="wm-code-download" class="wm-code-action-btn" title="Télécharger">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button id="wm-code-copy" class="wm-code-action-btn" title="Copier">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button id="wm-code-close" class="wm-code-action-btn" title="Fermer le panneau">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div id="wm-code-panel-body">
        <div id="wm-code-view"></div>
        <iframe id="wm-code-preview-frame" style="display:none;" title="Aperçu en direct"></iframe>
      </div>
    `;
    splitWrap.appendChild(panelEl);

    tabsEl = document.getElementById("wm-code-tabs");
    bodyEl = document.getElementById("wm-code-panel-body");
    codeViewEl = document.getElementById("wm-code-view");
    previewFrame = document.getElementById("wm-code-preview-frame");
    previewToggleBtn = document.getElementById("wm-code-preview-toggle");

    previewToggleBtn.addEventListener("click", () => {
      state.previewMode = !state.previewMode;
      _renderActiveFile();
    });
    document.getElementById("wm-code-close").addEventListener("click", () => WMCodePanel.close());
    document.getElementById("wm-code-copy").addEventListener("click", () => {
      const file = WMCodePanel.getFile(state.activeFileId);
      if (!file) return;
      navigator.clipboard.writeText(file.content).then(() => {
        if (window.toast) window.toast("Copié !");
      });
    });
    document.getElementById("wm-code-download").addEventListener("click", () => {
      const file = WMCodePanel.getFile(state.activeFileId);
      if (!file) return;
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Bouton flottant pour rouvrir le panneau quand fermé manuellement
    reopenBtnEl = document.createElement("button");
    reopenBtnEl.id = "wm-code-reopen-btn";
    reopenBtnEl.style.display = "none";
    reopenBtnEl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Code`;
    reopenBtnEl.addEventListener("click", () => WMCodePanel.open());
    document.body.appendChild(reopenBtnEl);
  }

  // ── Initialisation ───────────────────────────────────────────────────────
  function init() {
    _buildPanelDOM();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.WMCodePanel = WMCodePanel;
})();
