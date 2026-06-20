/* ═══════════════════════════════════════════════════
   WIKIMIND AI v5 — sources.js  (v2)
   Sources : Jina, Tavily, OpenAI, Wikipedia, OpenRouter
   Personnalités soulignées + panneau latéral
   ═══════════════════════════════════════════════════ */

// ── 1. REGISTRE DES SOURCES ──────────────────────────────────────────────────

const PROVIDER_SOURCES = {

  // ── PROVIDERS IA EXISTANTS ────────────────────────────────────────────────
  pollinations: {
    name: "Pollinations AI",
    logo: "pollinationai.png",
    url: "https://pollinations.ai/",
    desc: "Génération d'images IA"
  },
  mistral: {
    name: "Mistral AI",
    logo: "mistrallogo.png",
    url: "https://chat.mistral.ai/chat",
    desc: "Modèles de langage"
  },
  groq: {
    name: "Groq",
    logo: "groqlogo.png",
    url: "https://groq.com/",
    desc: "Inférence ultra-rapide"
  },
  cerebras: {
    name: "Cerebras",
    logo: "cerebraslogo.png",
    url: "https://cerebras.ai/",
    desc: "Inférence wafer-scale"
  },
  jina: {
    name: "Jina Reader",
    logo: "jinalogo.png",
    url: "https://jina.ai/",
    desc: "Conversion URL → texte",
    badge: "READER",
    badgeClass: "sources-badge-jina"
  },
  tavily: {
    name: "Tavily Search",
    logo: "tavily.png",
    url: "https://app.tavily.com/",
    desc: "Recherche d'actualités IA",
    badge: "SEARCH",
    badgeClass: "sources-badge-tavily"
  },
  openai: {
    name: "OpenAI",
    logo: "openailogo.png",
    url: "https://openai.com/",
    desc: "Modèles OpenAI",
    badge: "GPT",
    badgeClass: "sources-badge-openai"
  },
  blackforestlabs: {
    name: "Black Forest Labs",
    logo: "blackforestlabs.png",
    url: "https://blackforestlabs.ai/",
    desc: "FLUX — modèles de génération d'images",
    badge: "FLUX",
    badgeClass: "sources-badge-bfl",
    invertInDark: true
  },
  wikipedia: {
    name: "Wikipedia",
    logo: "wikipedialogo.png",
    url: "https://www.wikipedia.org/",
    desc: "Encyclopédie libre",
    badge: "WIKI",
    badgeClass: "sources-badge-wikipedia"
  },

  // ── NOUVEAUX — IA INTERNATIONALE ─────────────────────────────────────────
  openrouter: {
    name: "OpenRouter",
    logo: "openrouterlogo.png",
    url: "https://openrouter.ai/",
    desc: "Routage multi-modèles IA",
    badge: "ROUTER",
    badgeClass: "sources-badge-openrouter"
  },
  microsoft: {
    name: "Microsoft",
    logo: "microsoftlogo.png",
    url: "https://www.microsoft.com/",
    desc: "Modèles Phi & Azure AI",
    badge: "MSFT",
    badgeClass: "sources-badge-microsoft"
  },
  anthropic: {
    name: "Anthropic",
    logo: "anthropiclogo.png",
    url: "https://www.anthropic.com/",
    desc: "Modèles Claude",
    badge: "CLAUDE",
    badgeClass: "sources-badge-anthropic"
  },
  google: {
    name: "Google DeepMind",
    logo: "googlelogo.png",
    url: "https://deepmind.google/",
    desc: "Gemini & modèles Google",
    badge: "GEMINI",
    badgeClass: "sources-badge-google"
  },
  meta: {
    name: "Meta AI",
    logo: "metalogo.png",
    url: "https://ai.meta.com/",
    desc: "Llama — modèles open source",
    badge: "LLAMA",
    badgeClass: "sources-badge-meta"
  },
  xai: {
    name: "xAI",
    logo: "xailogo.png",
    url: "https://x.ai/",
    desc: "Grok — IA par Elon Musk",
    badge: "GROK",
    badgeClass: "sources-badge-xai"
  },
  cohere: {
    name: "Cohere",
    logo: "coherelogo.png",
    url: "https://cohere.com/",
    desc: "Command — modèles d'entreprise",
    badge: "CMD",
    badgeClass: "sources-badge-cohere"
  },
  nvidia: {
    name: "NVIDIA NIM",
    logo: "nvidialogo.png",
    url: "https://build.nvidia.com/",
    desc: "Inférence GPU optimisée",
    badge: "NIM",
    badgeClass: "sources-badge-nvidia"
  },
  together: {
    name: "Together AI",
    logo: "togetherlogo.png",
    url: "https://www.together.ai/",
    desc: "Cloud d'inférence open source"
  },
  fireworks: {
    name: "Fireworks AI",
    logo: "fireworkslogo.png",
    url: "https://fireworks.ai/",
    desc: "Inférence rapide multi-modèles"
  },
  deepseek: {
    name: "DeepSeek",
    logo: "deepseeklogo.png",
    url: "https://www.deepseek.com/",
    desc: "Modèles IA chinois open source",
    badge: "R1",
    badgeClass: "sources-badge-deepseek"
  },
  qwen: {
    name: "Qwen / Alibaba",
    logo: "qwenlogo.png",
    url: "https://qwenlm.github.io/",
    desc: "Modèles Qwen d'Alibaba Cloud",
    badge: "QWEN",
    badgeClass: "sources-badge-qwen"
  },
  perplexity: {
    name: "Perplexity AI",
    logo: "perplexitylogo.png",
    url: "https://www.perplexity.ai/",
    desc: "Moteur de recherche IA",
    badge: "SEARCH",
    badgeClass: "sources-badge-perplexity"
  },
  huggingface: {
    name: "Hugging Face",
    logo: "huggingfacelogo.png",
    url: "https://huggingface.co/",
    desc: "Hub de modèles open source",
    badge: "HF",
    badgeClass: "sources-badge-hf"
  },
  stability: {
    name: "Stability AI",
    logo: "stabilitylogo.png",
    url: "https://stability.ai/",
    desc: "Stable Diffusion — images IA"
  },
  runway: {
    name: "Runway",
    logo: "runwaylogo.png",
    url: "https://runwayml.com/",
    desc: "Génération vidéo IA"
  },
  elevenlabs: {
    name: "ElevenLabs",
    logo: "elevenlabslogo.png",
    url: "https://elevenlabs.io/",
    desc: "Synthèse vocale IA",
    badge: "TTS",
    badgeClass: "sources-badge-elevenlabs"
  },
  replicate: {
    name: "Replicate",
    logo: "replicatelogo.png",
    url: "https://replicate.com/",
    desc: "Hébergement de modèles IA"
  },
  suno: {
    name: "Suno",
    logo: "sunologo.png",
    url: "https://suno.com/",
    desc: "Génération musicale IA"
  },
  udio: {
    name: "Udio",
    logo: "udiologo.png",
    url: "https://www.udio.com/",
    desc: "Génération musicale IA"
  },
  ideogram: {
    name: "Ideogram",
    logo: "ideogramlogo.png",
    url: "https://ideogram.ai/",
    desc: "Génération d'images avec texte"
  },
  midjourney: {
    name: "Midjourney",
    logo: "midjourneylogo.png",
    url: "https://www.midjourney.com/",
    desc: "Génération d'images artistiques"
  },
  leonardo: {
    name: "Leonardo AI",
    logo: "leonardologo.png",
    url: "https://leonardo.ai/",
    desc: "Génération d'images IA"
  },
  kling: {
    name: "Kling AI",
    logo: "klinglogo.png",
    url: "https://klingai.com/",
    desc: "Génération vidéo IA"
  },
  hailuo: {
    name: "Hailuo AI",
    logo: "hailuologo.png",
    url: "https://hailuoai.video/",
    desc: "Génération vidéo IA (MiniMax)"
  },
  sambanova: {
    name: "SambaNova",
    logo: "sambanovalogo.png",
    url: "https://sambanova.ai/",
    desc: "Inférence RDU ultra-rapide"
  },
  hyperbolic: {
    name: "Hyperbolic",
    logo: "hyperboliclogo.png",
    url: "https://hyperbolic.xyz/",
    desc: "GPU cloud pour l'inférence IA"
  },

  // ── NOUVEAUX — IA FRANÇAISE & EUROPÉENNE ──────────────────────────────────
  scaleway: {
    name: "Scaleway AI",
    logo: "scalewaylogo.png",
    url: "https://www.scaleway.com/fr/ia/",
    desc: "Inférence IA souveraine française",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  aleph_alpha: {
    name: "Aleph Alpha",
    logo: "alephalogo.png",
    url: "https://www.aleph-alpha.com/",
    desc: "IA souveraine européenne (Allemagne)",
    badge: "🇪🇺",
    badgeClass: "sources-badge-eu"
  },
  vigogne: {
    name: "Vigogne",
    logo: "vigognelogo.png",
    url: "https://huggingface.co/bofenghuang/vigogne-2-70b-chat",
    desc: "LLM open source français (Bofeng Huang)",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  camembert: {
    name: "CamemBERT",
    logo: "camembertlogo.png",
    url: "https://camembert-model.fr/",
    desc: "Modèle NLP français (Inria / FAIR)",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  bloom: {
    name: "BLOOM",
    logo: "bloomlogo.png",
    url: "https://huggingface.co/bigscience/bloom",
    desc: "LLM multilingue (BigScience / Inria)",
    badge: "🌍",
    badgeClass: "sources-badge-hf"
  },
  lefebvre: {
    name: "Lefebvre Dalloz IA",
    logo: "lefebvrelogo.png",
    url: "https://www.lefebvre-dalloz.fr/",
    desc: "IA juridique française",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  doctrine: {
    name: "Doctrine.fr",
    logo: "doctrinelogo.png",
    url: "https://www.doctrine.fr/",
    desc: "Recherche juridique IA en France",
    badge: "⚖️",
    badgeClass: "sources-badge-fr"
  },
  nabla: {
    name: "Nabla",
    logo: "nablalogo.png",
    url: "https://www.nabla.com/",
    desc: "Assistant IA médical français",
    badge: "🏥",
    badgeClass: "sources-badge-fr"
  },
  craft_ai: {
    name: "craft ai",
    logo: "craftailogo.png",
    url: "https://www.craft.ai/",
    desc: "IA industrielle française",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  holistic_ai: {
    name: "Holistic AI",
    logo: "holisticailogo.png",
    url: "https://www.holisticai.com/",
    desc: "Audit & gouvernance IA",
    badge: "🇪🇺",
    badgeClass: "sources-badge-eu"
  },

  // ── NOUVEAUX — RECHERCHE & DONNÉES ───────────────────────────────────────
  arxiv: {
    name: "arXiv",
    logo: "arxivlogo.png",
    url: "https://arxiv.org/",
    desc: "Prépublications scientifiques",
    badge: "PREPRINT",
    badgeClass: "sources-badge-arxiv"
  },
  semanticscholar: {
    name: "Semantic Scholar",
    logo: "semanticscholarlogo.png",
    url: "https://www.semanticscholar.org/",
    desc: "Recherche académique IA",
    badge: "S2",
    badgeClass: "sources-badge-s2"
  },
  wolframalpha: {
    name: "Wolfram Alpha",
    logo: "wolframlogo.png",
    url: "https://www.wolframalpha.com/",
    desc: "Moteur de calcul symbolique",
    badge: "CALC",
    badgeClass: "sources-badge-wolfram"
  },
  pubmed: {
    name: "PubMed",
    logo: "pubmedlogo.png",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    desc: "Articles médicaux et biomédicaux",
    badge: "MED",
    badgeClass: "sources-badge-pubmed"
  },
  insee: {
    name: "INSEE",
    logo: "inseelogo.png",
    url: "https://www.insee.fr/",
    desc: "Statistiques officielles françaises",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  data_gouv: {
    name: "data.gouv.fr",
    logo: "datagouvlogo.png",
    url: "https://www.data.gouv.fr/",
    desc: "Open data du gouvernement français",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  bnf: {
    name: "Gallica / BnF",
    logo: "bnflogo.png",
    url: "https://gallica.bnf.fr/",
    desc: "Bibliothèque numérique nationale française",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  europe_pmc: {
    name: "Europe PMC",
    logo: "europemclogo.png",
    url: "https://europepmc.org/",
    desc: "Littérature scientifique européenne",
    badge: "🇪🇺",
    badgeClass: "sources-badge-eu"
  },
  youcom: {
    name: "You.com Search",
    logo: "youcomlogo.png",
    url: "https://you.com/",
    desc: "Moteur de recherche IA",
    badge: "SEARCH",
    badgeClass: "sources-badge-perplexity"
  },
  brave_search: {
    name: "Brave Search",
    logo: "bravesearchlogo.png",
    url: "https://search.brave.com/",
    desc: "Moteur de recherche privé",
    badge: "SEARCH",
    badgeClass: "sources-badge-perplexity"
  },
  duckduckgo: {
    name: "DuckDuckGo",
    logo: "duckduckgologo.png",
    url: "https://duckduckgo.com/",
    desc: "Recherche sans tracking",
    badge: "SEARCH",
    badgeClass: "sources-badge-perplexity"
  },

  // ── NOUVEAUX — OUTILS DEV & INFRA IA ─────────────────────────────────────
  langchain: {
    name: "LangChain",
    logo: "langchainlogo.png",
    url: "https://www.langchain.com/",
    desc: "Framework d'agents et RAG"
  },
  llamaindex: {
    name: "LlamaIndex",
    logo: "llamaindexlogo.png",
    url: "https://www.llamaindex.ai/",
    desc: "Indexation et RAG pour LLM"
  },
  ollama: {
    name: "Ollama",
    logo: "ollamamlogo.png",
    url: "https://ollama.com/",
    desc: "LLM en local sur machine",
    badge: "LOCAL",
    badgeClass: "sources-badge-local"
  },
  lmstudio: {
    name: "LM Studio",
    logo: "lmstudiologo.png",
    url: "https://lmstudio.ai/",
    desc: "Interface locale pour LLM",
    badge: "LOCAL",
    badgeClass: "sources-badge-local"
  },
  qdrant: {
    name: "Qdrant",
    logo: "qdrantlogo.png",
    url: "https://qdrant.tech/",
    desc: "Base vectorielle pour RAG"
  },
  pinecone: {
    name: "Pinecone",
    logo: "pineconelogo.png",
    url: "https://www.pinecone.io/",
    desc: "Base de données vectorielle"
  },
  weaviate: {
    name: "Weaviate",
    logo: "weaviatelogo.png",
    url: "https://weaviate.io/",
    desc: "Base vectorielle open source"
  },
  vercel_ai: {
    name: "Vercel AI SDK",
    logo: "vercellogo.png",
    url: "https://sdk.vercel.ai/",
    desc: "SDK IA pour Next.js & React"
  },
  supabase: {
    name: "Supabase",
    logo: "supabaselogo.png",
    url: "https://supabase.com/",
    desc: "Backend open source + pgvector"
  },
  firebase: {
    name: "Firebase",
    logo: "firebaselogo.png",
    url: "https://firebase.google.com/",
    desc: "Base de données temps réel Google"
  },

  // ── NOUVEAUX — MÉDIAS FRANÇAIS ────────────────────────────────────────────
  lemonde: {
    name: "Le Monde",
    logo: "lemondelogo.png",
    url: "https://www.lemonde.fr/",
    desc: "Journal de référence français",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  lefigaro: {
    name: "Le Figaro",
    logo: "lefigarologo.png",
    url: "https://www.lefigaro.fr/",
    desc: "Quotidien français",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  liberation: {
    name: "Libération",
    logo: "liberationlogo.png",
    url: "https://www.liberation.fr/",
    desc: "Quotidien français",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  bfmtv: {
    name: "BFM TV",
    logo: "bfmtvlogo.png",
    url: "https://www.bfmtv.com/",
    desc: "Info en continu française",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  france_info: {
    name: "France Info",
    logo: "franceinfologo.png",
    url: "https://www.francetvinfo.fr/",
    desc: "Actualités radio & TV France",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  lesechos: {
    name: "Les Échos",
    logo: "lesechoslogo.png",
    url: "https://www.lesechos.fr/",
    desc: "Presse économique française",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  numerama: {
    name: "Numerama",
    logo: "numeramalogo.png",
    url: "https://www.numerama.com/",
    desc: "Tech & numérique en France",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  frandroid: {
    name: "Frandroid",
    logo: "frandroidlogo.png",
    url: "https://www.frandroid.com/",
    desc: "Tech & Android en français",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  next_inpact: {
    name: "Next.ink",
    logo: "nextinklogo.png",
    url: "https://next.ink/",
    desc: "Tech & vie privée numérique",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  },
  lepoint: {
    name: "Le Point Tech",
    logo: "lepointlogo.png",
    url: "https://www.lepoint.fr/high-tech-internet/",
    desc: "High-tech & IA — Le Point",
    badge: "🇫🇷",
    badgeClass: "sources-badge-fr"
  }
};

// Modèles qui ajoutent la source "openai"
const OPENAI_MODEL_IDS = ["wm-image-gpt-large", "wm-large-5.6"];

// Modèles qui ajoutent la source "blackforestlabs"
const BFL_MODEL_IDS = ["wm-image-flux", "wm-image-kontext"];

// ── 2. CLÉS API ──────────────────────────────────────────────────────────────

const TAVILY_API_KEY = "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";
const JINA_RPM_MAX   = 20;

// Récupère la clé Cerebras depuis WM_API_KEYS si dispo
function _getCerebrasKey() {
  return (window.WM_API_KEYS && window.WM_API_KEYS.cerebras) || "csk-y6n2np6j6y8r4j6yrmwp4yht39yf4f6c6jx4xv2e34vpdh55";
}

let _jinaCallTimestamps = [];
function _jinaCheckRateLimit() {
  const now = Date.now();
  _jinaCallTimestamps = _jinaCallTimestamps.filter(ts => now - ts < 60000);
  return _jinaCallTimestamps.length < JINA_RPM_MAX;
}
function _jinaRegisterCall() { _jinaCallTimestamps.push(Date.now()); }

// ── 3. DÉTECTIONS ────────────────────────────────────────────────────────────

const NEWS_KEYWORDS = /\b(actualit[ée]s?|news|dernières?[\s-]nouvelles?|récent|récemment|aujourd'hui|ce\s+(matin|soir|jour|week-?end|mois)|cette\s+(semaine|année)|en\s+(ce\s+moment|cours)|live|direct|breaking|dernier[se]?\s+(heure|jour|semaine)|quoi\s+de\s+neuf|que\s+se\s+passe[- ]t[- ]il|événement[s]?\s+r[ée]cent|info[s]?\s+du\s+jour|tendance[s]?)\b/i;
const WIKI_KEYWORDS  = /\bwikip[eé]dia\b/i;

function isTavilyRequest(text)    { return NEWS_KEYWORDS.test(text); }
function isWikipediaRequest(text) { return WIKI_KEYWORDS.test(text); }

// ── Table de mots-clés pour les nouvelles sources ────────────────────────────
// Chaque entrée : [sourceKey, regex]
// La source est ajoutée si le mot-clé apparaît dans le message user OU la réponse IA
const KEYWORD_SOURCES = [
  // IA internationale
  ["openrouter",      /\b(open\s*router|openrouter)\b/i],
  ["microsoft",       /\b(microsoft|phi[- ]?3|phi[- ]?4)\b/i],
  ["anthropic",       /\b(anthropic|claude\s*(3|sonnet|opus|haiku)?)\b/i],
  ["google",          /\b(google|gemini|deepmind|bard|palm)\b/i],
  ["meta",            /\b(meta\s*ai|llama\s*[23]?|llama\.cpp|facebook\s*ai)\b/i],
  ["xai",             /\b(grok|x\.?ai|elon\s*musk.*ia|ia.*elon)\b/i],
  ["cohere",          /\b(cohere|command[\s-]r|aya\s*model)\b/i],
  ["nvidia",          /\b(nvidia|nim\b|cuda|nemotron)\b/i],
  ["together",        /\b(together\s*ai|together\.xyz)\b/i],
  ["fireworks",       /\b(fireworks\s*ai|fireworks\.ai)\b/i],
  ["deepseek",        /\b(deepseek|deep\s*seek)\b/i],
  ["qwen",            /\b(qwen|alibaba\s*(cloud|ai))\b/i],
  ["perplexity",      /\b(perplexity|pplx)\b/i],
  ["huggingface",     /\b(hugging\s*face|huggingface|hf\s+hub|transformers\s+library)\b/i],
  ["stability",       /\b(stability\s*ai|stable\s*diffusion|sdxl|sd[- ]?\d)\b/i],
  ["runway",          /\b(runway\s*(ml|gen)?|gen[- ]?[23]\b)\b/i],
  ["elevenlabs",      /\b(eleven\s*labs?|elevenlabs|voix\s*ia|tts\s*ia|synthèse\s*vocale)\b/i],
  ["replicate",       /\b(replicate\.com|replicate\s*api)\b/i],
  ["suno",            /\b(suno\s*(ai)?|musique\s*(ia|générée)|génération\s*musicale)\b/i],
  ["udio",            /\b(udio\s*(ai)?)\b/i],
  ["ideogram",        /\b(ideogram)\b/i],
  ["midjourney",      /\b(midjourney|mj\s*v\d)\b/i],
  ["leonardo",        /\b(leonardo\s*ai|leonardo\.ai)\b/i],
  ["kling",           /\b(kling\s*(ai|video)?)\b/i],
  ["hailuo",          /\b(hailuo|minimax\s*(video|ai))\b/i],
  ["sambanova",       /\b(sambanova|samba\s*nova)\b/i],
  ["hyperbolic",      /\b(hyperbolic\s*(ai|labs)?)\b/i],

  // IA française & européenne
  ["scaleway",        /\b(scaleway)\b/i],
  ["aleph_alpha",     /\b(aleph\s*alpha|luminous)\b/i],
  ["vigogne",         /\b(vigogne)\b/i],
  ["camembert",       /\b(camembert[\s-]?(bert)?|inria\s*nlp)\b/i],
  ["bloom",           /\b(bloom\s*llm|bigscience)\b/i],
  ["lefebvre",        /\b(lefebvre\s*dalloz|dalloz)\b/i],
  ["doctrine",        /\b(doctrine\.fr|doctrine\s*juridique)\b/i],
  ["nabla",           /\b(nabla\s*(copilot)?|assistant\s*médical\s*ia)\b/i],
  ["craft_ai",        /\b(craft\s*ai)\b/i],
  ["holistic_ai",     /\b(holistic\s*ai|gouvernance\s*ia|audit\s*ia)\b/i],

  // Recherche & données
  ["arxiv",           /\b(arxiv|ar[xχ]iv|prépublication|preprint|papier\s*scientifique|paper\s*ia)\b/i],
  ["semanticscholar", /\b(semantic\s*scholar|s2\s*research)\b/i],
  ["wolframalpha",    /\b(wolfram(\s*alpha)?|calcul\s*symbolique|mathematica)\b/i],
  ["pubmed",          /\b(pubmed|ncbi|étude\s*médicale|étude\s*clinique|méta[- ]?analyse)\b/i],
  ["insee",           /\b(insee|statistiques?\s*(françaises?|france)|données?\s*démographiques?)\b/i],
  ["data_gouv",       /\b(data\.gouv|open\s*data\s*(france|français))\b/i],
  ["bnf",             /\b(gallica|bnf\b|bibliothèque\s*(nationale|numérique)\s*france)\b/i],
  ["europe_pmc",      /\b(europe\s*pmc|littérature\s*scientifique\s*europ)\b/i],
  ["youcom",          /\b(you\.com|you\s*search)\b/i],
  ["brave_search",    /\b(brave\s*(search|browser)|recherche\s*brave)\b/i],
  ["duckduckgo",      /\b(duckduckgo|ddg\b|duck\s*duck\s*go)\b/i],

  // Outils dev & infra IA
  ["langchain",       /\b(langchain|lang\s*chain)\b/i],
  ["llamaindex",      /\b(llama[\s-]?index|llamaindex)\b/i],
  ["ollama",          /\b(ollama)\b/i],
  ["lmstudio",        /\b(lm[\s-]?studio)\b/i],
  ["qdrant",          /\b(qdrant)\b/i],
  ["pinecone",        /\b(pinecone)\b/i],
  ["weaviate",        /\b(weaviate)\b/i],
  ["vercel_ai",       /\b(vercel\s*(ai|sdk)|next\.js\s*ai|ai\s*sdk)\b/i],
  ["supabase",        /\b(supabase|pgvector)\b/i],
  ["firebase",        /\b(firebase|firestore|realtime\s*database)\b/i],

  // Médias français
  ["lemonde",         /\b(le\s*monde\.fr|journal\s*le\s*monde)\b/i],
  ["lefigaro",        /\b(le\s*figaro|lefigaro\.fr)\b/i],
  ["liberation",      /\b(libération|liberation\.fr)\b/i],
  ["bfmtv",           /\b(bfm\s*(tv|business)?|bfmtv)\b/i],
  ["france_info",     /\b(france\s*info|francetvinfo|france\s*24)\b/i],
  ["lesechos",        /\b(les\s*échos|lesechos\.fr)\b/i],
  ["numerama",        /\b(numerama)\b/i],
  ["frandroid",       /\b(frandroid)\b/i],
  ["next_inpact",     /\b(next\.(ink|inpact)|nextinpact)\b/i],
  ["lepoint",         /\b(le\s*point\b(?!\s*de\s*(vue|départ|vente)))\b/i],
];

/**
 * Détecte les sources pertinentes à partir d'un texte (message user ou réponse IA).
 * Retourne un tableau de clés de sources.
 */
function detectKeywordSources(text) {
  if (!text) return [];
  const found = [];
  for (const [key, regex] of KEYWORD_SOURCES) {
    regex.lastIndex = 0;
    if (regex.test(text) && PROVIDER_SOURCES[key]) found.push(key);
  }
  return found;
}

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
function extractUrls(text) {
  const matches = [];
  let m;
  URL_REGEX.lastIndex = 0;
  while ((m = URL_REGEX.exec(text)) !== null) matches.push(m[0]);
  return [...new Set(matches)];
}

// ── 4. JINA READER ───────────────────────────────────────────────────────────

async function jinaFetchUrl(url) {
  if (!_jinaCheckRateLimit()) { console.warn("[Jina] Rate limit 20 RPM atteint"); return null; }
  try {
    _jinaRegisterCall();
    const resp = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      headers: { "Accept": "text/plain", "X-Return-Format": "text" }
    });
    if (!resp.ok) { console.warn(`[Jina] HTTP ${resp.status}`); return null; }
    const text = await resp.text();
    return text.slice(0, 4000) + (text.length > 4000 ? "\n\n[...tronqué]" : "");
  } catch (err) { console.warn("[Jina] Erreur :", err); return null; }
}

// ── 5. TAVILY ────────────────────────────────────────────────────────────────

async function tavilySearch(query) {
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: TAVILY_API_KEY, query, search_depth: "basic", max_results: 5, include_answer: true })
    });
    if (!resp.ok) { console.warn(`[Tavily] HTTP ${resp.status}`); return null; }
    const data = await resp.json();
    let ctx = "";
    if (data.answer) ctx += `Réponse rapide : ${data.answer}\n\n`;
    if (data.results?.length) {
      ctx += "Résultats d'actualité :\n";
      data.results.slice(0, 5).forEach((r, i) => {
        ctx += `\n[${i + 1}] ${r.title}\n${r.url}\n${r.content?.slice(0, 500) || ""}\n`;
      });
    }
    return ctx || null;
  } catch (err) { console.warn("[Tavily] Erreur :", err); return null; }
}

// ── 6. TOAST ─────────────────────────────────────────────────────────────────

let _jinaToastEl = null;
function _ensureJinaToast() {
  if (_jinaToastEl) return _jinaToastEl;
  _jinaToastEl = document.createElement("div");
  _jinaToastEl.className = "wm-jina-toast";
  _jinaToastEl.innerHTML = `<div class="wm-jina-spinner"></div><span></span>`;
  document.body.appendChild(_jinaToastEl);
  return _jinaToastEl;
}
function showJinaToast(msg) {
  const t = _ensureJinaToast();
  t.querySelector("span").textContent = msg;
  t.classList.add("show");
}
function hideJinaToast() { if (_jinaToastEl) _jinaToastEl.classList.remove("show"); }

// ── 7. ENRICHISSEMENT AVANT ENVOI ────────────────────────────────────────────

async function wmEnrichMessage(userText) {
  const extraSources = [];
  let enrichedText = userText;

  const urls = extractUrls(userText);
  const wantsNews = isTavilyRequest(userText);
  const wantsWiki = isWikipediaRequest(userText);

  // Jina Reader
  if (urls.length > 0) {
    const urlResults = [];
    for (const url of urls.slice(0, 3)) {
      showJinaToast(`Lecture de ${new URL(url).hostname}…`);
      const content = await jinaFetchUrl(url);
      if (content) urlResults.push(`### Contenu de ${url}\n${content}`);
    }
    hideJinaToast();
    if (urlResults.length > 0) {
      enrichedText += `\n\n--- CONTENU DES LIENS (via Jina Reader) ---\n${urlResults.join("\n\n")}\n--- FIN CONTENU ---`;
      extraSources.push("jina");
    }
  }

  // Tavily
  if (wantsNews) {
    showJinaToast("Recherche d'actualités…");
    const tavilyCtx = await tavilySearch(userText.slice(0, 200));
    hideJinaToast();
    if (tavilyCtx) {
      enrichedText += `\n\n--- ACTUALITÉS (via Tavily) ---\n${tavilyCtx}\n--- FIN ACTUALITÉS ---`;
      extraSources.push("tavily");
    }
  }

  // Wikipedia mention
  if (wantsWiki) extraSources.push("wikipedia");

  return { enrichedText, extraSources };
}

// ── 8. RÉSOLUTION DES SOURCES D'UN MESSAGE ───────────────────────────────────

function resolveMsgSources(msgObj) {
  const sources = [];
  const add = (key) => { if (PROVIDER_SOURCES[key] && !sources.includes(key)) sources.push(key); };

  // Provider principal (mistral, groq, cerebras, openrouter…)
  add(msgObj.provider || 'mistral');

  // Model IDs spéciaux
  const modelId = msgObj.modelId || "";
  if (OPENAI_MODEL_IDS.includes(modelId)) add("openai");
  if (BFL_MODEL_IDS.includes(modelId)) add("blackforestlabs");

  // Sources explicites (jina, tavily, wikipedia…)
  if (msgObj.extraSources) {
    for (const s of msgObj.extraSources) add(s);
  }

  // Détection par mots-clés sur le message user + la réponse IA
  const textToScan = [msgObj.userText || "", msgObj.content || "", msgObj.text || ""].join(" ");
  for (const key of detectKeywordSources(textToScan)) add(key);

  return sources;
}

// ── 9. BOUTON SOURCES ────────────────────────────────────────────────────────

function buildSourcesBtn(sourceKeys) {
  const validSources = (sourceKeys || []).filter(s => PROVIDER_SOURCES[s]);
  if (validSources.length === 0) return null;

  const btn = document.createElement("button");
  btn.className = "sources-btn";
  btn.title = "Sources";

  // max 3 logos empilés
  const logosHtml = validSources.slice(0, 3).map(s => {
    const src = PROVIDER_SOURCES[s];
    const style = src.invertInDark ? ' style="filter:invert(1)"' : '';
    return `<img src="${src.logo}" alt="${src.name}"${style} onerror="this.style.display='none'">`;
  }).join('');

  const ddId = `sources-dd-${Math.random().toString(36).slice(2)}`;
  btn.innerHTML = `
    <div class="sources-btn-logos">${logosHtml}</div>
    <span>Sources</span>
    <div class="sources-dropdown" id="${ddId}">
      <div class="sources-dropdown-header">Sources utilisées</div>
      ${validSources.map(s => {
        const src = PROVIDER_SOURCES[s];
        const imgStyle = src.invertInDark ? ' style="filter:invert(1)"' : '';
        const badgeHtml = src.badge
          ? `<span class="sources-dropdown-item-badge ${src.badgeClass || ''}">${src.badge}</span>`
          : '';
        return `<a href="${src.url}" target="_blank" rel="noopener" class="sources-dropdown-item">
          <img src="${src.logo}" alt="${src.name}"${imgStyle} onerror="this.style.display='none'">
          <div class="sources-dropdown-item-info">
            <div class="sources-dropdown-item-name">${src.name}</div>
            <div class="sources-dropdown-item-url">${src.desc}</div>
          </div>
          ${badgeHtml}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>`;
      }).join('')}
    </div>
  `;

  const dropdown = btn.querySelector('.sources-dropdown');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.sources-dropdown.open').forEach(d => { if (d !== dropdown) d.classList.remove('open'); });
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'), { passive: true });
  return btn;
}

// ── 10. RECONSTRUCTION DU BOUTON SOURCES APRÈS STREAM ────────────────────────
/**
 * Appelé à la fin de doStream pour mettre à jour le bouton Sources
 * sur le groupe de message déjà dans le DOM.
 */
function rebuildSourcesBtnForMsg(msgObj) {
  if (!msgObj.msgId) return;
  const g = document.querySelector(`[data-msg-id="${msgObj.msgId}"]`);
  if (!g) return;
  const actBar = g.querySelector('.msg-actions');
  if (!actBar) return;

  // Supprimer l'ancien bouton sources s'il existe
  const old = actBar.querySelector('.sources-btn');
  if (old) old.remove();

  const sourcesKeys = resolveMsgSources(msgObj);
  const btn = buildSourcesBtn(sourcesKeys);
  if (btn) actBar.appendChild(btn);
}

// ── 11. LIENS DANS LE TEXTAREA (highlight) ───────────────────────────────────

function initUrlHighlight(textareaEl) {
  const container = textareaEl.parentElement;
  if (!container) return;
  container.style.position = "relative";

  let overlay = container.querySelector(".wm-url-highlight-wrapper");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "wm-url-highlight-wrapper";
    overlay.setAttribute("aria-hidden", "true");
    container.insertBefore(overlay, textareaEl);
  }

  function syncOverlay() {
    const escaped = textareaEl.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    overlay.innerHTML = escaped.replace(
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
      match => `<span class="wm-url-highlight">${match}</span>`
    );
    overlay.scrollTop = textareaEl.scrollTop;
  }

  textareaEl.addEventListener("input", syncOverlay);
  textareaEl.addEventListener("scroll", () => { overlay.scrollTop = textareaEl.scrollTop; });

  const cs = getComputedStyle(textareaEl);
  overlay.style.padding = cs.padding;
  overlay.style.fontSize = cs.fontSize;
  overlay.style.fontFamily = cs.fontFamily;
  overlay.style.lineHeight = cs.lineHeight;
  overlay.style.letterSpacing = cs.letterSpacing;
}

// ── 12. URLS EN LIENS BLEUS SOULIGNÉS DANS LE BUBBLE USER ───────────────────

function renderUrlPillsInBubble(bubbleEl) {
  URL_REGEX.lastIndex = 0;
  const walker = document.createTreeWalker(bubbleEl, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    URL_REGEX.lastIndex = 0;
    if (URL_REGEX.test(node.textContent)) nodes.push(node);
  }
  URL_REGEX.lastIndex = 0;
  nodes.forEach(textNode => {
    const frag = document.createDocumentFragment();
    let last = 0; let m;
    URL_REGEX.lastIndex = 0;
    const text = textNode.textContent;
    while ((m = URL_REGEX.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const a = document.createElement("a");
      a.className = "wm-url-link";
      a.href = m[0];
      a.target = "_blank";
      a.rel = "noopener";
      a.title = m[0];
      try { a.textContent = new URL(m[0]).hostname; } catch { a.textContent = m[0]; }
      frag.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
}

// ── 13. PERSONNALITÉS — SOULIGNEMENT ET PANNEAU LATÉRAL ─────────────────────

// Cache des résultats Wikipedia pour éviter les appels répétés
const _wikiCache = {};

// Appel API Wikipedia pour un nom
async function fetchWikipediaSummary(name) {
  if (_wikiCache[name]) return _wikiCache[name];
  try {
    const searchResp = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`, {
      headers: { "Accept": "application/json" }
    });
    if (searchResp.ok) {
      const data = await searchResp.json();
      if (data.type !== "disambiguation" && data.extract) {
        const result = {
          title: data.title,
          extract: data.extract,
          thumbnail: data.thumbnail?.source || null,
          pageUrl: data.content_urls?.desktop?.page || `https://fr.wikipedia.org/wiki/${encodeURIComponent(name)}`,
          description: data.description || ""
        };
        _wikiCache[name] = result;
        return result;
      }
    }
    // Fallback: recherche
    const srResp = await fetch(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*&srlimit=1`);
    if (srResp.ok) {
      const srData = await srResp.json();
      const title = srData.query?.search?.[0]?.title;
      if (title) {
        const sumResp = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (sumResp.ok) {
          const d = await sumResp.json();
          const result = {
            title: d.title,
            extract: d.extract,
            thumbnail: d.thumbnail?.source || null,
            pageUrl: d.content_urls?.desktop?.page || `https://fr.wikipedia.org/wiki/${encodeURIComponent(title)}`,
            description: d.description || ""
          };
          _wikiCache[name] = result;
          return result;
        }
      }
    }
    return null;
  } catch (err) { console.warn("[Wiki]", err); return null; }
}

// Reformule l'extrait Wikipedia avec l'IA (mistral-small)
async function reformulateWithAI(wikiData) {
  if (!wikiData?.extract) return wikiData?.extract || "";
  try {
    const key = window.WM_API_KEYS?.mistral || window.KEY || "";
    if (!key) return wikiData.extract;
    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: "mistral-small-latest",
        max_tokens: 180,
        temperature: 0.4,
        messages: [{
          role: "user",
          content: `Reformule ce texte Wikipedia en 2-3 phrases claires et engageantes, en français, sans répéter le titre, sans guillemets :\n\n${wikiData.extract.slice(0, 600)}`
        }]
      })
    });
    if (!resp.ok) return wikiData.extract;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || wikiData.extract;
  } catch { return wikiData.extract; }
}

// ── Panneau latéral Wikipedia ─────────────────────────────────────────────────

let _wikiPanel = null;
let _wikiPanelCloseTimer = null;

function _ensureWikiPanel() {
  if (_wikiPanel) return _wikiPanel;
  _wikiPanel = document.createElement("div");
  _wikiPanel.id = "wm-wiki-panel";
  _wikiPanel.className = "wm-wiki-panel";
  _wikiPanel.innerHTML = `
    <div class="wm-wiki-panel-header">
      <div class="wm-wiki-panel-logo">
        <img src="wikipedialogo.png" alt="Wikipedia" onerror="this.style.display='none'">
        <span>Wikipedia</span>
      </div>
      <button class="wm-wiki-panel-close" id="wm-wiki-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="wm-wiki-panel-body" id="wm-wiki-body">
      <div class="wm-wiki-loading">
        <div class="wm-wiki-spinner"></div>
        <span>Chargement…</span>
      </div>
    </div>
  `;
  document.body.appendChild(_wikiPanel);

  document.getElementById("wm-wiki-close").addEventListener("click", closeWikiPanel);
  return _wikiPanel;
}

function openWikiPanel(name) {
  const panel = _ensureWikiPanel();
  // Reset body
  document.getElementById("wm-wiki-body").innerHTML = `<div class="wm-wiki-loading"><div class="wm-wiki-spinner"></div><span>Recherche de "${name}"…</span></div>`;
  panel.classList.add("open");

  // Ferme si on clique ailleurs
  setTimeout(() => {
    document.addEventListener("click", _wikiOutsideClick, { once: true });
  }, 50);

  // Charge les données
  _loadWikiData(name);
}

function closeWikiPanel() {
  if (_wikiPanel) _wikiPanel.classList.remove("open");
}

function _wikiOutsideClick(e) {
  if (_wikiPanel && !_wikiPanel.contains(e.target)) closeWikiPanel();
}

async function _loadWikiData(name) {
  const body = document.getElementById("wm-wiki-body");
  if (!body) return;

  const wikiData = await fetchWikipediaSummary(name);
  if (!wikiData) {
    body.innerHTML = `<div class="wm-wiki-not-found">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>Aucune information trouvée pour <strong>${name}</strong></p>
      <a href="https://fr.wikipedia.org/wiki/${encodeURIComponent(name)}" target="_blank" rel="noopener" class="wm-wiki-ext-link">Chercher sur Wikipedia →</a>
    </div>`;
    return;
  }

  // Afficher squelette immédiatement avec extract brut
  body.innerHTML = `
    ${wikiData.thumbnail ? `<div class="wm-wiki-img-wrap"><img src="${wikiData.thumbnail}" alt="${wikiData.title}" class="wm-wiki-img"></div>` : ''}
    <div class="wm-wiki-content">
      <h2 class="wm-wiki-title">${wikiData.title}</h2>
      ${wikiData.description ? `<p class="wm-wiki-desc">${wikiData.description}</p>` : ''}
      <p class="wm-wiki-extract" id="wm-wiki-extract-text">${wikiData.extract.slice(0, 300)}…</p>
      <div class="wm-wiki-ai-badge" id="wm-wiki-ai-badge"><div class="wm-wiki-spinner-sm"></div> Reformulation IA…</div>
      <a href="${wikiData.pageUrl}" target="_blank" rel="noopener" class="wm-wiki-ext-link">Lire sur Wikipedia →</a>
    </div>
  `;

  // Reformulation IA en arrière-plan
  const reformulated = await reformulateWithAI(wikiData);
  const extractEl = document.getElementById("wm-wiki-extract-text");
  const badgeEl = document.getElementById("wm-wiki-ai-badge");
  if (extractEl) extractEl.textContent = reformulated;
  if (badgeEl) badgeEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg> Reformulé par IA`;
}

// ── Injection des spans personnalités dans un bubble AI ──────────────────────

// Regex pour détecter les noms propres connus (liens wiki, personnalités connues)
// On cherche des séquences de mots capitalisés de 2-4 mots
const PERSON_REGEX = /\b([A-ZÁÀÂÄÉÈÊËÎÏÔÙÛÜÇ][a-záàâäéèêëîïôùûüç]+(?:\s+(?:de\s+|d'|du\s+|le\s+|la\s+|les\s+|von\s+|van\s+|bin\s+)?[A-ZÁÀÂÄÉÈÊËÎÏÔÙÛÜÇ][a-záàâäéèêëîïôùûüç]+){1,3})\b/g;

// Mots à exclure (pour ne pas souligner du texte commun)
const PERSON_EXCLUDE = new Set([
  "Le Grand","La Grande","En France","En Europe","Au Moyen","Les États","Les Temps","La Révolution",
  "La Grèce","La Rome","La France","La Chine","La Terre","Du Nord","Du Sud","De l","Le Monde",
  "Les Lumières","La Renaissance","La Réforme","Le Moyen","Les Nations","Le Conseil","Le Parlement",
  "La Loi","La Constitution","La République","La Monarchie","La Science","La Philosophie",
  "La Politique","La Logique","La Biologie","La Physique","La Médecine","La Musique","La Peinture",
  "Premier Ministre","Vice Président","Chef État","Première Guerre","Deuxième Guerre","Grande Guerre"
]);

function injectPersonalityLinks(bubbleEl) {
  // Seulement les bubble AI
  if (!bubbleEl.classList.contains('ai')) return;

  const walker = document.createTreeWalker(bubbleEl, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  // Éviter de traiter les noeuds déjà dans des liens/spans
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && (parent.tagName === 'A' || parent.tagName === 'CODE' || parent.tagName === 'PRE' || parent.classList.contains('wm-person'))) continue;
    PERSON_REGEX.lastIndex = 0;
    if (PERSON_REGEX.test(node.textContent)) nodes.push(node);
  }

  PERSON_REGEX.lastIndex = 0;
  nodes.forEach(textNode => {
    const text = textNode.textContent;
    const frag = document.createDocumentFragment();
    let last = 0; let m;
    PERSON_REGEX.lastIndex = 0;
    while ((m = PERSON_REGEX.exec(text)) !== null) {
      const name = m[1];
      if (PERSON_EXCLUDE.has(name) || name.split(' ').length < 2) continue;
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement("span");
      span.className = "wm-person";
      span.textContent = name;
      span.title = `Voir ${name} sur Wikipedia`;
      span.dataset.person = name;
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        openWikiPanel(name);
      });
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    if (last > 0) textNode.parentNode.replaceChild(frag, textNode);
  });
}

// ── 14. EXPORTS ──────────────────────────────────────────────────────────────

window.PROVIDER_SOURCES          = PROVIDER_SOURCES;
window.buildSourcesBtn           = buildSourcesBtn;
window.rebuildSourcesBtnForMsg   = rebuildSourcesBtnForMsg;
window.wmEnrichMessage           = wmEnrichMessage;
window.resolveMsgSources         = resolveMsgSources;
window.initUrlHighlight          = initUrlHighlight;
window.renderUrlPillsInBubble    = renderUrlPillsInBubble;
window.injectPersonalityLinks    = injectPersonalityLinks;
window.isTavilyRequest           = isTavilyRequest;
window.isWikipediaRequest        = isWikipediaRequest;
window.extractUrls               = extractUrls;
window.OPENAI_MODEL_IDS          = OPENAI_MODEL_IDS;
window.BFL_MODEL_IDS             = BFL_MODEL_IDS;
window.openWikiPanel             = openWikiPanel;
window.closeWikiPanel            = closeWikiPanel;
