/* =============================================
   QUIZ.JS — Wikimind AI v5
   Génération IA • QCM • Firebase • Résultats
   ============================================= */

(function() {
'use strict';

// ── STATE ──
let qzQuestions  = [];   // { id, question, options:[{letter,text}], correct, explanation }
let qzQuizId     = null; // ID Firebase
let qzQuizTitle  = '';
let qzCurrentIdx = 0;
let qzPanelOpen  = false;
let qzAnswers    = {};   // { questionIdx: letterChosen }
let qzMode       = 'quiz';  // 'quiz' | 'results'

// Config par défaut (modifiable via modal)
let qzConfig = {
  questionCount: 10,  // nb questions
  optionCount: 4      // nb propositions par question
};

// ── DOM REFS ──
let qzPanel, qzCardsArea, qzCountEl, qzNavIndicator, qzNavPrev, qzNavNext;
let qzProgressBar, qzResultsScreen;

// ── INIT ──
function init() {
  injectHTML();
  bindEvents();
  window.QuizEngine = { generate, openPanel, loadQuiz };
}

// ── INJECT HTML ──
function injectHTML() {
  const panel = document.createElement('div');
  panel.id = 'qz-panel';
  panel.innerHTML = `
    <div id="qz-panel-head">
      <div id="qz-panel-head-icon">
        <img src="quiz.png" alt="QCM" onerror="this.style.display='none'">
      </div>
      <div style="flex:1;min-width:0">
        <div id="qz-panel-title">QCM</div>
        <div id="qz-panel-subtitle">0 question</div>
      </div>
      <div id="qz-score-badge" style="display:none">0 / 0</div>
      <button id="qz-close-btn" title="Fermer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div id="qz-toolbar">
      <span id="qz-count">0 question</span>
      <button class="qz-tool-btn" id="qz-restart-btn" title="Recommencer" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        Rejouer
      </button>
      <button class="qz-tool-btn primary" id="qz-ai-regen-btn" title="Nouveau QCM sur le même sujet">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        IA
      </button>
    </div>
    <div id="qz-progress-bar-wrap" style="display:none">
      <div id="qz-progress-bar" style="width:0%"></div>
    </div>
    <div id="qz-nav" style="display:none">
      <button class="qz-nav-btn" id="qz-prev-btn" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span id="qz-nav-indicator">1 / 1</span>
      <button class="qz-nav-btn" id="qz-next-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div id="qz-cards-area">
      <div id="qz-empty">
        <img src="quiz.png" alt="">
        <p>Aucun QCM chargé.<br>Demandez à l'IA d'en créer un !</p>
      </div>
    </div>
    <div id="qz-results-screen">
      <div id="qz-result-ring-wrap"></div>
      <div id="qz-result-title"></div>
      <div id="qz-result-sub"></div>
      <div class="qz-result-stats" id="qz-result-stats"></div>
      <div class="qz-result-btns">
        <button class="qz-result-btn" id="qz-review-btn">Revoir les réponses</button>
        <button class="qz-result-btn primary" id="qz-replay-btn">Rejouer</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // Modal config
  const cfgModal = document.createElement('div');
  cfgModal.id = 'qz-config-overlay';
  cfgModal.innerHTML = `
    <div id="qz-config-box">
      <h3>
        <img src="quiz.png" alt="" onerror="this.style.display='none'">
        Configurer le QCM
      </h3>
      <div>
        <div class="qz-config-label">Nombre de questions</div>
        <div class="qz-config-pills" id="qz-cfg-q-pills">
          ${[5,10,15,20,30].map(n => `<button class="qz-config-pill${n===10?' active':''}" data-type="q" data-val="${n}">${n}</button>`).join('')}
        </div>
      </div>
      <div>
        <div class="qz-config-label">Propositions par question</div>
        <div class="qz-config-pills" id="qz-cfg-o-pills">
          ${[2,3,4,5].map(n => `<button class="qz-config-pill${n===4?' active':''}" data-type="o" data-val="${n}">${n}</button>`).join('')}
        </div>
      </div>
      <div class="qz-config-footer">
        <button class="qz-tool-btn" id="qz-cfg-cancel">Annuler</button>
        <button class="qz-tool-btn primary" id="qz-cfg-confirm">Générer le QCM</button>
      </div>
    </div>
  `;
  document.body.appendChild(cfgModal);
  cfgModal.addEventListener('click', e => { if (e.target === cfgModal) closeConfigModal(); });

  qzPanel      = document.getElementById('qz-panel');
  qzCardsArea  = document.getElementById('qz-cards-area');
  qzCountEl    = document.getElementById('qz-count');
  qzNavIndicator = document.getElementById('qz-nav-indicator');
  qzNavPrev    = document.getElementById('qz-prev-btn');
  qzNavNext    = document.getElementById('qz-next-btn');
  qzProgressBar  = document.getElementById('qz-progress-bar');
  qzResultsScreen = document.getElementById('qz-results-screen');
}

// ── BIND EVENTS ──
function bindEvents() {
  document.getElementById('qz-close-btn').addEventListener('click', closePanel);
  document.getElementById('qz-prev-btn').addEventListener('click', () => navigate(-1));
  document.getElementById('qz-next-btn').addEventListener('click', () => navigate(1));
  document.getElementById('qz-restart-btn').addEventListener('click', restartQuiz);
  document.getElementById('qz-ai-regen-btn').addEventListener('click', () => {
    if (qzQuestions.length > 0) openConfigModal(qzQuizTitle);
    else if (window.toast) window.toast('Lance un QCM depuis le chat d\'abord !');
  });

  // Résultats
  document.getElementById('qz-review-btn').addEventListener('click', () => {
    qzMode = 'review';
    qzResultsScreen.classList.remove('show');
    qzResultsScreen.style.display = 'none';
    qzCardsArea.style.display = 'flex';
    document.getElementById('qz-nav').style.display = 'flex';
    document.getElementById('qz-progress-bar-wrap').style.display = 'none';
    qzCurrentIdx = 0;
    renderCurrentCard();
    updateNav();
  });
  document.getElementById('qz-replay-btn').addEventListener('click', restartQuiz);

  // Config pills
  document.getElementById('qz-config-overlay').addEventListener('click', e => {
    const pill = e.target.closest('.qz-config-pill');
    if (!pill) return;
    const type = pill.dataset.type;
    const val  = parseInt(pill.dataset.val);
    document.querySelectorAll(`.qz-config-pill[data-type="${type}"]`).forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    if (type === 'q') qzConfig.questionCount = val;
    else              qzConfig.optionCount   = val;
  });
  document.getElementById('qz-cfg-cancel').addEventListener('click', closeConfigModal);
  document.getElementById('qz-cfg-confirm').addEventListener('click', () => {
    closeConfigModal();
    triggerGenFromChat();
  });
}

// ── CONFIG MODAL ──
let _pendingTopic = '';
function openConfigModal(topic) {
  _pendingTopic = topic || '';
  document.getElementById('qz-config-overlay').classList.add('open');
}
function closeConfigModal() {
  document.getElementById('qz-config-overlay').classList.remove('open');
}
function triggerGenFromChat() {
  // Relancer la génération depuis le chat avec la config actuelle
  if (!_pendingTopic) {
    if (window.toast) window.toast('Saisissez un sujet dans le chat !');
    return;
  }
  const { apiKey, model, userId, db, fbRef, push, fbSet } = getFirebaseHandles();
  generate(_pendingTopic, apiKey, model, userId, db, fbRef, push, fbSet, qzConfig.questionCount, qzConfig.optionCount)
    .then(result => {
      if (!result) return;
      if (window.appendQzFileCard) window.appendQzFileCard(result.title, result.questions.length, result.quizId);
      openPanel(result.title, result.questions, result.quizId);
    })
    .catch(() => { if (window.toast) window.toast('Erreur lors de la génération du QCM.'); });
}

// ── GENERATE ──
async function generate(topic, apiKey, model, userId, db, fbRef, push, fbSet, questionCount, optionCount) {
  const qCount  = Math.min(30, Math.max(3, questionCount  || qzConfig.questionCount));
  const oCount  = Math.min(5,  Math.max(2, optionCount    || qzConfig.optionCount));
  const letters = ['A','B','C','D','E'].slice(0, oCount);

  showQzThinking([
    'Ouverture du QCM Engine...',
    'Génération des questions...',
    'Finalisation du QCM...'
  ]);

  try {
    const isGroq = model && !model.startsWith('mistral') && !model.startsWith('codestral');
    const apiURL = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.mistral.ai/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    };

    const prompt = `Crée exactement ${qCount} questions de QCM (choix multiples) sur le sujet : "${topic}".
Chaque question doit avoir exactement ${oCount} propositions (${letters.join(', ')}).
Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.
Format EXACT :
{"title":"Titre du quiz","questions":[{"question":"Texte de la question","options":{"A":"option A","B":"option B"${oCount>=3?',"C":"option C"':''}${oCount>=4?',"D":"option D"':''}${oCount>=5?',"E":"option E"':''}},"correct":"A","explanation":"Explication courte"}]}`;

    const resp = await fetch(apiURL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'mistral-small-latest',
        max_tokens: 4000,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) throw new Error('API error ' + resp.status);
    const data = await resp.json();
    const raw  = data.choices?.[0]?.message?.content?.trim() || '';
    const clean = raw.replace(/^```json?\s*/i,'').replace(/```\s*$/,'').trim();
    const parsed = JSON.parse(clean);

    qzQuestions = (parsed.questions || []).map((q, i) => ({
      id: 'qz_' + Date.now() + '_' + i,
      question: q.question,
      options: Object.entries(q.options || {}).map(([letter, text]) => ({ letter, text })),
      correct: (q.correct || 'A').toUpperCase(),
      explanation: q.explanation || ''
    }));
    qzQuizTitle  = parsed.title || topic;
    qzCurrentIdx = 0;
    qzAnswers    = {};
    qzMode       = 'quiz';

    // Save Firebase
    if (userId && db && fbRef && push && fbSet) {
      try {
        const quizRef = push(fbRef(db, `wikimind5/users/${userId}/workflows/quiz`));
        qzQuizId = quizRef.key;
        const questionsObj = {};
        qzQuestions.forEach((q, i) => { questionsObj[q.id || ('q' + i)] = q; });
        await fbSet(quizRef, {
          title:     qzQuizTitle,
          questions: questionsObj,
          config:    { questionCount: qCount, optionCount: oCount },
          createdAt: Date.now(),
          topic
        });
      } catch (fbErr) { console.warn('QZ Firebase save error:', fbErr); }
    }

    hideQzThinking();
    return { title: qzQuizTitle, questions: qzQuestions, quizId: qzQuizId };

  } catch (err) {
    hideQzThinking();
    console.error('QZ generate error:', err);
    throw err;
  }
}

// ── LOAD QUIZ EXISTANT ──
async function loadQuiz(quizId, userId, db, fbRef, get) {
  try {
    const snap = await get(fbRef(db, `wikimind5/users/${userId}/workflows/quiz/${quizId}`));
    if (snap.exists()) {
      const data = snap.val();
      let rawQ = data.questions || [];
      if (!Array.isArray(rawQ) && typeof rawQ === 'object') rawQ = Object.values(rawQ);
      qzQuestions  = rawQ;
      qzQuizTitle  = data.title || 'QCM';
      qzQuizId     = quizId;
      qzAnswers    = {};
      qzMode       = 'quiz';
      openPanel(qzQuizTitle, qzQuestions, quizId);
    }
  } catch (e) { console.error('QZ loadQuiz error:', e); }
}

// ── OPEN / CLOSE PANEL ──
function openPanel(title, questions, quizId) {
  if (title)     qzQuizTitle  = title;
  if (questions) qzQuestions  = questions;
  if (quizId)    qzQuizId     = quizId;
  qzCurrentIdx = 0;
  qzAnswers    = {};
  qzMode       = 'quiz';

  renderAll();
  qzPanel.classList.add('open');
  document.body.classList.add('qz-panel-open');
  qzPanelOpen = true;
}

function closePanel() {
  qzPanel.classList.remove('open');
  document.body.classList.remove('qz-panel-open');
  qzPanelOpen = false;
}

// ── RENDER GLOBAL ──
function renderAll() {
  const empty   = document.getElementById('qz-empty');
  const nav     = document.getElementById('qz-nav');
  const progWrap = document.getElementById('qz-progress-bar-wrap');
  const restartBtn = document.getElementById('qz-restart-btn');
  const scoreBadge = document.getElementById('qz-score-badge');

  qzResultsScreen.classList.remove('show');
  qzResultsScreen.style.display = 'none';
  qzCardsArea.style.display = 'flex';

  if (!qzQuestions.length) {
    empty.style.display  = 'flex';
    nav.style.display    = 'none';
    progWrap.style.display = 'none';
    restartBtn.style.display = 'none';
    scoreBadge.style.display = 'none';
    qzCountEl.textContent = '0 question';
    return;
  }

  empty.style.display = 'none';
  nav.style.display   = 'flex';
  progWrap.style.display = 'block';
  restartBtn.style.display = 'none';
  scoreBadge.style.display = 'none';

  document.getElementById('qz-panel-title').textContent = qzQuizTitle;
  const n = qzQuestions.length;
  document.getElementById('qz-panel-subtitle').textContent = `${n} question${n>1?'s':''}`;
  qzCountEl.textContent = `${n} question${n>1?'s':''}`;

  renderCurrentCard();
  updateNav();
  updateProgress();
}

// ── RENDER CARTE COURANTE ──
function renderCurrentCard() {
  qzCardsArea.innerHTML = '';

  const q    = qzQuestions[qzCurrentIdx];
  if (!q) return;

  const answered = qzAnswers[qzCurrentIdx] !== undefined;
  const userLetter = qzAnswers[qzCurrentIdx];

  const card = document.createElement('div');
  card.className = 'qz-card' + (answered ? (userLetter === q.correct ? ' answered-correct' : ' answered-wrong') : '');

  const optionsHTML = q.options.map(opt => {
    let cls = 'qz-option';
    if (answered) {
      if (opt.letter === q.correct) cls += ' correct';
      else if (opt.letter === userLetter) cls += ' wrong';
    }
    return `
      <button class="${cls}" data-letter="${opt.letter}" ${answered || qzMode==='review' ? 'disabled' : ''}>
        <span class="qz-option-letter">${opt.letter}</span>
        <span>${escHtml(opt.text)}</span>
      </button>
    `;
  }).join('');

  const explanationCls = 'qz-explanation' + ((answered || qzMode==='review') && q.explanation ? ' show' : '');

  card.innerHTML = `
    <div class="qz-card-num">Question ${qzCurrentIdx + 1} / ${qzQuestions.length}</div>
    <div class="qz-card-question">${escHtml(q.question)}</div>
    <div class="qz-options">${optionsHTML}</div>
    ${q.explanation ? `<div class="${explanationCls}"><strong>Explication :</strong> ${escHtml(q.explanation)}</div>` : ''}
  `;

  // Bind clicks sur les options (mode quiz seulement)
  if (!answered && qzMode === 'quiz') {
    card.querySelectorAll('.qz-option').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(btn.dataset.letter, q, card));
    });
  }

  qzCardsArea.appendChild(card);
}

// ── RÉPONDRE ──
function handleAnswer(letter, q, card) {
  qzAnswers[qzCurrentIdx] = letter;

  // Mettre à jour visuellement sans re-render complet
  card.querySelectorAll('.qz-option').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.letter === q.correct) btn.classList.add('correct');
    else if (btn.dataset.letter === letter) btn.classList.add('wrong');
  });
  const expEl = card.querySelector('.qz-explanation');
  if (expEl) expEl.classList.add('show');

  const isCorrect = letter === q.correct;
  card.classList.add(isCorrect ? 'answered-correct' : 'answered-wrong');

  updateProgress();
  updateNav();
  updateScoreBadge();

  // Auto-avancer après 1.2s si bonne réponse et pas dernière question
  const allAnswered = Object.keys(qzAnswers).length === qzQuestions.length;
  if (allAnswered) {
    setTimeout(() => showResults(), 900);
  } else if (isCorrect && qzCurrentIdx < qzQuestions.length - 1) {
    setTimeout(() => { navigate(1); }, 1200);
  }
}

// ── NAVIGATION ──
function navigate(dir) {
  const newIdx = qzCurrentIdx + dir;
  if (newIdx < 0 || newIdx >= qzQuestions.length) return;
  qzCurrentIdx = newIdx;
  renderCurrentCard();
  updateNav();
  updateProgress();
}

function updateNav() {
  qzNavPrev.disabled = qzCurrentIdx === 0;
  qzNavNext.disabled = qzCurrentIdx === qzQuestions.length - 1;
  qzNavIndicator.textContent = `${qzCurrentIdx + 1} / ${qzQuestions.length}`;
}

function updateProgress() {
  const answered = Object.keys(qzAnswers).length;
  const pct = qzQuestions.length ? (answered / qzQuestions.length * 100) : 0;
  qzProgressBar.style.width = pct + '%';
}

function updateScoreBadge() {
  const scoreBadge = document.getElementById('qz-score-badge');
  const correct = Object.entries(qzAnswers).filter(([idx, letter]) => qzQuestions[+idx]?.correct === letter).length;
  const total   = Object.keys(qzAnswers).length;
  scoreBadge.style.display = total > 0 ? 'flex' : 'none';
  scoreBadge.textContent = `${correct} / ${total}`;
}

// ── RÉSULTATS ──
function showResults() {
  const total   = qzQuestions.length;
  const correct = qzQuestions.filter((q, i) => qzAnswers[i] === q.correct).length;
  const wrong   = total - correct;
  const pct     = Math.round(correct / total * 100);

  // Ring
  const ringClass = pct >= 75 ? 'great' : pct >= 50 ? 'ok' : 'poor';
  const emoji     = pct >= 75 ? '🎉' : pct >= 50 ? '👍' : '💪';
  const msg       = pct >= 75 ? 'Excellent travail !' : pct >= 50 ? 'Pas mal !' : 'Continue à t\'entraîner !';

  document.getElementById('qz-result-ring-wrap').innerHTML = `
    <div class="qz-result-ring ${ringClass}">
      <span class="qz-result-pct">${pct}%</span>
      <span class="qz-result-label">Score</span>
    </div>
  `;
  document.getElementById('qz-result-title').textContent = `${emoji} ${msg}`;
  document.getElementById('qz-result-sub').textContent = `${correct} bonne${correct>1?'s':''} réponse${correct>1?'s':''} sur ${total} question${total>1?'s':''}.`;
  document.getElementById('qz-result-stats').innerHTML = `
    <div class="qz-stat-box correct-box">
      <div class="qz-stat-n">${correct}</div>
      <div class="qz-stat-lbl">Correctes</div>
    </div>
    <div class="qz-stat-box wrong-box">
      <div class="qz-stat-n">${wrong}</div>
      <div class="qz-stat-lbl">Incorrectes</div>
    </div>
    <div class="qz-stat-box">
      <div class="qz-stat-n">${pct}%</div>
      <div class="qz-stat-lbl">Score</div>
    </div>
  `;

  qzMode = 'results';
  qzCardsArea.style.display = 'none';
  document.getElementById('qz-nav').style.display = 'none';
  document.getElementById('qz-progress-bar-wrap').style.display = 'none';
  document.getElementById('qz-restart-btn').style.display = 'flex';
  document.getElementById('qz-score-badge').style.display = 'flex';
  document.getElementById('qz-score-badge').textContent = `${correct} / ${total}`;

  qzResultsScreen.style.display = 'flex';
  qzResultsScreen.classList.add('show');
}

// ── RECOMMENCER ──
function restartQuiz() {
  qzAnswers    = {};
  qzCurrentIdx = 0;
  qzMode       = 'quiz';
  renderAll();
}

// ── THINKING ANIMATION ──
let _thinkingEl = null;
function showQzThinking(steps) {
  _thinkingEl = document.createElement('div');
  _thinkingEl.className = 'thinking-qz';
  _thinkingEl.innerHTML = `
    <div class="thinking-qz-icon">
      <img src="quiz.png" alt="" onerror="this.style.display='none'">
    </div>
    <span id="qz-thinking-text">${escHtml(steps[0])}</span>
  `;
  // Injecter dans le chat (même endroit que FC)
  const chat = document.getElementById('chat-messages') || document.getElementById('messages') || document.body;
  chat.appendChild(_thinkingEl);
  _thinkingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });

  let step = 0;
  const iv = setInterval(() => {
    step++;
    if (step < steps.length) {
      const t = _thinkingEl.querySelector('#qz-thinking-text');
      if (t) t.textContent = steps[step];
    } else {
      clearInterval(iv);
    }
  }, 1200);
  _thinkingEl._interval = iv;
}
function hideQzThinking() {
  if (_thinkingEl) {
    clearInterval(_thinkingEl._interval);
    _thinkingEl.remove();
    _thinkingEl = null;
  }
}

// ── FILE CARD (dans le chat) ──
window.appendQzFileCard = function(title, count, quizId) {
  const chat = document.getElementById('chat-messages') || document.getElementById('messages');
  if (!chat) return;
  const now  = new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
  const g    = document.createElement('div');
  g.innerHTML = `
    <div class="wm-qz-file-card" id="qz-file-card-${quizId}">
      <div class="wm-qz-file-icon">
        <img src="quiz.png" alt="QCM" onerror="this.style.display='none'">
      </div>
      <div class="wm-qz-file-info">
        <div class="wm-qz-file-name">${escHtml(title)}</div>
        <div class="wm-qz-file-meta">${count} question${count>1?'s':''} · ${now}</div>
      </div>
      <button class="wm-qz-file-open" data-quizid="${quizId}">Ouvrir</button>
    </div>
  `;
  g.querySelector('.wm-qz-file-card').addEventListener('click', () => openPanel());
  g.querySelector('.wm-qz-file-open').addEventListener('click', e => {
    e.stopPropagation();
    openPanel();
  });
  chat.appendChild(g.firstElementChild);
  g.firstElementChild?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
};

// ── CHIP DANS LA ROW D'INPUT ──
window.renderQzChip = function(active) {
  const row = document.getElementById('active-connectors-row');
  if (!row) return;
  const existing = row.querySelector('.qz-active-chip');
  if (existing) existing.remove();
  if (!active) return;
  const chip = document.createElement('div');
  chip.className = 'qz-active-chip';
  chip.innerHTML = `
    <img src="quiz.png" alt="QCM" onerror="this.style.display='none'">
    <span>QCM</span>
    <button class="qz-active-chip-remove" title="Désactiver">✕</button>
  `;
  chip.querySelector('.qz-active-chip-remove').addEventListener('click', () => {
    window._qzModeActive = false;
    chip.remove();
    if (window.toast) window.toast('Mode QCM désactivé');
  });
  row.appendChild(chip);
};

// ── HELPERS ──
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getFirebaseHandles() {
  return {
    apiKey: window._wmApiKey || '',
    model:  window._wmSelectedModelObj?.id || 'mistral-small-latest',
    userId: window._fcUserId || null,
    db:     window.db || null,
    fbRef:  window._firebaseRef || null,
    push:   window._firebasePush || null,
    fbSet:  window._firebaseSet  || null
  };
}

// ── AUTO-INIT ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
