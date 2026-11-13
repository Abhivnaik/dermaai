"""
Download the DermaAI knowledge-library sources and save them as Markdown.

Run from the project root:
    .venv\\Scripts\\python.exe -m rag.fetch_sources

Every document in rag/documents/ produced by this script is verbatim text
(headings, paragraphs and list items) extracted from a public source whose
licence allows reuse with attribution. Images, navigation, reference lists
and boilerplate are removed; nothing is paraphrased or added.

Sources and licences
--------------------
* NCI PDQ patient summaries and fact sheets (cancer.gov): US Government
  works. PDQ states "The content of PDQ documents can be used freely as text"
  and asks that NCI be credited and the original linked.
* NCI Dictionary of Cancer Terms (via the public NCI glossary API): same terms.
* Tschandl, Rosendahl & Kittler (2018), Scientific Data 5:180161:
  Creative Commons Attribution 4.0 International (CC BY 4.0).
* Open-access review/research articles (ARTICLE_SOURCES), downloaded as
  full-text XML from the Europe PMC API. Each article's licence is read from
  the XML and checked: only CC BY and CC BY-NC are accepted (non-commercial
  educational use, with attribution). Citation markers, figures and the
  reference list are removed.

To add your own document, write a Markdown file into rag/documents/ with the
same front-matter fields (see rag/README.md), then rebuild the index with
`python -m rag.ingest`.
"""

import datetime as dt
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

import httpx

DOCS_DIR = Path(__file__).resolve().parent / "documents"
USER_AGENT = "Mozilla/5.0 (compatible; DermaAI-research-library/1.0)"

PDQ_LICENSE = (
    "US Government work. NCI PDQ: \"The content of PDQ documents can be used "
    "freely as text.\" Reproduced as excerpts with credit to NCI."
)
NCI_LICENSE = "US Government work (cancer.gov). Reproduced with credit to NCI."
CC_BY = "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Excerpted; no changes to the text."

SOURCES = [
    {
        "id": "ham10000-dataset",
        "url": "https://www.nature.com/articles/sdata2018161",
        "kind": "nature",
        "title": "The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions",
        "publisher": "Tschandl P., Rosendahl C. & Kittler H. Scientific Data 5, 180161 (2018)",
        "license": CC_BY,
        "attribution": "Tschandl, P., Rosendahl, C. & Kittler, H. The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions. Sci Data 5, 180161 (2018). https://doi.org/10.1038/sdata.2018.161",
        "classes": "nv,mel,bkl,bcc,akiec,vasc,df",
        # Abstract, background, how diagnoses were unified, ground truth,
        # and the per-class descriptions in Usage Notes.
        "sections": {"Abs1", "Sec1", "Sec7", "Sec16", "Sec21"},
    },
    {
        "id": "nci-moles-dysplastic-nevi-melanoma",
        "url": "https://www.cancer.gov/types/skin/moles-fact-sheet",
        "kind": "nci",
        "title": "Common Moles, Dysplastic Nevi, and Risk of Melanoma",
        "publisher": "National Cancer Institute (NCI)",
        "license": NCI_LICENSE,
        "attribution": "\"Common Moles, Dysplastic Nevi, and Risk of Melanoma\" was originally published by the National Cancer Institute.",
        "classes": "nv,mel",
    },
    {
        "id": "nci-skin-cancer-treatment-pdq",
        "url": "https://www.cancer.gov/types/skin/patient/skin-treatment-pdq",
        "kind": "nci",
        "title": "Skin Cancer Treatment (PDQ®)–Patient Version",
        "publisher": "National Cancer Institute (NCI)",
        "license": PDQ_LICENSE,
        "attribution": "\"Skin Cancer Treatment (PDQ®)–Patient Version\" was originally published by the National Cancer Institute.",
        "classes": "bcc,akiec",
    },
    {
        "id": "nci-melanoma-treatment-pdq",
        "url": "https://www.cancer.gov/types/skin/patient/melanoma-treatment-pdq",
        "kind": "nci",
        "title": "Melanoma Treatment (PDQ®)–Patient Version",
        "publisher": "National Cancer Institute (NCI)",
        "license": PDQ_LICENSE,
        "attribution": "\"Melanoma Treatment (PDQ®)–Patient Version\" was originally published by the National Cancer Institute.",
        "classes": "mel",
    },
    {
        "id": "nci-skin-cancer-screening-pdq",
        "url": "https://www.cancer.gov/types/skin/patient/skin-screening-pdq",
        "kind": "nci",
        "title": "Skin Cancer Screening (PDQ®)–Patient Version",
        "publisher": "National Cancer Institute (NCI)",
        "license": PDQ_LICENSE,
        "attribution": "\"Skin Cancer Screening (PDQ®)–Patient Version\" was originally published by the National Cancer Institute.",
        "classes": "mel,bcc,akiec",
    },
    {
        "id": "nci-skin-cancer-prevention-pdq",
        "url": "https://www.cancer.gov/types/skin/patient/skin-prevention-pdq",
        "kind": "nci",
        "title": "Skin Cancer Prevention (PDQ®)–Patient Version",
        "publisher": "National Cancer Institute (NCI)",
        "license": PDQ_LICENSE,
        "attribution": "\"Skin Cancer Prevention (PDQ®)–Patient Version\" was originally published by the National Cancer Institute.",
        "classes": "mel,bcc,akiec",
    },
]

# Peer-reviewed open-access articles filling gaps for bkl, df and vasc, which
# the NCI material does not cover. Licence is verified from the XML.
ARTICLE_SOURCES = [
    {"id": "seborrheic-keratosis-review-wollina-2019", "pmcid": "PMC6719672", "classes": "bkl"},
    {"id": "seborrheic-keratosis-elderly-moscarella-2021", "pmcid": "PMC8088980", "classes": "bkl,mel"},
    {"id": "dermatofibroma-review-wan-2025", "pmcid": "PMC12333637", "classes": "df"},
    {"id": "atypical-dermatofibroma-review-2023", "pmcid": "PMC9955442", "classes": "df,mel"},
    {"id": "vascular-lesions-dermoscopy-gao-2021", "pmcid": "PMC8273173", "classes": "vasc"},
]
EUROPE_PMC_XML = "https://www.ebi.ac.uk/europepmc/webservices/rest/{}/fullTextXML"
PMC_ARTICLE = "https://pmc.ncbi.nlm.nih.gov/articles/{}/"
# Licences we accept for verbatim excerpts (checked against the licence URL/text)
ALLOWED_LICENSES = {
    "by": "CC BY",
    "by-nc": "CC BY-NC",
}
# Article sections that are not educational content
SKIP_SECTION_WORDS = ("disclosure", "conflict", "funding", "acknowledg", "author contribution",
                      "data availability", "ethic", "consent", "abbreviation", "supplementary",
                      "publisher", "declaration", "reference", "footnote", "associated data",
                      "review board", "statement")

# Terms fetched from the NCI Dictionary of Cancer Terms (patient level).
GLOSSARY_TERMS = [
    "actinic-keratosis", "basal-cell-carcinoma", "bowen-disease", "dysplastic-nevus",
    "melanoma", "nevus", "squamous-cell-carcinoma", "melanocyte", "skin-cancer",
    "epidermis", "dermis", "biopsy", "dermatologist", "benign", "malignant",
    "metastasis", "ultraviolet-radiation", "lesion",
]
GLOSSARY_API = "https://webapis.cancer.gov/glossary/v1/Terms/Cancer.gov/Patient/en/{}"
GLOSSARY_PAGE = "https://www.cancer.gov/publications/dictionaries/cancer-terms/def/{}"

VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
             "meta", "param", "source", "track", "wbr"}
SKIP_TAGS = {"script", "style", "noscript", "svg", "img", "figure", "figcaption",
             "button", "nav", "form", "sup", "iframe", "video", "picture", "aside"}
SKIP_CLASS_PARTS = ("on-this-page", "embed-media", "c-article-recommendations",
                    "c-article-table", "c-article-section__figure", "u-visually-hidden",
                    "c-article-satellite", "js-ad", "share", "explore-related-subjects")
HEADINGS = {"h2": 2, "h3": 3, "h4": 4}
# Page furniture that is not part of the article text
DROP_PARAGRAPHS = ("Machine-accessible metadata", "Go to Health Professional Version")
# Headings over image galleries (the images themselves are not reproduced)
DROP_HEADING_SUFFIXES = (" Photos",)
# Elements that separate words even when the HTML has no whitespace between them
SEPARATING_TAGS = {"li", "p", "div", "br", "td", "th", "tr", "ul", "ol"}


# --------------------------------------------------------------------------
# Minimal DOM built with the standard-library HTML parser
# --------------------------------------------------------------------------
class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs or {}), parent
        self.children = []

    def find(self, tag):
        for child in self.children:
            if isinstance(child, Node):
                if child.tag == tag:
                    return child
                found = child.find(tag)
                if found is not None:
                    return found
        return None

    def find_all(self, tag):
        for child in self.children:
            if isinstance(child, Node):
                if child.tag == tag:
                    yield child
                yield from child.find_all(tag)


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root")
        self.current = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in VOID_TAGS:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.current.children.append(Node(tag, attrs, self.current))

    def handle_endtag(self, tag):
        node = self.current
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:  # ignore stray end tags
            self.current = node.parent

    def handle_data(self, data):
        self.current.children.append(data)


def parse_html(html):
    builder = TreeBuilder()
    builder.feed(html)
    return builder.root


def _skip(node):
    if node.tag in SKIP_TAGS:
        return True
    cls = node.attrs.get("class") or ""
    if any(part in cls for part in SKIP_CLASS_PARTS):
        return True
    node_id = node.attrs.get("id") or ""
    # NCI "Key Points" boxes repeat the headings that follow them
    return node_id.endswith("_kpBoxHdr") or node_id.startswith("_kp_section")


def _contains_list(node):
    return node.tag in ("ul", "ol") or any(
        isinstance(c, Node) and _contains_list(c) for c in node.children)


def _nested_lists(node):
    """Lists inside a list item, including ones wrapped in <div>s (NCI)."""
    for child in node.children:
        if not isinstance(child, Node) or _skip(child):
            continue
        if child.tag in ("ul", "ol"):
            yield child
        else:
            yield from _nested_lists(child)


def _raw_text(node, stop_at_lists):
    parts = []
    for child in node.children:
        if isinstance(child, str):
            parts.append(child)
        elif _skip(child) or (stop_at_lists and _contains_list(child)):
            continue
        elif child.tag in SEPARATING_TAGS:
            parts.append(" " + _raw_text(child, stop_at_lists) + " ")
        else:
            parts.append(_raw_text(child, stop_at_lists))
    return "".join(parts)


def inline_text(node, stop_at_lists=False):
    # Whitespace is collapsed only here, at the top level, so spaces at the
    # edges of nested inline elements (<strong>, <a>) are preserved.
    return re.sub(r"\s+", " ", _raw_text(node, stop_at_lists)).strip()


# --------------------------------------------------------------------------
# HTML -> Markdown blocks
# --------------------------------------------------------------------------
class Extractor:
    """Walks the DOM and emits Markdown lines for headings, text and lists."""

    def __init__(self, stop_headings=(), sections=None):
        self.lines = []
        self.stop_headings = stop_headings
        self.sections = sections        # Nature: ids of sections to keep
        self.section_stack = []         # [(level, included)]
        self.stopped = False

    @property
    def capturing(self):
        if self.sections is None:
            return True
        return bool(self.section_stack) and self.section_stack[-1][1]

    def heading(self, node, level):
        text = inline_text(node)
        if not text:
            return
        if any(text.startswith(s) for s in self.stop_headings):
            self.stopped = True
            return
        if self.sections is not None:
            node_id = node.attrs.get("id")
            if not node_id:
                return
            while self.section_stack and self.section_stack[-1][0] >= level:
                self.section_stack.pop()
            parent_included = bool(self.section_stack) and self.section_stack[-1][1]
            self.section_stack.append((level, node_id in self.sections or parent_included))
        if self.capturing and not text.endswith(DROP_HEADING_SUFFIXES):
            self.lines += ["", "#" * level + " " + text, ""]

    def para(self, text):
        if not text or not self.capturing or text.startswith(DROP_PARAGRAPHS):
            return
        # Rejoin a sentence the source page split across two <p> elements
        prev = self.lines[-2] if len(self.lines) >= 2 and self.lines[-1] == "" else ""
        if (prev and not prev.startswith(("#", "-")) and prev[-1] not in ".!?:;)\"”"
                and text[0].islower()):
            self.lines[-2] = prev + " " + text
            return
        self.lines += [text, ""]

    def list_block(self, node, depth=0):
        ordered = node.tag == "ol"
        n = 0
        for li in node.children:
            if not isinstance(li, Node) or li.tag != "li" or _skip(li):
                continue
            n += 1
            text = inline_text(li, stop_at_lists=True)
            if text and self.capturing:
                marker = f"{n}." if ordered else "-"
                self.lines.append("  " * depth + f"{marker} {text}")
            for sub in _nested_lists(li):
                self.list_block(sub, depth + 1)
        if depth == 0 and self.capturing:
            self.lines.append("")

    def table(self, node):
        for tr in node.find_all("tr"):
            cells = [inline_text(c) for c in tr.children
                     if isinstance(c, Node) and c.tag in ("td", "th")]
            cells = [c for c in cells if c]
            if cells and self.capturing:
                self.lines.append("- " + " — ".join(cells))
        if self.capturing:
            self.lines.append("")

    def walk(self, node):
        for child in node.children:
            if self.stopped:
                return
            if isinstance(child, str):
                # Loose text directly inside a section/div
                text = re.sub(r"\s+", " ", child).strip()
                if len(text) > 1:
                    self.para(text)
                continue
            if _skip(child):
                continue
            tag = child.tag
            if tag in HEADINGS:
                self.heading(child, HEADINGS[tag])
            elif tag == "p":
                self.para(inline_text(child))
            elif tag in ("ul", "ol"):
                self.list_block(child)
            elif tag == "table":
                self.table(child)
            elif tag in ("h1", "h5", "h6"):
                continue
            else:
                self.walk(child)

    def markdown(self):
        text = "\n".join(self.lines)
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        # Drop headings that ended up with no content beneath them
        out = []
        blocks = text.split("\n\n")
        for i, block in enumerate(blocks):
            if block.startswith("#"):
                level = len(block) - len(block.lstrip("#"))
                nxt = blocks[i + 1] if i + 1 < len(blocks) else ""
                nxt_level = len(nxt) - len(nxt.lstrip("#")) if nxt.startswith("#") else 99
                if not nxt or nxt_level <= level:
                    continue
            out.append(block)
        return "\n\n".join(out)


def extract_nci(html):
    root = parse_html(html)
    article = root.find("article") or root
    ex = Extractor(stop_headings=("About This PDQ Summary", "To Learn More",
                                  "Selected References", "Related Resources"))
    ex.walk(article)
    return ex.markdown(), _first_time(root)


def extract_nature(html, sections):
    root = parse_html(html)
    ex = Extractor(stop_headings=("References",), sections=sections)
    ex.walk(root)
    return ex.markdown(), _first_time(root)


def _first_time(root):
    for node in root.find_all("time"):
        value = node.attrs.get("datetime")
        if value:
            return value[:10]
    return ""


# --------------------------------------------------------------------------
# JATS full-text XML (Europe PMC) -> Markdown
# --------------------------------------------------------------------------
XLINK_HREF = "{http://www.w3.org/1999/xlink}href"
# Elements whose content is dropped (citation numbers, figures, maths, notes)
JATS_DROP = {"fig", "disp-formula", "inline-formula", "fn", "fn-group", "graphic",
             "inline-graphic", "media", "supplementary-material", "ref-list", "label"}


def _jats_text(el):
    """Text of an element, skipping bibliography citations and dropped parts."""
    parts = [el.text or ""]
    for child in el:
        tag = child.tag
        skip = tag in JATS_DROP or (tag == "xref" and child.get("ref-type") in ("bibr", "fn", "fig", "table"))
        if not skip and tag not in ("list", "table-wrap"):
            parts.append(_jats_text(child))
        parts.append(child.tail or "")
    text = re.sub(r"\s+", " ", "".join(parts)).strip()
    # Tidy what removed citation markers leave behind: "[ , ]", "( )", " ."
    text = re.sub(r"\s*\[[\s,;–\-]*\]", "", text)
    text = re.sub(r"\s*\([\s,;–\-]*\)", "", text)
    text = re.sub(r"\s+([.,;:])", r"\1", text)
    text = re.sub(r"[,;]+\.", ".", text)          # "disease,." -> "disease."
    text = re.sub(r"\s[–—]\s*\.", ".", text)      # "tattoo –." -> "tattoo."
    return text


class JatsExtractor:
    def __init__(self):
        self.lines = []

    def block(self, el, level):
        tag = el.tag
        if tag == "sec":
            title_el = el.find("title")
            title = _jats_text(title_el) if title_el is not None else ""
            if title and any(w in title.lower() for w in SKIP_SECTION_WORDS):
                return
            if title:
                self.lines += ["", "#" * min(level, 4) + " " + title, ""]
            for child in el:
                if child.tag != "title":
                    self.block(child, level + 1)
        elif tag == "p":
            text = _jats_text(el)
            if text:
                self.lines += [text, ""]
            for child in el:  # lists/tables nested inside paragraphs
                if child.tag in ("list", "table-wrap"):
                    self.block(child, level)
        elif tag == "list":
            self.list_block(el, 0)
            self.lines.append("")
        elif tag == "table-wrap":
            self.table(el)
        elif tag in ("boxed-text", "abstract", "body"):
            for child in el:
                self.block(child, level)

    def list_block(self, el, depth):
        ordered = el.get("list-type") in ("order", "arabic", "alpha-lower", "roman-lower")
        for n, item in enumerate(el.findall("list-item"), start=1):
            texts = [_jats_text(p) for p in item if p.tag == "p"]
            text = " ".join(t for t in texts if t)
            if text:
                self.lines.append("  " * depth + (f"{n}." if ordered else "-") + " " + text)
            for sub in item.iter("list"):
                if sub is not el:
                    self.list_block(sub, depth + 1)
                    break

    def table(self, el):
        label = _jats_text(el.find("label")) if el.find("label") is not None else ""
        caption = el.find("caption")
        caption_text = " ".join(_jats_text(p) for p in caption) if caption is not None else ""
        heading = " ".join(t for t in (label, caption_text) if t)
        rows = []
        for tr in el.iter("tr"):
            cells = [_jats_text(c) for c in tr if c.tag in ("td", "th")]
            cells = [c for c in cells if c]
            if cells:
                rows.append("- " + " — ".join(cells))
        if rows:
            if heading:
                self.lines += [f"Table: {heading}", ""]
            self.lines += rows + [""]

    def markdown(self):
        return re.sub(r"\n{3,}", "\n\n", "\n".join(self.lines)).strip()


def _jats_license(meta):
    lic = meta.find("permissions/license")
    if lic is None:
        return None, ""
    href = (lic.get(XLINK_HREF) or "").lower()
    text = " ".join(_jats_text(p) for p in lic.findall("license-p"))
    for el in lic.iter():  # licence URL can also appear in an ext-link
        href += " " + (el.get(XLINK_HREF) or "").lower()
    match = re.search(r"creativecommons\.org/licenses/([a-z-]+)/(\d\.\d)", href + " " + text.lower())
    if not match:
        # Some publishers (e.g. Frontiers) state the licence only in words
        words = re.sub(r"[\s–-]+", " ", text.lower())
        if "creative commons attribution" not in words:
            return None, text
        if any(w in words for w in ("noderiv", "no deriv", "sharealike", "share alike")):
            return None, text
        kind = "by-nc" if any(w in words for w in ("noncommercial", "non commercial")) else "by"
        return f"{ALLOWED_LICENSES[kind]} (as stated by the publisher: \"{text[:160].rstrip()}…\")", text
    kind, version = match.groups()
    if kind not in ALLOWED_LICENSES:
        return None, text
    return f"{ALLOWED_LICENSES[kind]} {version} (https://creativecommons.org/licenses/{kind}/{version}/)", text


def extract_article(xml_text, pmcid):
    root = ET.fromstring(xml_text)
    meta = root.find("front/article-meta")
    journal_el = root.find("front/journal-meta/journal-title-group/journal-title")
    journal = _jats_text(journal_el) if journal_el is not None else ""
    title = _jats_text(meta.find("title-group/article-title"))

    authors = []
    names = []
    for contrib in meta.iterfind("contrib-group/contrib"):
        if contrib.get("contrib-type", "author") != "author":
            continue
        name = contrib.find(".//name")  # may be wrapped in <name-alternatives>
        if name is not None:
            names.append(name)
    for name in names:
        surname = (name.findtext("surname") or "").strip()
        initials = "".join(w[0] for w in (name.findtext("given-names") or "").replace("-", " ").split() if w)
        if surname:
            authors.append(f"{surname} {initials}".strip())
    short_authors = authors[0] + (" et al." if len(authors) > 1 else "") if authors else ""
    cite_authors = ", ".join(authors[:6]) + (", et al." if len(authors) > 6 else "")

    date_el = meta.find("pub-date[@pub-type='epub']")
    if date_el is None:
        date_el = meta.find("pub-date")
    year = date_el.findtext("year") if date_el is not None else ""
    month = (date_el.findtext("month") or "01").zfill(2) if date_el is not None else "01"
    day = (date_el.findtext("day") or "01").zfill(2) if date_el is not None else "01"
    volume = meta.findtext("volume") or ""
    pages = meta.findtext("elocation-id") or meta.findtext("fpage") or ""
    doi = meta.findtext("article-id[@pub-id-type='doi']") or ""

    license_label, license_text = _jats_license(meta)
    if not license_label:
        raise ValueError(f"{pmcid}: licence is not CC BY or CC BY-NC ({license_text[:120]!r})")

    ex = JatsExtractor()
    abstract = meta.find("abstract")
    if abstract is not None:
        ex.lines += ["## Abstract", ""]
        ex.block(abstract, 3)
    body = root.find("body")
    if body is not None:
        for child in body:
            ex.block(child, 2)

    citation = f"{cite_authors.rstrip('.')}. {title}. {journal}. {year}"
    citation += f";{volume}" if volume else ""
    citation += f":{pages}" if pages else ""
    citation += f". https://doi.org/{doi}" if doi else ""
    meta_out = {
        "title": title,
        "publisher": ", ".join(p for p in (short_authors, journal) if p) + (f" ({year})" if year else ""),
        "url": PMC_ARTICLE.format(pmcid),
        "license": f"{license_label}. Excerpted verbatim; figures and citation markers removed.",
        "attribution": citation,
        "source_date": f"{year}-{month}-{day}" if year else "",
    }
    return ex.markdown(), meta_out


# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------
def front_matter(meta):
    keys = ["id", "title", "publisher", "url", "license", "attribution",
            "classes", "source_date", "retrieved"]
    lines = ["---"] + [f"{k}: {meta[k]}" for k in keys if meta.get(k)] + ["---", ""]
    return "\n".join(lines)


def write_document(meta, body):
    path = DOCS_DIR / f"{meta['id']}.md"
    path.write_text(front_matter(meta) + body.strip() + "\n", encoding="utf-8")
    words = len(body.split())
    print(f"  wrote {path.name} ({words:,} words)")
    if words < 150:
        print(f"  WARNING: {path.name} looks too short; check the extraction.")


def fetch(client, url):
    response = client.get(url)
    response.raise_for_status()
    return response


def build_glossary(client, today):
    sections = []
    for term in GLOSSARY_TERMS:
        try:
            data = fetch(client, GLOSSARY_API.format(term)).json()
        except httpx.HTTPError as err:
            print(f"  skipped glossary term {term!r}: {err}")
            continue
        name = (data.get("termName") or term).strip()
        definition = re.sub(r"\s+", " ", (data.get("definition") or {}).get("text") or "").strip()
        if definition:
            sections.append(f"## {name}\n\n{definition}\n\nSource: {GLOSSARY_PAGE.format(term)}")
    if not sections:
        print("  no glossary terms fetched")
        return
    meta = {
        "id": "nci-dictionary-skin-terms",
        "title": "NCI Dictionary of Cancer Terms — selected skin terms",
        "publisher": "National Cancer Institute (NCI)",
        "url": "https://www.cancer.gov/publications/dictionaries/cancer-terms",
        "license": NCI_LICENSE,
        "attribution": "Definitions from the NCI Dictionary of Cancer Terms, originally published by the National Cancer Institute.",
        "classes": "nv,mel,bcc,akiec",
        "retrieved": today,
    }
    write_document(meta, "\n\n".join(sections))


def main():
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    today = dt.date.today().isoformat()
    failures = 0
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=60,
                      follow_redirects=True) as client:
        for source in SOURCES:
            print(f"Fetching {source['url']}")
            try:
                html = fetch(client, source["url"]).text
            except httpx.HTTPError as err:
                print(f"  FAILED: {err}")
                failures += 1
                continue
            if source["kind"] == "nature":
                body, date = extract_nature(html, source["sections"])
            else:
                body, date = extract_nci(html)
            meta = {k: v for k, v in source.items() if k not in ("kind", "sections")}
            meta.update(source_date=date, retrieved=today)
            write_document(meta, body)

        for source in ARTICLE_SOURCES:
            url = EUROPE_PMC_XML.format(source["pmcid"])
            print(f"Fetching {source['pmcid']} from Europe PMC")
            try:
                body, meta = extract_article(fetch(client, url).text, source["pmcid"])
            except (httpx.HTTPError, ValueError, ET.ParseError) as err:
                print(f"  FAILED: {err}")
                failures += 1
                continue
            meta.update(id=source["id"], classes=source["classes"], retrieved=today)
            write_document(meta, body)

        print("Fetching NCI Dictionary of Cancer Terms")
        build_glossary(client, today)

    if failures:
        print(f"{failures} source(s) failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
