// =====================================================================
// WIKIMIND — PANNEAU DE CODE LATÉRAL v2
// Nouvelles fonctionnalités :
//   • Coloration syntaxique Prism (chargé dynamiquement)
//   • Console d'erreurs (visible + accessible à l'IA)
//   • Format patch pour gros fichiers (search-replace + line-diff)
//   • Auto-switch vers Codestral (Mistral) dès que du code est détecté
//   • Resize handle entre chat et panneau (drag)
// ===================================================================== 

(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────
  // ÉTAT
  // ─────────────────────────────────────────────────────────────────────
  const state = {
    files: [],
    activeFileId: null,
    isOpen: false,
    userClosed: false,
    previewMode: false,
    consoleOpen: false,
    consoleErrors: [],    // { type, text, src, ts }
    splitPos: 50,         // % pour le chat (50 par défaut)
  };

  let panelEl, tabsEl, bodyEl, previewFrame, codeViewEl,
      reopenBtnEl, previewToggleBtn, consolePanelEl,
      consoleOutputEl, consoleToggleBtn, consoleBadgeEl,
      contentAreaEl, modelBadgeEl;

  // ─────────────────────────────────────────────────────────────────────
  // PRISM — chargement dynamique si absent
  // ─────────────────────────────────────────────────────────────────────
  function _loadPrism(cb) {
    if (window.Prism) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js";
    s.onload = () => {
      // Charge les composants langages courants
      const langs = ["markup","css","javascript","typescript","python","json","bash","yaml","sql","java","php","go","rust","c","cpp"];
      let loaded = 0;
      langs.forEach(lang => {
        const ls = document.createElement("script");
        ls.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`;
        ls.onload = () => { loaded++; if (loaded === langs.length && cb) cb(); };
        ls.onerror = () => { loaded++; if (loaded === langs.length && cb) cb(); };
        document.head.appendChild(ls);
      });
    };
    s.onerror = cb; // fallback sans coloration
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────────────────
  // LANGAGES
  // ─────────────────────────────────────────────────────────────────────
  const LANG_ALIASES = {
    js:"javascript", jsx:"javascript", mjs:"javascript",
    ts:"typescript", tsx:"typescript",
    py:"python", rb:"ruby", yml:"yaml",
    htm:"html", md:"markdown", sh:"bash", shell:"bash",
  };
  function normalizeLang(lang) {
    if (!lang) return "plaintext";
    const l = lang.toLowerCase().trim();
    return LANG_ALIASES[l] || l;
  }
  const PREVIEWABLE_LANGS = new Set(["html","css","javascript"]);
  function isPreviewable(file) {
    if (!file) return false;
    if (PREVIEWABLE_LANGS.has(file.lang)) return true;
    if (/<html[\s>]|<!doctype html/i.test(file.content || "")) return true;
    return false;
  }
  function extFromLang(lang) {
    const map = {
      html:"html",css:"css",javascript:"js",typescript:"ts",
      python:"py",json:"json",markdown:"md",bash:"sh",
      yaml:"yml",sql:"sql",xml:"xml",c:"c",cpp:"cpp",
      java:"java",php:"php",go:"go",rust:"rs",ruby:"rb",
    };
    return map[lang] || "txt";
  }
  // Prism classe par langage
  const PRISM_LANG = {
    javascript:"javascript",typescript:"typescript",html:"markup",xml:"markup",
    css:"css",python:"python",json:"json",bash:"bash",yaml:"yaml",
    sql:"sql",java:"java",php:"php",go:"go",rust:"rust",c:"c",cpp:"cpp",
  };

  let _fileCounter = 0;
  function genFileId() { return "wmcf-" + (++_fileCounter) + "-" + Date.now(); }

  // ─────────────────────────────────────────────────────────────────────
  // CODESTRAL AUTO-SWITCH
  // ─────────────────────────────────────────────────────────────────────
  // wm-large-6.3 = codestral-latest (262k ctx, spécialisé code)
  const CODE_MODEL_ID  = "wm-large-6.3";
  const CODE_MODEL_API = "codestral-latest";
  let _prevModelId     = null;   // pour restaurer si l'IA revient au chat normal

  function _isCodeRequest(text) {
    if (!text) return false;
    return /\b(code|script|function|class|html|css|javascript|python|json|programme|fichier|composant|page web|site web|fais[-\s]moi\s+un?\s+(site|script|code|programme)|corrige|debug|bug|erreur|modif|modifier|refactor)\b/i.test(text);
  }

  function _switchToCodestral() {
    if (typeof window.applyModelById !== "function") return;
    const cur = window._wmSelectedModelObj || null;
    if (cur && cur.id === CODE_MODEL_ID) return; // déjà actif
    _prevModelId = cur ? cur.id : null;
    window.applyModelById(CODE_MODEL_ID);
    _showModelBadge(true);
    if (typeof window.toast === "function") window.toast("⚡ Codestral activé pour le code");
  }

  function _showModelBadge(visible) {
    if (!modelBadgeEl) return;
    if (visible) {
      modelBadgeEl.textContent = "Codestral";
      modelBadgeEl.classList.add("visible");
    } else {
      modelBadgeEl.classList.remove("visible");
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // CONSOLE D'ERREURS
  // ─────────────────────────────────────────────────────────────────────
  function _addConsoleEntry(type, text, src) {
    const entry = { type, text, src: src || "", ts: Date.now() };
    state.consoleErrors.push(entry);
    _renderConsoleEntry(entry);
    // Met à jour badge
    const errCount = state.consoleErrors.filter(e => e.type === "error").length;
    if (consoleBadgeEl) {
      consoleBadgeEl.textContent = errCount;
      consoleBadgeEl.classList.toggle("has-errors", errCount > 0);
    }
    if (consoleToggleBtn) {
      consoleToggleBtn.classList.toggle("has-errors", errCount > 0);
    }
  }

  function _renderConsoleEntry(entry) {
    if (!consoleOutputEl) return;
    // Supprime message "vide"
    const empty = consoleOutputEl.querySelector(".wm-console-empty");
    if (empty) empty.remove();

    const icons = {
      error:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      log:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
    };
    const div = document.createElement("div");
    div.className = `wm-console-entry ${entry.type}`;
    div.innerHTML = `
      <span class="wm-console-entry-icon">${icons[entry.type] || icons.log}</span>
      <span class="wm-console-entry-text">${_esc(entry.text)}</span>
      ${entry.src ? `<span class="wm-console-entry-src">${_esc(entry.src)}</span>` : ""}
    `;
    consoleOutputEl.appendChild(div);
    consoleOutputEl.scrollTop = consoleOutputEl.scrollHeight;
  }

  function _clearConsole() {
    state.consoleErrors = [];
    if (consoleOutputEl) {
      consoleOutputEl.innerHTML = `<div class="wm-console-empty">Aucune entrée de console</div>`;
    }
    if (consoleBadgeEl) {
      consoleBadgeEl.textContent = "0";
      consoleBadgeEl.classList.remove("has-errors");
    }
    if (consoleToggleBtn) consoleToggleBtn.classList.remove("has-errors");
  }

  // Capture les messages de l'iframe preview
  window.addEventListener("message", e => {
    if (!e.data || e.data.__wmConsole !== true) return;
    _addConsoleEntry(e.data.type || "log", e.data.text, e.data.src);
    // Auto-ouvrir la console si erreur
    if (e.data.type === "error" && !state.consoleOpen) {
      _setConsoleOpen(true);
    }
  });

  function _setConsoleOpen(open) {
    state.consoleOpen = open;
    if (!consolePanelEl) return;
    consolePanelEl.classList.toggle("open", open);
    if (consoleToggleBtn) consoleToggleBtn.classList.toggle("active", open);
  }

  // ─────────────────────────────────────────────────────────────────────
  // GETTERS console pour l'IA
  // ─────────────────────────────────────────────────────────────────────
  function _getConsoleContext() {
    if (!state.consoleErrors.length) return "";
    const lines = state.consoleErrors.map(e => `[${e.type.toUpperCase()}] ${e.text}${e.src ? " (" + e.src + ")" : ""}`);
    return lines.join("\n");
  }

  // ─────────────────────────────────────────────────────────────────────
  // PATCH ENGINE — modifications de gros fichiers
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Applique un patch au contenu d'un fichier.
   * Deux formats supportés selon taille de modif :
   *
   * Format A — SEARCH_REPLACE (pour modifications ciblées) :
   *   <<<SEARCH
   *   texte exact à chercher
   *   ===REPLACE
   *   nouveau texte
   *   >>>END
   *
   * Format B — LINE_PATCH (pour petites modifs précises) :
   *   <<<LINE:42
   *   nouveau contenu de la ligne 42
   *   >>>END
   *
   * Retourne { ok, content, applied, errors }
   */
  function applyPatch(originalContent, patchText) {
    const results = { ok: true, content: originalContent, applied: 0, errors: [] };
    let content = originalContent;

    // Découpe les blocs de patch
    const blockRe = /<<<(SEARCH|LINE:\d+)([\s\S]*?)===(?:REPLACE)?([\s\S]*?)>>>END/g;
    let match;
    let anyBlock = false;

    while ((match = blockRe.exec(patchText)) !== null) {
      anyBlock = true;
      const directive = match[1];
      const part1 = match[2].replace(/^\n/, "").replace(/\n$/, "");
      const part2 = match[3].replace(/^\n/, "").replace(/\n$/, "");

      if (directive === "SEARCH") {
        const searchText = part1;
        const replaceText = part2;
        if (!content.includes(searchText)) {
          // Tentative de correspondance approximative (ignore espaces de fin)
          const lines = content.split("\n");
          const searchLines = searchText.split("\n").map(l => l.trimEnd());
          let found = false;
          outer: for (let i = 0; i <= lines.length - searchLines.length; i++) {
            for (let j = 0; j < searchLines.length; j++) {
              if (lines[i + j].trimEnd() !== searchLines[j]) continue outer;
            }
            // Trouvé
            const prefix = lines.slice(0, i).join("\n") + (i > 0 ? "\n" : "");
            const suffix = (i + searchLines.length < lines.length ? "\n" : "") + lines.slice(i + searchLines.length).join("\n");
            content = prefix + replaceText + suffix;
            results.applied++;
            found = true;
            break;
          }
          if (!found) {
            results.errors.push(`SEARCH non trouvé : "${searchText.slice(0, 60)}..."`);
            results.ok = false;
          }
        } else {
          content = content.replace(searchText, replaceText);
          results.applied++;
        }
      } else if (directive.startsWith("LINE:")) {
        const lineNum = parseInt(directive.split(":")[1], 10);
        const lines = content.split("\n");
        if (lineNum < 1 || lineNum > lines.length) {
          results.errors.push(`LINE:${lineNum} hors bornes (fichier = ${lines.length} lignes)`);
          results.ok = false;
        } else {
          lines[lineNum - 1] = part2;
          content = lines.join("\n");
          results.applied++;
        }
      }
    }

    if (!anyBlock) {
      // Pas de balises patch → c'est du code complet, on remplace tout
      results.content = patchText;
      results.applied = 1;
      return results;
    }

    results.content = content;
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────
  // DÉTECTION AUTO DU PATCH dans les messages IA
  // ─────────────────────────────────────────────────────────────────────
  function _extractPatchFromMessage(text) {
    // Cherche <<<SEARCH ou <<<LINE: dans le texte brut de la réponse IA
    return /<<<(?:SEARCH|LINE:\d+)/m.test(text);
  }

  // ─────────────────────────────────────────────────────────────────────
  // SYSTÈME DE PROMPT pour l'IA (instructions de patch)
  // ─────────────────────────────────────────────────────────────────────
  const PATCH_SYSTEM_HINT = `
Quand on te demande de modifier un fichier existant :
- Si la modification est petite/ciblée, utilise le format SEARCH_REPLACE :
  <<<SEARCH
  (texte exact à trouver dans le fichier, quelques lignes)
  ===REPLACE
  (nouveau texte de remplacement)
  >>>END
- Si la modification concerne une seule ligne précise, utilise :
  <<<LINE:42
  ===REPLACE
  (nouveau contenu de la ligne 42)
  >>>END
- Si tu réécris tout le fichier (refactor complet), donne le fichier entier sans balises patch.
- Tu peux enchaîner plusieurs blocs <<<...>>>END dans une même réponse.
- N'ajoute jamais de commentaires entre les balises.
`.trim();

  // Expose le hint pour que sendMessage puisse l'injecter dans le system prompt
  window.WMCodePanel_getPatchHint = function() {
    return PATCH_SYSTEM_HINT;
  };

  // ─────────────────────────────────────────────────────────────────────
  // API PUBLIQUE
  // ─────────────────────────────────────────────────────────────────────
  const WMCodePanel = {

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

    registerUploadedFile(name, content) {
      const ext = (name.split(".").pop() || "").toLowerCase();
      const extToLang = {
        html:"html",htm:"html",css:"css",js:"javascript",mjs:"javascript",
        ts:"typescript",py:"python",json:"json",md:"markdown",
        sh:"bash",yml:"yaml",yaml:"yaml",xml:"xml",sql:"sql",
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

    getActiveFile() {
      return this.getFile(state.activeFileId);
    },

    getAllFiles() {
      return state.files.slice();
    },

    /** Applique un patch IA sur le fichier actif */
    applyAIPatch(patchText) {
      const file = this.getActiveFile();
      if (!file) return { ok: false, errors: ["Aucun fichier actif"] };
      const result = applyPatch(file.content, patchText);
      if (result.ok || result.applied > 0) {
        file.content = result.content;
        _renderActiveFile();
        if (typeof window.toast === "function") {
          window.toast(`✓ ${result.applied} modification(s) appliquée(s)`);
        }
      }
      return result;
    },

    /** Contexte console à injecter dans le prompt IA */
    getConsoleContext() {
      return _getConsoleContext();
    },

    /** Contexte fichier actif à injecter dans le prompt */
    getActiveFileContext() {
      const f = this.getActiveFile();
      if (!f) return "";
      const lines = f.content.split("\n");
      const lineCount = lines.length;
      const header = `### Fichier actif : ${f.name} (${lineCount} lignes, ${f.lang})\n`;
      // Pour les très gros fichiers on tronque à 500 lignes pour le contexte
      // mais on donne l'intégralité si < 500 lignes
      const MAX = 500;
      if (lines.length <= MAX) {
        return header + "```" + f.lang + "\n" + f.content + "\n```";
      } else {
        const preview = lines.slice(0, MAX).join("\n");
        return header + `(Affichage limité aux ${MAX} premières lignes sur ${lineCount})\n\`\`\`${f.lang}\n${preview}\n...\n\`\`\``;
      }
    },

    /** Déclenche le switch codestral si le message semble du code */
    checkAndSwitchForCode(userText) {
      if (_isCodeRequest(userText) || state.files.length > 0) {
        _switchToCodestral();
      }
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

    toggle() { if (state.isOpen) this.close(); else this.open(); },
    isOpenState() { return state.isOpen; },

    reset() {
      state.files = [];
      state.activeFileId = null;
      _clearConsole();
      this.close();
      if (reopenBtnEl) reopenBtnEl.style.display = "none";
      _showModelBadge(false);
    },
  };

  // ─────────────────────────────────────────────────────────────────────
  // AUTO-OUVERTURE
  // ─────────────────────────────────────────────────────────────────────
  let _lastAutoOpenMsgId = null;
  function _maybeAutoOpen(msgId) {
    if (state.userClosed && _lastAutoOpenMsgId === msgId) return;
    _lastAutoOpenMsgId = msgId;
    WMCodePanel.open();
  }

  // ─────────────────────────────────────────────────────────────────────
  // ICÔNES & HELPERS
  // ─────────────────────────────────────────────────────────────────────
  const ICONS = {
    html:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e44d26" stroke-width="2"><path d="M4 3h16l-2 14-6 2-6-2z"/></svg>`,
    css:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#264de4" stroke-width="2"><path d="M4 3h16l-2 14-6 2-6-2z"/></svg>`,
    javascript: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f7df1e" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 9v6c0 1.1-.9 2-2 2s-2-.9-2-2"/><path d="M9 15V9"/></svg>`,
    typescript: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3178c6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M14 13h1c1.1 0 2 .9 2 2s-.9 2-2 2H14"/><line x1="9" y1="12" x2="16" y2="12"/><line x1="12" y1="12" x2="12" y2="17"/></svg>`,
    python:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3572A5" stroke-width="2"><path d="M12 2C8 2 7 4 7 6v2h5v1H5C3 9 2 10 2 13v3c0 3 1 4 3 4h2v-3c0-1.5 1-2 2-2h6c2 0 3-1 3-3V6c0-2-1-4-6-4z"/><path d="M12 22c4 0 5-2 5-4v-2h-5v-1h7c2 0 3-1 3-4v-3c0-3-1-4-3-4h-2v3c0 1.5-1 2-2 2H9c-2 0-3 1-3 3v4c0 2 1 4 6 4z"/></svg>`,
    json:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#cbcb41" stroke-width="2"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></svg>`,
    markdown:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#519aba" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15V9l3 3 3-3v6"/><path d="M17 9v6m-2-2l2 2 2-2"/></svg>`,
    bash:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4eaa25" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    default:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  };
  function _iconSvg(lang) { return ICONS[lang] || ICONS.default; }
  function _esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDU ONGLETS
  // ─────────────────────────────────────────────────────────────────────
  function _renderTabs() {
    if (!tabsEl) return;
    if (!state.files.length) { tabsEl.innerHTML = ""; return; }
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

  // ─────────────────────────────────────────────────────────────────────
  // RENDU CODE (avec coloration + numéros de ligne)
  // ─────────────────────────────────────────────────────────────────────
  function _renderCode(file) {
    if (previewFrame) previewFrame.style.display = "none";
    if (!codeViewEl) return;
    codeViewEl.style.display = "block";

    const lines = file.content.split("\n");
    const lineCount = lines.length;

    // Numéros de ligne
    const gutter = lines.map((_, i) => `<span>${i + 1}</span>`).join("");

    // Coloration syntaxique :
    // Prism si chargé + < 1000 lignes, sinon escaping simple
    const prismLang = PRISM_LANG[file.lang];
    let codeHtml;
    if (window.Prism && prismLang && lineCount <= 1000) {
      try {
        codeHtml = window.Prism.highlight(file.content, window.Prism.languages[prismLang] || window.Prism.languages.plain, prismLang);
      } catch {
        codeHtml = _esc(file.content);
      }
    } else {
      codeHtml = _esc(file.content);
    }

    codeViewEl.innerHTML = `
      <pre class="wm-code-pre">
        <div class="wm-code-gutter">${gutter}</div>
        <div class="wm-code-code"><code class="language-${file.lang}">${codeHtml}</code></div>
      </pre>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDU PREVIEW (iframe sandbox avec intercepteur console)
  // ─────────────────────────────────────────────────────────────────────
  function _buildPreviewDocument(activeFile) {
    const files = state.files;
    const htmlFile = files.find(f => f.lang === "html") || (activeFile.lang === "html" ? activeFile : null);
    const cssFiles = files.filter(f => f.lang === "css");
    const jsFiles  = files.filter(f => f.lang === "javascript");

    // Script intercepteur console (envoie les erreurs via postMessage)
    const consoleInterceptor = `
<script>
(function(){
  const _send = (type, args) => {
    const text = args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch { return String(a); }
    }).join(' ');
    window.parent.postMessage({ __wmConsole: true, type, text, src: 'preview' }, '*');
  };
  ['log','info','warn','error'].forEach(m => {
    const orig = console[m].bind(console);
    console[m] = (...args) => { orig(...args); _send(m === 'warn' ? 'warning' : m, args); };
  });
  window.addEventListener('error', e => {
    _send('error', [e.message + (e.filename ? ' (' + e.filename + ':' + e.lineno + ')' : '')]);
  });
  window.addEventListener('unhandledrejection', e => {
    _send('error', ['Unhandled rejection: ' + String(e.reason)]);
  });
})();
<\/script>`;

    let doc;
    if (htmlFile) {
      doc = htmlFile.content;
      const cssBlock = cssFiles.map(f => `<style>\n${f.content}\n</style>`).join("\n");
      const jsBlock  = jsFiles.map(f => `<script>\n${f.content}\n<\/script>`).join("\n");
      if (/<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, cssBlock + "\n</head>");
      else if (cssBlock) doc = cssBlock + "\n" + doc;
      if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, jsBlock + "\n</body>");
      else if (jsBlock) doc += "\n" + jsBlock;
    } else if (activeFile.lang === "css") {
      doc = `<!DOCTYPE html><html><head><style>${activeFile.content}</style></head><body><div style="padding:24px;font-family:sans-serif;color:#888;">Aperçu CSS</div></body></html>`;
    } else if (activeFile.lang === "javascript") {
      doc = `<!DOCTYPE html><html><head></head><body><div id="app" style="padding:24px;font-family:sans-serif;"></div><script>${activeFile.content}<\/script></body></html>`;
    } else {
      doc = `<!DOCTYPE html><html><body><pre>${_esc(activeFile.content)}</pre></body></html>`;
    }

    // Injecte intercepteur juste après <head>
    if (/<head>/i.test(doc)) doc = doc.replace(/<head>/i, "<head>" + consoleInterceptor);
    else doc = consoleInterceptor + doc;

    return doc;
  }

  function _renderPreview(file) {
    if (codeViewEl) codeViewEl.style.display = "none";
    if (!previewFrame) return;
    previewFrame.style.display = "block";
    previewFrame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-popups");
    // Clear console quand on (re)charge la preview
    _clearConsole();
    previewFrame.srcdoc = _buildPreviewDocument(file);
  }

  function _renderActiveFile() {
    const file = WMCodePanel.getFile(state.activeFileId);
    if (!file) {
      if (codeViewEl) codeViewEl.innerHTML = `<div class="wm-code-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Aucun fichier sélectionné</span></div>`;
      if (previewToggleBtn) previewToggleBtn.style.display = "none";
      return;
    }
    const canPreview = isPreviewable(file);
    if (previewToggleBtn) previewToggleBtn.style.display = canPreview ? "inline-flex" : "none";
    if (!canPreview) state.previewMode = false;

    if (state.previewMode && canPreview) {
      _renderPreview(file);
    } else {
      // Charge Prism si nécessaire
      if (!window.Prism && file.content.split("\n").length <= 1000) {
        _loadPrism(() => _renderCode(file));
      } else {
        _renderCode(file);
      }
    }
    _updatePreviewToggleLabel();
  }

  function _updatePreviewToggleLabel() {
    if (!previewToggleBtn) return;
    const codeSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
    const playSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    previewToggleBtn.innerHTML = state.previewMode ? `${codeSvg} Code` : `${playSvg} Aperçu`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // DÉTECTION CODE DANS LES MESSAGES IA
  // ─────────────────────────────────────────────────────────────────────
  const COMMAND_LIKE_LANGS = new Set(["bash","shell","sh","plaintext","text","console"]);
  WMCodePanel.scanMessageForCode = function (bubbleEl, msgId) {
    if (!bubbleEl || !msgId) return;
    const pres = bubbleEl.querySelectorAll("pre > code");
    pres.forEach((codeEl, idx) => {
      const langMatch = (codeEl.className || "").match(/language-(\S+)/);
      const lang = langMatch ? langMatch[1] : "plaintext";
      const content = codeEl.textContent || "";
      if (!content.trim()) return;
      const normLang = normalizeLang(lang);
      if (COMMAND_LIKE_LANGS.has(normLang)) {
        if (content.split("\n").length < 3 && content.length < 40) return;
      }
      const ext = extFromLang(normLang);
      const suggestedName = `fichier-${idx + 1}.${ext}`;
      WMCodePanel.registerAIFile(msgId + "-" + idx, normLang, content, suggestedName);
    });

    // Vérifie si la réponse contient un patch
    const bubbleText = bubbleEl.textContent || "";
    if (_extractPatchFromMessage(bubbleText)) {
      const result = WMCodePanel.applyAIPatch(bubbleText);
      if (!result.ok && result.errors.length) {
        console.warn("[WMCodePanel] Patch partiel:", result.errors);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // CONSTRUCTION DOM
  // ─────────────────────────────────────────────────────────────────────
  function _buildPanelDOM() {
    const chatWrap = document.getElementById("chat-wrap");
    if (!chatWrap || !chatWrap.parentNode) return;

    // Split wrapper
    const splitWrap = document.createElement("div");
    splitWrap.id = "wm-split-wrap";
    chatWrap.parentNode.insertBefore(splitWrap, chatWrap);
    splitWrap.appendChild(chatWrap);

    // Resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.id = "wm-resize-handle";
    splitWrap.appendChild(resizeHandle);

    // Panneau code
    panelEl = document.createElement("div");
    panelEl.id = "wm-code-panel";
    panelEl.innerHTML = `
      <div id="wm-code-panel-header">
        <div id="wm-code-tabs"></div>
        <div id="wm-code-panel-actions">
          <span id="wm-code-model-badge"></span>
          <button id="wm-code-preview-toggle" class="wm-code-action-btn" style="display:none;"></button>
          <button id="wm-console-toggle" class="wm-code-action-btn" title="Console">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="8 10 12 14 16 10"/></svg>
            Console
            <span class="wm-err-dot"></span>
          </button>
          <button id="wm-code-download" class="wm-code-action-btn" title="Télécharger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button id="wm-code-copy" class="wm-code-action-btn" title="Copier">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button id="wm-code-close" class="wm-code-action-btn" title="Fermer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div id="wm-code-panel-body">
        <div id="wm-code-content-area">
          <div id="wm-code-view"></div>
          <iframe id="wm-code-preview-frame" title="Aperçu en direct"></iframe>
        </div>
        <div id="wm-console-panel">
          <div id="wm-console-resize"></div>
          <div id="wm-console-header">
            <div id="wm-console-header-left">
              <span class="wm-console-title">Console</span>
              <span id="wm-console-error-badge">0</span>
            </div>
            <div id="wm-console-actions">
              <button class="wm-console-btn fix-btn" id="wm-console-fix-btn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Corriger par IA
              </button>
              <button class="wm-console-btn" id="wm-console-clear-btn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                Effacer
              </button>
            </div>
          </div>
          <div id="wm-console-output">
            <div class="wm-console-empty">Aucune entrée de console</div>
          </div>
        </div>
      </div>
    `;
    splitWrap.appendChild(panelEl);

    // Refs
    tabsEl          = document.getElementById("wm-code-tabs");
    bodyEl          = document.getElementById("wm-code-panel-body");
    codeViewEl      = document.getElementById("wm-code-view");
    previewFrame    = document.getElementById("wm-code-preview-frame");
    previewToggleBtn = document.getElementById("wm-code-preview-toggle");
    consolePanelEl  = document.getElementById("wm-console-panel");
    consoleOutputEl = document.getElementById("wm-console-output");
    consoleToggleBtn = document.getElementById("wm-console-toggle");
    consoleBadgeEl  = document.getElementById("wm-console-error-badge");
    contentAreaEl   = document.getElementById("wm-code-content-area");
    modelBadgeEl    = document.getElementById("wm-code-model-badge");

    // Events
    previewToggleBtn.addEventListener("click", () => {
      state.previewMode = !state.previewMode;
      _renderActiveFile();
    });

    consoleToggleBtn.addEventListener("click", () => {
      _setConsoleOpen(!state.consoleOpen);
    });

    document.getElementById("wm-console-clear-btn").addEventListener("click", _clearConsole);

    document.getElementById("wm-console-fix-btn").addEventListener("click", () => {
      const ctx = _getConsoleContext();
      if (!ctx) { if (typeof window.toast === "function") window.toast("Aucune erreur à corriger."); return; }
      const fileCtx = WMCodePanel.getActiveFileContext();
      const prompt = `Corrige ces erreurs de la console dans mon code :\n\n${ctx}\n\n${fileCtx}`;
      if (typeof window._wmInjectAndSend === "function") {
        window._wmInjectAndSend(prompt);
      } else {
        // Fallback : injecte dans l'input
        const input = document.getElementById("chat-input") || document.querySelector("textarea");
        if (input) { input.value = prompt; input.dispatchEvent(new Event("input")); }
      }
    });

    document.getElementById("wm-code-close").addEventListener("click", () => WMCodePanel.close());

    document.getElementById("wm-code-copy").addEventListener("click", () => {
      const file = WMCodePanel.getFile(state.activeFileId);
      if (!file) return;
      navigator.clipboard.writeText(file.content).then(() => {
        if (typeof window.toast === "function") window.toast("Copié !");
      });
    });

    document.getElementById("wm-code-download").addEventListener("click", () => {
      const file = WMCodePanel.getFile(state.activeFileId);
      if (!file) return;
      const blob = new Blob([file.content], { type: "text/plain" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
    });

    // Bouton rouvrir
    reopenBtnEl = document.createElement("button");
    reopenBtnEl.id = "wm-code-reopen-btn";
    reopenBtnEl.style.display = "none";
    reopenBtnEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Code`;
    reopenBtnEl.addEventListener("click", () => WMCodePanel.open());
    document.body.appendChild(reopenBtnEl);

    // ── Resize handle drag (split gauche/droite) ──────────────────────
    let _dragging = false, _dragStartX = 0, _dragStartPos = 0;
    resizeHandle.addEventListener("mousedown", e => {
      _dragging = true;
      _dragStartX = e.clientX;
      _dragStartPos = state.splitPos;
      document.body.classList.add("wm-resizing");
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    });
    document.addEventListener("mousemove", e => {
      if (!_dragging) return;
      const wrap = splitWrap.getBoundingClientRect();
      const newPos = Math.max(25, Math.min(75, ((e.clientX - wrap.left) / wrap.width) * 100));
      state.splitPos = newPos;
      document.documentElement.style.setProperty("--wm-split-pos", newPos + "%");
    });
    document.addEventListener("mouseup", () => {
      if (!_dragging) return;
      _dragging = false;
      document.body.classList.remove("wm-resizing");
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    });

    // ── Resize console (haut/bas) ─────────────────────────────────────
    let _cDragging = false, _cStartY = 0, _cStartH = 0;
    const consoleResizeEl = document.getElementById("wm-console-resize");
    consoleResizeEl.addEventListener("mousedown", e => {
      _cDragging = true;
      _cStartY = e.clientY;
      _cStartH = consolePanelEl.getBoundingClientRect().height;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";
      e.preventDefault();
    });
    document.addEventListener("mousemove", e => {
      if (!_cDragging) return;
      const delta = _cStartY - e.clientY;
      const newH = Math.max(80, Math.min(400, _cStartH + delta));
      consolePanelEl.style.maxHeight = newH + "px";
    });
    document.addEventListener("mouseup", () => {
      if (!_cDragging) return;
      _cDragging = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────
  function init() {
    _buildPanelDOM();
    // Charge Prism en arrière-plan dès le démarrage
    _loadPrism(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.WMCodePanel = WMCodePanel;
})();
