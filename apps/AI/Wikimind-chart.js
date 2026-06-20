/**
 * Wikimind Charts — Moteur de graphiques interactifs
 * Utilise Plotly.js pour des graphiques beaux et interactifs
 * 
 * COMMENT L'IA DOIT UTILISER CE SCRIPT :
 * =========================================
 * Pour tracer une courbe mathématique, utiliser le bloc :
 *   ```graphique
 *   type: courbe
 *   y = x^2 + 1
 *   xmin: -5
 *   xmax: 5
 *   ```
 * 
 * Pour un histogramme / bar chart :
 *   ```graphique
 *   type: barres
 *   labels: Lun, Mar, Mer, Jeu, Ven
 *   values: 12, 19, 7, 25, 14
 *   titre: Ventes de la semaine
 *   ```
 * 
 * Pour un graphique en camembert :
 *   ```graphique
 *   type: camembert
 *   labels: Chrome, Firefox, Safari, Edge
 *   values: 65, 15, 12, 8
 *   titre: Parts de marché navigateurs
 *   ```
 * 
 * Pour un nuage de points :
 *   ```graphique
 *   type: nuage
 *   x: 1, 2, 3, 4, 5
 *   y: 2, 4, 1, 6, 3
 *   titre: Nuage de points
 *   ```
 * 
 * Pour plusieurs courbes :
 *   ```graphique
 *   type: multicourbes
 *   courbe1: sin(x), label: sin(x)
 *   courbe2: cos(x), label: cos(x)
 *   xmin: -6.28
 *   xmax: 6.28
 *   titre: Fonctions trigonométriques
 *   ```
 */

// =========================================================
// CONFIG PLOTLY THEME WIKIMIND
// =========================================================
const WM_PLOTLY_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(20,20,20,0.6)',
  font: {
    family: 'Geist, Inter, sans-serif',
    color: '#a0a0a0',
    size: 11
  },
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.07)',
    linecolor: 'rgba(255,255,255,0.15)',
    tickcolor: 'rgba(255,255,255,0.15)',
    zerolinecolor: 'rgba(255,255,255,0.2)',
    zerolinewidth: 1,
    tickfont: { color: '#707070', size: 10 }
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.07)',
    linecolor: 'rgba(255,255,255,0.15)',
    tickcolor: 'rgba(255,255,255,0.15)',
    zerolinecolor: 'rgba(255,255,255,0.2)',
    zerolinewidth: 1,
    tickfont: { color: '#707070', size: 10 }
  },
  margin: { t: 40, r: 20, b: 50, l: 55 },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    bordercolor: 'rgba(255,255,255,0.1)',
    borderwidth: 1,
    font: { color: '#a0a0a0', size: 10 }
  },
  modebar: {
    bgcolor: 'rgba(0,0,0,0)',
    color: '#606060',
    activecolor: '#ffffff',
    orientation: 'h'
  }
};

const WM_PLOTLY_CONFIG = {
  displaylogo: false,
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['sendDataToCloud', 'editInChartStudio', 'toImage'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'wikimind_chart',
    scale: 2
  }
};

// Palette de couleurs Wikimind
const WM_COLORS = [
  '#4d8fff', '#ff6b6b', '#4ecdc4', '#ffe66d',
  '#a8e6cf', '#ff8b94', '#a29bfe', '#fd79a8',
  '#6c5ce7', '#00b894'
];

// =========================================================
// MATH EVAL (simple, safe)
// =========================================================
function wmEvalMath(expr, x) {
  // Utilise math.js si disponible, sinon fallback basique
  if (window.math) {
    try {
      return window.math.evaluate(expr, { x });
    } catch {
      return NaN;
    }
  }
  // Fallback : sécurisé
  try {
    const safe = expr
      .replace(/\^/g, '**')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs')
      .replace(/log/g, 'Math.log')
      .replace(/exp/g, 'Math.exp')
      .replace(/pi/g, 'Math.PI')
      .replace(/e(?![xp])/g, 'Math.E');
    return Function('x', `"use strict"; return (${safe})`)(x);
  } catch {
    return NaN;
  }
}

// =========================================================
// PARSEUR DE BLOC GRAPHIQUE
// =========================================================
function parseChartBlock(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const cfg = {};
  
  lines.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      // Ligne type "y = f(x)"
      if (/y\s*=/i.test(line)) cfg.equation = line;
      else if (!cfg.equation) cfg.raw = line;
      return;
    }
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim();
    cfg[key] = val;
  });

  // Détecter le type si non spécifié
  if (!cfg.type) {
    if (cfg.equation || /y\s*=/.test(text)) cfg.type = 'courbe';
    else if (cfg.labels && cfg.values) cfg.type = 'barres';
    else cfg.type = 'courbe';
  }

  return cfg;
}

// =========================================================
// RENDU DES DIFFÉRENTS TYPES
// =========================================================

function renderCourbe(container, cfg) {
  const expr = (cfg.equation || '').replace(/y\s*=/i, '').trim() || cfg.raw || 'x';
  const xmin = parseFloat(cfg.xmin ?? cfg['x min'] ?? -10);
  const xmax = parseFloat(cfg.xmax ?? cfg['x max'] ?? 10);
  const steps = 400;
  const dx = (xmax - xmin) / steps;

  const xs = [], ys = [];
  for (let i = 0; i <= steps; i++) {
    const x = xmin + i * dx;
    const y = wmEvalMath(expr, x);
    if (!isNaN(y) && isFinite(y) && Math.abs(y) < 1e6) {
      xs.push(parseFloat(x.toFixed(4)));
      ys.push(parseFloat(y.toFixed(6)));
    } else {
      xs.push(x);
      ys.push(null);
    }
  }

  const layout = {
    ...WM_PLOTLY_LAYOUT,
    title: {
      text: cfg.titre || `f(x) = ${expr}`,
      font: { color: '#e0e0e0', size: 13 },
      x: 0.05
    }
  };

  Plotly.newPlot(container, [{
    x: xs, y: ys,
    type: 'scatter', mode: 'lines',
    line: { color: WM_COLORS[0], width: 2.5, shape: 'spline', smoothing: 0.5 },
    name: `y = ${expr}`,
    hovertemplate: 'x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>'
  }], layout, WM_PLOTLY_CONFIG);
}

function renderMulticourbes(container, cfg) {
  const xmin = parseFloat(cfg.xmin ?? -10);
  const xmax = parseFloat(cfg.xmax ?? 10);
  const steps = 400;
  const dx = (xmax - xmin) / steps;
  const traces = [];

  let ci = 0;
  for (const key of Object.keys(cfg)) {
    if (!key.startsWith('courbe')) continue;
    const parts = cfg[key].split(',').map(s => s.trim());
    const expr = parts[0].replace(/y\s*=/i, '').trim();
    const label = parts.find(p => p.startsWith('label:'))?.replace('label:', '').trim() || expr;
    
    const xs = [], ys = [];
    for (let i = 0; i <= steps; i++) {
      const x = xmin + i * dx;
      const y = wmEvalMath(expr, x);
      xs.push(parseFloat(x.toFixed(4)));
      ys.push((!isNaN(y) && isFinite(y) && Math.abs(y) < 1e6) ? parseFloat(y.toFixed(6)) : null);
    }
    
    traces.push({
      x: xs, y: ys, type: 'scatter', mode: 'lines',
      line: { color: WM_COLORS[ci % WM_COLORS.length], width: 2.2, shape: 'spline', smoothing: 0.4 },
      name: label,
      hovertemplate: `<b>${label}</b><br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>`
    });
    ci++;
  }

  const layout = {
    ...WM_PLOTLY_LAYOUT,
    title: { text: cfg.titre || 'Graphique', font: { color: '#e0e0e0', size: 13 }, x: 0.05 },
    showlegend: true
  };

  Plotly.newPlot(container, traces, layout, WM_PLOTLY_CONFIG);
}

function renderBarres(container, cfg) {
  const labels = (cfg.labels || 'A,B,C').split(',').map(s => s.trim());
  const values = (cfg.values || '1,2,3').split(',').map(s => parseFloat(s.trim()));
  const orientation = cfg.orientation || 'v';

  const trace = orientation === 'h' ? {
    y: labels, x: values, type: 'bar', orientation: 'h',
    marker: {
      color: values.map((_, i) => WM_COLORS[i % WM_COLORS.length]),
      opacity: 0.85
    },
    hovertemplate: '%{y}: <b>%{x}</b><extra></extra>'
  } : {
    x: labels, y: values, type: 'bar',
    marker: {
      color: values.map((_, i) => WM_COLORS[i % WM_COLORS.length]),
      opacity: 0.85
    },
    hovertemplate: '%{x}: <b>%{y}</b><extra></extra>'
  };

  const layout = {
    ...WM_PLOTLY_LAYOUT,
    title: { text: cfg.titre || 'Diagramme en barres', font: { color: '#e0e0e0', size: 13 }, x: 0.05 },
    bargap: 0.3
  };

  Plotly.newPlot(container, [trace], layout, WM_PLOTLY_CONFIG);
}

function renderCamembert(container, cfg) {
  const labels = (cfg.labels || 'A,B,C').split(',').map(s => s.trim());
  const values = (cfg.values || '33,33,34').split(',').map(s => parseFloat(s.trim()));

  const layout = {
    ...WM_PLOTLY_LAYOUT,
    title: { text: cfg.titre || 'Répartition', font: { color: '#e0e0e0', size: 13 }, x: 0.05 },
    showlegend: true,
    margin: { t: 50, r: 20, b: 30, l: 20 }
  };

  Plotly.newPlot(container, [{
    type: 'pie',
    labels, values,
    hole: parseFloat(cfg.hole || '0.35'),
    marker: {
      colors: WM_COLORS.slice(0, values.length),
      line: { color: '#000', width: 1.5 }
    },
    textinfo: 'percent',
    textfont: { color: '#fff', size: 11 },
    hovertemplate: '<b>%{label}</b><br>%{value} (%{percent})<extra></extra>'
  }], layout, WM_PLOTLY_CONFIG);
}

function renderNuage(container, cfg) {
  const xs = (cfg.x || '1,2,3,4,5').split(',').map(s => parseFloat(s.trim()));
  const ys = (cfg.y || '1,2,3,4,5').split(',').map(s => parseFloat(s.trim()));

  const layout = {
    ...WM_PLOTLY_LAYOUT,
    title: { text: cfg.titre || 'Nuage de points', font: { color: '#e0e0e0', size: 13 }, x: 0.05 }
  };

  Plotly.newPlot(container, [{
    x: xs, y: ys, type: 'scatter', mode: 'markers',
    marker: {
      color: WM_COLORS[0], size: 8, opacity: 0.8,
      line: { color: '#fff', width: 0.5 }
    },
    hovertemplate: 'x: %{x}<br>y: %{y}<extra></extra>'
  }], layout, WM_PLOTLY_CONFIG);
}

function renderLigne(container, cfg) {
  const xs = (cfg.x || cfg.labels || '1,2,3,4,5').split(',').map(s => s.trim());
  const ys = (cfg.y || cfg.values || '1,2,3,4,5').split(',').map(s => parseFloat(s.trim()));

  const layout = {
    ...WM_PLOTLY_LAYOUT,
    title: { text: cfg.titre || 'Courbe', font: { color: '#e0e0e0', size: 13 }, x: 0.05 }
  };

  Plotly.newPlot(container, [{
    x: xs, y: ys, type: 'scatter', mode: 'lines+markers',
    line: { color: WM_COLORS[0], width: 2.5, shape: 'spline' },
    marker: { color: WM_COLORS[0], size: 6 },
    hovertemplate: '%{x}: <b>%{y}</b><extra></extra>'
  }], layout, WM_PLOTLY_CONFIG);
}

// =========================================================
// POINT D'ENTRÉE PRINCIPAL
// =========================================================
window.WMCharts = {
  /**
   * Rendre un graphique dans un conteneur DOM
   * @param {HTMLElement} container - Div cible
   * @param {string} blockText - Texte du bloc ```graphique ... ```
   */
  render(container, blockText) {
    // Vérifier que Plotly est chargé
    if (typeof Plotly === 'undefined') {
      container.innerHTML = `<div class="wm-chart-error">⚠️ Plotly non chargé</div>`;
      return;
    }

    try {
      const cfg = parseChartBlock(blockText);
      container.classList.add('wm-chart-rendered');

      switch (cfg.type.toLowerCase()) {
        case 'courbe':
        case 'curve':
        case 'function':
        case 'fonction':
          renderCourbe(container, cfg);
          break;
        case 'multicourbes':
        case 'multi':
          renderMulticourbes(container, cfg);
          break;
        case 'barres':
        case 'bar':
        case 'histogram':
        case 'histogramme':
          renderBarres(container, cfg);
          break;
        case 'camembert':
        case 'pie':
        case 'donut':
          renderCamembert(container, cfg);
          break;
        case 'nuage':
        case 'scatter':
          renderNuage(container, cfg);
          break;
        case 'ligne':
        case 'line':
        case 'lines':
          renderLigne(container, cfg);
          break;
        default:
          // Fallback : essayer comme courbe si on a une équation
          if (cfg.equation || cfg.raw) renderCourbe(container, cfg);
          else container.innerHTML = `<div class="wm-chart-error">Type "${cfg.type}" non reconnu</div>`;
      }
    } catch (err) {
      container.innerHTML = `<div class="wm-chart-error">Erreur graphique : ${err.message}</div>`;
      console.error('WMCharts error:', err);
    }
  },

  /**
   * Scanner un bubble et rendre tous ses graphiques
   * @param {HTMLElement} bubble
   */
  renderAll(bubble) {
    bubble.querySelectorAll('.wm-chart-container[data-chart-text]').forEach(container => {
      if (container.classList.contains('wm-chart-rendered')) return;
      const text = decodeURIComponent(container.dataset.chartText);
      this.render(container, text);
    });
  }
};
