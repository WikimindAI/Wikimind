#!/usr/bin/env python3
"""
generate_seo.py
================

Générateur SEO professionnel pour le site GitHub Pages "Wikimind".

Ce script analyse l'intégralité du dépôt et produit automatiquement,
avant chaque commit :

    - sitemap.xml   (conforme à la spécification sitemaps.org / Google,
                      avec extension image:image pour les images)
    - robots.txt
    - seo-report.html (rapport SEO détaillé : titres manquants,
                        meta descriptions manquantes, pages orphelines,
                        liens internes cassés, doublons, etc.)

Aucune dépendance externe : uniquement la bibliothèque standard Python 3.11+.

Utilisation
-----------
    python generate_seo.py

Auteur   : généré pour le projet Wikimind
Licence  : usage interne au projet
"""

from __future__ import annotations

import html
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, Optional
from xml.dom import minidom


# ============================================================================
# 1. CONFIGURATION
# ============================================================================

@dataclass(frozen=True)
class PriorityRule:
    """Règle de calcul de priorité / fréquence de mise à jour.

    `pattern` est une expression régulière appliquée au chemin relatif
    (avec des slashes "/", en minuscules). La première règle qui matche,
    dans l'ordre de la liste, l'emporte.
    """
    pattern: str
    priority: float
    changefreq: str
    label: str = ""


@dataclass
class SEOConfig:
    """Configuration centrale du générateur.

    Modifier cette classe (ou l'instance créée dans `main`) suffit à
    adapter le comportement du script : aucune autre partie du code
    n'a besoin d'être touchée pour changer les priorités, l'URL de
    base, ou les dossiers ignorés.
    """

    # Racine du dépôt à analyser (le script s'exécute depuis la racine du projet)
    root_dir: Path = field(default_factory=lambda: Path(".").resolve())

    # URL de base du site GitHub Pages
    base_url: str = "https://wikimindai.github.io/Wikimind/"

    # Dossiers à ignorer complètement (noms de dossiers, comparaison exacte)
    ignored_dir_names: frozenset[str] = frozenset({
        ".git", "node_modules", "venv", ".venv", "__pycache__",
        "dist", "build", ".github", ".idea", ".vscode",
    })

    # Motifs de fichiers à ignorer (regex appliquée au nom de fichier)
    ignored_file_patterns: tuple[str, ...] = (
        r"^\..*",           # fichiers cachés (.DS_Store, .env, ...)
        r".*\.tmp$",
        r".*\.bak$",
        r".*~$",
    )

    # Dossier considéré comme contenant les articles de blog
    blog_dir_name: str = "blog"

    # Fichiers de sortie, générés à la racine du dépôt
    sitemap_filename: str = "sitemap.xml"
    robots_filename: str = "robots.txt"
    report_filename: str = "seo-report.html"

    # Règles de priorité, évaluées dans l'ordre (la première qui matche gagne)
    priority_rules: tuple[PriorityRule, ...] = (
        PriorityRule(r"^index\.html$", 1.0, "weekly", "Accueil"),
        PriorityRule(r"^(app|apps|application|applications)/", 0.9, "weekly", "Applications principales"),
        PriorityRule(r"^(about|contact|services|pricing|features)(/|\.html$)", 0.8, "monthly", "Pages importantes"),
        PriorityRule(rf"^{re.escape('blog')}/.+", 0.7, "monthly", "Articles de blog"),
        PriorityRule(r".*", 0.6, "monthly", "Pages secondaires"),  # règle par défaut
    )

    # Règles additionnelles pour robots.txt (au-delà du strict minimum)
    # Chaque entrée est une ligne brute ajoutée après le bloc obligatoire.
    extra_robots_rules: tuple[str, ...] = (
        # Exemple : "Disallow: /drafts/",
    )

    # Liste des pages jugées "importantes" : si l'une d'elles est absente
    # du dépôt, ou détectée comme orpheline, une alerte est levée.
    critical_pages: tuple[str, ...] = (
        "index.html",
    )


# ============================================================================
# 2. UTILITAIRES : DATES GIT
# ============================================================================

class GitDateResolver:
    """Résout la date de dernière modification d'un fichier via Git,
    avec repli sur la date de modification du système de fichiers.
    """

    def __init__(self, root_dir: Path) -> None:
        self._root_dir = root_dir
        self._git_available = self._check_git_available()

    def _check_git_available(self) -> bool:
        """Vérifie que git est installé et que root_dir est bien un dépôt git."""
        if shutil.which("git") is None:
            return False
        git_dir = self._root_dir / ".git"
        return git_dir.exists()

    def last_modified(self, file_path: Path) -> datetime:
        """Retourne la date de dernière modification (UTC) d'un fichier.

        Tente d'abord `git log -1 --format=%cI` (date du dernier commit
        touchant le fichier). En cas d'échec (fichier non suivi, git
        absent, erreur quelconque), utilise la date mtime du fichier.
        """
        if self._git_available:
            git_date = self._get_git_commit_date(file_path)
            if git_date is not None:
                return git_date
        return self._get_filesystem_mtime(file_path)

    def _get_git_commit_date(self, file_path: Path) -> Optional[datetime]:
        try:
            relative = file_path.relative_to(self._root_dir)
        except ValueError:
            return None
        try:
            result = subprocess.run(
                ["git", "log", "-1", "--format=%cI", "--", str(relative)],
                cwd=self._root_dir,
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            return None
        output = result.stdout.strip()
        if not output:
            return None
        try:
            return datetime.fromisoformat(output)
        except ValueError:
            return None

    @staticmethod
    def _get_filesystem_mtime(file_path: Path) -> datetime:
        try:
            timestamp = file_path.stat().st_mtime
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except OSError:
            return datetime.now(tz=timezone.utc)


# ============================================================================
# 3. ANALYSE DES FICHIERS HTML (titre, meta description, liens, images)
# ============================================================================

@dataclass
class PageInfo:
    """Informations extraites d'une page HTML."""
    path: Path
    relative_path: str
    title: Optional[str] = None
    meta_description: Optional[str] = None
    internal_links: list[str] = field(default_factory=list)
    image_srcs: list[str] = field(default_factory=list)


class _HTMLMetaParser(HTMLParser):
    """Parseur HTML minimal (bibliothèque standard) extrayant :
    - le contenu de <title>
    - le contenu de <meta name="description" content="...">
    - les hrefs des balises <a>
    - les src des balises <img>
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: Optional[str] = None
        self.meta_description: Optional[str] = None
        self.links: list[str] = []
        self.images: list[str] = []
        self._in_title = False
        self._title_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        attrs_dict = {k.lower(): (v or "") for k, v in attrs}
        if tag.lower() == "title":
            self._in_title = True
        elif tag.lower() == "meta":
            name = attrs_dict.get("name", "").lower()
            if name == "description":
                self.meta_description = attrs_dict.get("content", "").strip()
        elif tag.lower() == "a" and "href" in attrs_dict:
            self.links.append(attrs_dict["href"].strip())
        elif tag.lower() == "img" and "src" in attrs_dict:
            self.images.append(attrs_dict["src"].strip())

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False
            self.title = "".join(self._title_buffer).strip() or None

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_buffer.append(data)


class HTMLPageAnalyzer:
    """Analyse un fichier HTML et retourne un objet PageInfo."""

    def analyze(self, file_path: Path, relative_path: str) -> PageInfo:
        info = PageInfo(path=file_path, relative_path=relative_path)
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return info

        parser = _HTMLMetaParser()
        try:
            parser.feed(content)
        except Exception:
            # Un HTML mal formé ne doit jamais interrompre tout le pipeline
            return info

        info.title = parser.title
        info.meta_description = parser.meta_description
        info.internal_links = [
            link for link in parser.links
            if self._is_internal_link(link)
        ]
        info.image_srcs = [img for img in parser.images if img]
        return info

    @staticmethod
    def _is_internal_link(link: str) -> bool:
        if not link:
            return False
        if link.startswith(("http://", "https://", "mailto:", "tel:", "javascript:", "#")):
            return False
        return True


# ============================================================================
# 4. PARCOURS DU DEPOT
# ============================================================================

class RepositoryScanner:
    """Parcourt récursivement le dépôt et identifie les fichiers pertinents."""

    def __init__(self, config: SEOConfig) -> None:
        self._config = config
        self._ignored_file_regexes = [re.compile(p) for p in config.ignored_file_patterns]

    def find_html_files(self) -> list[Path]:
        """Retourne la liste triée de tous les fichiers .html/.htm à conserver."""
        html_files: list[Path] = []
        for path in self._config.root_dir.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in (".html", ".htm"):
                continue
            if self._is_ignored(path):
                continue
            html_files.append(path)
        return sorted(html_files)

    def _is_ignored(self, path: Path) -> bool:
        relative_parts = path.relative_to(self._config.root_dir).parts
        # Dossier ignoré à n'importe quel niveau du chemin
        if any(part in self._config.ignored_dir_names for part in relative_parts[:-1]):
            return True
        filename = path.name
        for regex in self._ignored_file_regexes:
            if regex.match(filename):
                return True
        return False

    def get_ignored_summary(self, all_paths: Iterable[Path]) -> list[str]:
        """Utilisé uniquement pour le rapport : liste les chemins ignorés."""
        ignored: list[str] = []
        for path in all_paths:
            if path.is_file() and self._is_ignored(path):
                try:
                    ignored.append(str(path.relative_to(self._config.root_dir)))
                except ValueError:
                    continue
        return ignored


# ============================================================================
# 5. URL BUILDING & VALIDATION
# ============================================================================

@dataclass
class URLEntry:
    """Une entrée du sitemap : URL + métadonnées."""
    url: str
    lastmod: datetime
    priority: float
    changefreq: str
    images: list[str] = field(default_factory=list)


class URLBuilder:
    """Construit les URLs publiques à partir des chemins locaux et les valide."""

    FORBIDDEN_CHARS = set(' <>"\'`')

    def __init__(self, base_url: str) -> None:
        # S'assure que la base URL se termine par un slash
        self.base_url = base_url if base_url.endswith("/") else base_url + "/"

    def build_url(self, relative_path: str) -> str:
        """Convertit un chemin relatif (posix, sans slash initial) en URL absolue."""
        normalized = relative_path.replace("\\", "/").lstrip("/")
        return self.base_url + normalized

    def validate(self, url: str) -> list[str]:
        """Retourne la liste des problèmes détectés sur une URL (vide = OK)."""
        issues: list[str] = []
        if not url or not url.strip():
            issues.append("URL vide")
            return issues
        if any(char in url for char in self.FORBIDDEN_CHARS):
            issues.append("caractère interdit ou espace présent dans l'URL")
        if not url.startswith(self.base_url):
            issues.append("URL ne commence pas par l'URL de base configurée")
        return issues


class PriorityCalculator:
    """Calcule (priorité, changefreq) pour un chemin donné, selon les règles."""

    def __init__(self, rules: tuple[PriorityRule, ...]) -> None:
        self._compiled_rules = [
            (re.compile(rule.pattern, re.IGNORECASE), rule) for rule in rules
        ]

    def compute(self, relative_path: str) -> tuple[float, str, str]:
        """Retourne (priority, changefreq, label_de_la_regle_matchee)."""
        normalized = relative_path.replace("\\", "/").lower()
        for regex, rule in self._compiled_rules:
            if regex.search(normalized):
                return rule.priority, rule.changefreq, rule.label
        # Filet de sécurité : ne devrait jamais être atteint grâce à la règle ".*"
        return 0.5, "monthly", "Défaut"


# ============================================================================
# 6. GENERATION DU SITEMAP
# ============================================================================

class SitemapGenerator:
    """Génère un fichier sitemap.xml conforme à la spécification sitemaps.org,
    avec extension image sitemap (namespace image:).
    """

    NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
    IMAGE_NAMESPACE = "http://www.google.com/schemas/sitemap-image/1.1"

    def generate(self, entries: list[URLEntry]) -> str:
        """Construit et retourne le XML indenté du sitemap.

        NB: les tags sont construits comme de simples chaînes préfixées
        ("image:image") plutôt que via le mécanisme de namespace d'ElementTree,
        afin de garder un contrôle total sur les attributs xmlns et d'éviter
        toute duplication d'attribut lors de la sérialisation.
        """
        urlset = ET.Element("urlset", {
            "xmlns": self.NAMESPACE,
            "xmlns:image": self.IMAGE_NAMESPACE,
        })

        for entry in sorted(entries, key=lambda e: e.url):
            url_el = ET.SubElement(urlset, "url")
            ET.SubElement(url_el, "loc").text = entry.url
            ET.SubElement(url_el, "lastmod").text = entry.lastmod.strftime("%Y-%m-%d")
            ET.SubElement(url_el, "changefreq").text = entry.changefreq
            ET.SubElement(url_el, "priority").text = f"{entry.priority:.1f}"

            for image_url in entry.images:
                image_el = ET.SubElement(url_el, "image:image")
                ET.SubElement(image_el, "image:loc").text = image_url

        return self._pretty_print(urlset)

    @staticmethod
    def _pretty_print(element: ET.Element) -> str:
        raw = ET.tostring(element, encoding="utf-8")
        parsed = minidom.parseString(raw)
        pretty = parsed.toprettyxml(indent="  ", encoding="UTF-8").decode("utf-8")
        # Retire les lignes vides que toprettyxml ajoute parfois
        lines = [line for line in pretty.splitlines() if line.strip()]
        return "\n".join(lines) + "\n"


# ============================================================================
# 7. GENERATION DU ROBOTS.TXT
# ============================================================================

class RobotsGenerator:
    """Génère le contenu du fichier robots.txt."""

    def generate(self, config: SEOConfig) -> str:
        lines = [
            "User-agent: *",
            "Allow: /",
            "",
            f"Sitemap: {self._sitemap_url(config)}",
        ]
        if config.extra_robots_rules:
            lines.append("")
            lines.extend(config.extra_robots_rules)
        return "\n".join(lines) + "\n"

    @staticmethod
    def _sitemap_url(config: SEOConfig) -> str:
        base = config.base_url if config.base_url.endswith("/") else config.base_url + "/"
        return base + config.sitemap_filename


# ============================================================================
# 8. ANALYSE SEO : ORPHELINES, LIENS CASSES, TITRES/DESCRIPTIONS MANQUANTS
# ============================================================================

@dataclass
class SEOIssues:
    """Regroupe tous les problèmes SEO détectés."""
    missing_titles: list[str] = field(default_factory=list)
    missing_descriptions: list[str] = field(default_factory=list)
    orphan_pages: list[str] = field(default_factory=list)
    broken_internal_links: list[tuple[str, str]] = field(default_factory=list)  # (page, lien_casse)
    duplicate_urls: list[str] = field(default_factory=list)


class SEOAuditor:
    """Effectue l'audit SEO qualitatif du site à partir des PageInfo collectées."""

    def __init__(self, root_dir: Path, all_relative_paths: set[str]) -> None:
        self._root_dir = root_dir
        self._all_relative_paths = all_relative_paths

    def audit(self, pages: list[PageInfo]) -> SEOIssues:
        issues = SEOIssues()

        linked_targets: set[str] = set()

        for page in pages:
            if not page.title:
                issues.missing_titles.append(page.relative_path)
            if not page.meta_description:
                issues.missing_descriptions.append(page.relative_path)

            for link in page.internal_links:
                resolved = self._resolve_link(page, link)
                if resolved is None:
                    continue
                if resolved in self._all_relative_paths:
                    linked_targets.add(resolved)
                else:
                    issues.broken_internal_links.append((page.relative_path, link))

        # Pages orphelines : jamais référencées par un lien interne, hors index.html
        for path in sorted(self._all_relative_paths):
            if path == "index.html":
                continue
            if path not in linked_targets:
                issues.orphan_pages.append(path)

        return issues

    def _resolve_link(self, page: PageInfo, link: str) -> Optional[str]:
        """Résout un lien relatif en chemin relatif au dépôt (posix), ou None
        si le lien ne peut pas être interprété comme un fichier local (ex: ancre pure).
        """
        link_path = link.split("#", 1)[0].split("?", 1)[0]
        if not link_path:
            return None
        try:
            page_dir = (self._root_dir / page.relative_path).parent
            resolved = (page_dir / link_path).resolve()
            relative = resolved.relative_to(self._root_dir)
        except (ValueError, OSError):
            return None
        relative_str = str(relative).replace("\\", "/")
        # Un lien vers un dossier est interprété comme pointant vers index.html
        if relative_str.endswith("/") or (self._root_dir / relative).is_dir():
            relative_str = relative_str.rstrip("/") + "/index.html"
        return relative_str


# ============================================================================
# 9. RAPPORT
# ============================================================================

@dataclass
class SEOReport:
    """Toutes les données nécessaires à l'affichage et à l'export du rapport."""
    total_pages: int = 0
    total_articles: int = 0
    total_urls: int = 0
    execution_seconds: float = 0.0
    ignored_paths: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    duplicate_urls: list[str] = field(default_factory=list)
    issues: SEOIssues = field(default_factory=SEOIssues)


class ConsoleReportPrinter:
    """Affiche le rapport SEO dans le terminal."""

    def print(self, report: SEOReport) -> None:
        sep = "=" * 60
        print(f"\n{sep}")
        print("RAPPORT SEO — Wikimind")
        print(sep)
        print(f"Pages HTML détectées      : {report.total_pages}")
        print(f"Articles de blog détectés : {report.total_articles}")
        print(f"URLs générées (sitemap)   : {report.total_urls}")
        print(f"Temps d'exécution         : {report.execution_seconds:.3f} s")

        print(f"\n--- Pages ignorées ({len(report.ignored_paths)}) ---")
        if report.ignored_paths:
            for path in report.ignored_paths[:20]:
                print(f"  - {path}")
            if len(report.ignored_paths) > 20:
                print(f"  ... et {len(report.ignored_paths) - 20} de plus")
        else:
            print("  (aucune)")

        print(f"\n--- Titres <title> manquants ({len(report.issues.missing_titles)}) ---")
        for path in report.issues.missing_titles:
            print(f"  - {path}")

        print(f"\n--- Meta descriptions manquantes ({len(report.issues.missing_descriptions)}) ---")
        for path in report.issues.missing_descriptions:
            print(f"  - {path}")

        print(f"\n--- Pages orphelines ({len(report.issues.orphan_pages)}) ---")
        for path in report.issues.orphan_pages:
            print(f"  - {path}")

        print(f"\n--- Liens internes cassés ({len(report.issues.broken_internal_links)}) ---")
        for source, link in report.issues.broken_internal_links:
            print(f"  - {source} -> {link}")

        print(f"\n--- URLs en double ({len(report.duplicate_urls)}) ---")
        for url in report.duplicate_urls:
            print(f"  - {url}")

        print(f"\n--- Erreurs ({len(report.errors)}) ---")
        if report.errors:
            for error in report.errors:
                print(f"  ! {error}")
        else:
            print("  (aucune)")
        print(sep + "\n")


class HTMLReportGenerator:
    """Génère un rapport SEO complet au format HTML (seo-report.html)."""

    def generate(self, report: SEOReport) -> str:
        def esc(text: str) -> str:
            return html.escape(text, quote=True)

        def render_list(items: list[str], empty_message: str) -> str:
            if not items:
                return f"<p class='ok'>{esc(empty_message)}</p>"
            rows = "".join(f"<li>{esc(item)}</li>" for item in items)
            return f"<ul>{rows}</ul>"

        broken_links_rows = "".join(
            f"<li><code>{esc(src)}</code> → <code>{esc(link)}</code></li>"
            for src, link in report.issues.broken_internal_links
        ) or "<p class='ok'>Aucun lien interne cassé détecté.</p>"

        generated_at = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport SEO — Wikimind</title>
<style>
  body {{ font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; background: #fafafa; }}
  h1 {{ border-bottom: 3px solid #2563eb; padding-bottom: 10px; }}
  h2 {{ margin-top: 40px; color: #2563eb; }}
  .stats {{ display: flex; flex-wrap: wrap; gap: 16px; margin: 20px 0; }}
  .stat-card {{ background: white; border: 1px solid #ddd; border-radius: 8px; padding: 16px 24px; flex: 1; min-width: 160px; }}
  .stat-card .value {{ font-size: 28px; font-weight: bold; color: #2563eb; }}
  .stat-card .label {{ color: #666; font-size: 14px; }}
  ul {{ background: white; border-radius: 8px; padding: 16px 16px 16px 36px; border: 1px solid #eee; }}
  li {{ margin: 4px 0; }}
  code {{ background: #eef2ff; padding: 2px 6px; border-radius: 4px; }}
  .ok {{ color: #16a34a; font-weight: 600; }}
  footer {{ margin-top: 50px; color: #999; font-size: 13px; }}
</style>
</head>
<body>
  <h1>Rapport SEO — Wikimind</h1>
  <p>Généré le {esc(generated_at)}</p>

  <div class="stats">
    <div class="stat-card"><div class="value">{report.total_pages}</div><div class="label">Pages HTML</div></div>
    <div class="stat-card"><div class="value">{report.total_articles}</div><div class="label">Articles de blog</div></div>
    <div class="stat-card"><div class="value">{report.total_urls}</div><div class="label">URLs dans le sitemap</div></div>
    <div class="stat-card"><div class="value">{report.execution_seconds:.2f}s</div><div class="label">Temps d'exécution</div></div>
  </div>

  <h2>Titres &lt;title&gt; manquants ({len(report.issues.missing_titles)})</h2>
  {render_list(report.issues.missing_titles, "Toutes les pages ont un titre.")}

  <h2>Meta descriptions manquantes ({len(report.issues.missing_descriptions)})</h2>
  {render_list(report.issues.missing_descriptions, "Toutes les pages ont une meta description.")}

  <h2>Pages orphelines ({len(report.issues.orphan_pages)})</h2>
  {render_list(report.issues.orphan_pages, "Aucune page orpheline détectée.")}

  <h2>Liens internes cassés ({len(report.issues.broken_internal_links)})</h2>
  {broken_links_rows}

  <h2>URLs en double ({len(report.duplicate_urls)})</h2>
  {render_list(report.duplicate_urls, "Aucun doublon détecté.")}

  <h2>Pages / fichiers ignorés ({len(report.ignored_paths)})</h2>
  {render_list(report.ignored_paths, "Aucun fichier ignoré.")}

  <h2>Erreurs ({len(report.errors)})</h2>
  {render_list(report.errors, "Aucune erreur rencontrée pendant la génération.")}

  <footer>Généré automatiquement par generate_seo.py</footer>
</body>
</html>
"""


# ============================================================================
# 10. ORCHESTRATEUR PRINCIPAL
# ============================================================================

class SEOGenerator:
    """Orchestre l'ensemble du pipeline de génération SEO."""

    def __init__(self, config: SEOConfig) -> None:
        self.config = config
        self.scanner = RepositoryScanner(config)
        self.date_resolver = GitDateResolver(config.root_dir)
        self.url_builder = URLBuilder(config.base_url)
        self.priority_calculator = PriorityCalculator(config.priority_rules)
        self.page_analyzer = HTMLPageAnalyzer()
        self.sitemap_generator = SitemapGenerator()
        self.robots_generator = RobotsGenerator()
        self.html_report_generator = HTMLReportGenerator()
        self.errors: list[str] = []

    def run(self) -> SEOReport:
        """Exécute le pipeline complet et retourne le rapport final."""
        start_time = time.perf_counter()

        html_files = self.scanner.find_html_files()
        all_relative_paths = {
            self._relative_posix(path) for path in html_files
        }

        pages: list[PageInfo] = []
        entries: list[URLEntry] = []
        seen_urls: set[str] = set()
        duplicate_urls: list[str] = []
        article_count = 0

        for file_path in html_files:
            relative_path = self._relative_posix(file_path)

            if self._is_blog_article(relative_path):
                article_count += 1

            page_info = self._safe_analyze(file_path, relative_path)
            pages.append(page_info)

            entry = self._build_entry(file_path, relative_path, page_info)
            if entry is None:
                continue

            if entry.url in seen_urls:
                duplicate_urls.append(entry.url)
                continue
            seen_urls.add(entry.url)
            entries.append(entry)

        auditor = SEOAuditor(self.config.root_dir, all_relative_paths)
        issues = auditor.audit(pages)
        issues.duplicate_urls = duplicate_urls

        self._check_critical_pages(all_relative_paths)

        self._write_sitemap(entries)
        self._write_robots()

        ignored_paths = self.scanner.get_ignored_summary(
            self.config.root_dir.rglob("*")
        )

        elapsed = time.perf_counter() - start_time

        report = SEOReport(
            total_pages=len(html_files),
            total_articles=article_count,
            total_urls=len(entries),
            execution_seconds=elapsed,
            ignored_paths=ignored_paths,
            errors=self.errors,
            duplicate_urls=duplicate_urls,
            issues=issues,
        )

        self._write_html_report(report)
        return report

    # -- Étapes internes -----------------------------------------------

    def _relative_posix(self, path: Path) -> str:
        return str(path.relative_to(self.config.root_dir)).replace("\\", "/")

    def _is_blog_article(self, relative_path: str) -> bool:
        parts = relative_path.split("/")
        return self.config.blog_dir_name in parts[:-1]

    def _safe_analyze(self, file_path: Path, relative_path: str) -> PageInfo:
        try:
            return self.page_analyzer.analyze(file_path, relative_path)
        except Exception as exc:  # défense en profondeur : un fichier ne bloque pas le pipeline
            self.errors.append(f"Erreur d'analyse HTML sur {relative_path}: {exc}")
            return PageInfo(path=file_path, relative_path=relative_path)

    def _build_entry(
        self, file_path: Path, relative_path: str, page_info: PageInfo
    ) -> Optional[URLEntry]:
        url = self.url_builder.build_url(relative_path)
        issues = self.url_builder.validate(url)
        if issues:
            self.errors.append(f"URL invalide ignorée ({relative_path}): {', '.join(issues)}")
            return None

        priority, changefreq, _label = self.priority_calculator.compute(relative_path)
        lastmod = self.date_resolver.last_modified(file_path)

        image_urls = [
            self._resolve_image_url(file_path, src) for src in page_info.image_srcs
        ]
        image_urls = [url for url in image_urls if url]

        return URLEntry(
            url=url,
            lastmod=lastmod,
            priority=priority,
            changefreq=changefreq,
            images=image_urls,
        )

    def _resolve_image_url(self, page_path: Path, src: str) -> Optional[str]:
        """Convertit un src d'image (relatif ou absolu) en URL publique complète."""
        if not src:
            return None
        if src.startswith(("http://", "https://")):
            return src
        if src.startswith("data:"):
            return None  # images encodées en base64 : non pertinentes pour le sitemap
        try:
            resolved = (page_path.parent / src).resolve()
            relative = resolved.relative_to(self.config.root_dir)
        except (ValueError, OSError):
            return None
        return self.url_builder.build_url(str(relative).replace("\\", "/"))

    def _check_critical_pages(self, all_relative_paths: set[str]) -> None:
        for critical in self.config.critical_pages:
            if critical not in all_relative_paths:
                self.errors.append(f"Page critique absente du dépôt : {critical}")

    def _write_sitemap(self, entries: list[URLEntry]) -> None:
        xml_content = self.sitemap_generator.generate(entries)
        output_path = self.config.root_dir / self.config.sitemap_filename
        output_path.write_text(xml_content, encoding="utf-8")

    def _write_robots(self) -> None:
        content = self.robots_generator.generate(self.config)
        output_path = self.config.root_dir / self.config.robots_filename
        output_path.write_text(content, encoding="utf-8")

    def _write_html_report(self, report: SEOReport) -> None:
        try:
            html_content = self.html_report_generator.generate(report)
            output_path = self.config.root_dir / self.config.report_filename
            output_path.write_text(html_content, encoding="utf-8")
        except OSError as exc:
            self.errors.append(f"Impossible d'écrire le rapport HTML : {exc}")


# ============================================================================
# 11. POINT D'ENTREE
# ============================================================================

def main() -> int:
    """Point d'entrée du script. Retourne le code de sortie du processus."""
    config = SEOConfig()

    if not config.root_dir.exists():
        print(f"Erreur : le dossier racine {config.root_dir} est introuvable.", file=sys.stderr)
        return 1

    generator = SEOGenerator(config)
    report = generator.run()

    ConsoleReportPrinter().print(report)

    print(f"✔ {config.sitemap_filename} généré")
    print(f"✔ {config.robots_filename} généré")
    print(f"✔ {config.report_filename} généré")

    return 0 if not report.errors else 1


if __name__ == "__main__":
    sys.exit(main())
