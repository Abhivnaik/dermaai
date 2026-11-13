"""
Load the knowledge-library documents in rag/documents/.

Each document is a Markdown file that starts with a simple front-matter
block of `key: value` lines between two `---` lines, for example:

    ---
    id: nci-moles-dysplastic-nevi-melanoma
    title: Common Moles, Dysplastic Nevi, and Risk of Melanoma
    publisher: National Cancer Institute (NCI)
    url: https://www.cancer.gov/types/skin/moles-fact-sheet
    license: US Government work (cancer.gov). Reproduced with credit to NCI.
    attribution: "..." was originally published by the National Cancer Institute.
    classes: nv,mel
    source_date: 2022-11-17
    retrieved: 2026-11-13
    ---

Required fields: id, title, publisher, url, license.
"""

import re
from dataclasses import dataclass, field
from pathlib import Path

DOCS_DIR = Path(__file__).resolve().parent / "documents"
REQUIRED_FIELDS = ("id", "title", "publisher", "url", "license")
LESION_CODES = ("nv", "mel", "bkl", "bcc", "akiec", "vasc", "df")
_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,99}$")


@dataclass
class Document:
    id: str
    title: str
    publisher: str
    url: str
    license: str
    body: str
    attribution: str = ""
    source_date: str = ""
    retrieved: str = ""
    classes: list = field(default_factory=list)

    @property
    def word_count(self):
        return len(self.body.split())

    @property
    def sections(self):
        """Top-level (##) headings, in order."""
        return [line[3:].strip() for line in self.body.splitlines() if line.startswith("## ")]

    def metadata(self):
        return {
            "id": self.id,
            "title": self.title,
            "publisher": self.publisher,
            "url": self.url,
            "license": self.license,
            "attribution": self.attribution,
            "source_date": self.source_date,
            "retrieved": self.retrieved,
            "classes": self.classes,
            "word_count": self.word_count,
            "sections": self.sections,
        }


def slugify(text):
    """Heading anchor. The frontend uses the identical rule (utils/slugify.js)."""
    text = re.sub(r"[^a-z0-9\s-]", "", text.lower())
    return re.sub(r"[\s-]+", "-", text).strip("-")


def parse_document(text, source_name="document"):
    if not text.startswith("---"):
        raise ValueError(f"{source_name}: missing front matter")
    try:
        _, header, body = text.split("---", 2)
    except ValueError:
        raise ValueError(f"{source_name}: front matter is not closed with ---") from None

    meta = {}
    for line in header.strip().splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()

    missing = [f for f in REQUIRED_FIELDS if not meta.get(f)]
    if missing:
        raise ValueError(f"{source_name}: missing front-matter fields {missing}")
    if not _ID_PATTERN.match(meta["id"]):
        raise ValueError(f"{source_name}: id must be lowercase letters, digits and hyphens")

    classes = [c.strip() for c in meta.get("classes", "").split(",") if c.strip()]
    unknown = [c for c in classes if c not in LESION_CODES]
    if unknown:
        raise ValueError(f"{source_name}: unknown classes {unknown}")

    return Document(
        id=meta["id"], title=meta["title"], publisher=meta["publisher"],
        url=meta["url"], license=meta["license"], body=body.strip(),
        attribution=meta.get("attribution", ""), source_date=meta.get("source_date", ""),
        retrieved=meta.get("retrieved", ""), classes=classes,
    )


def load_documents(docs_dir=DOCS_DIR):
    """Return {id: Document} for every .md file in docs_dir, sorted by title."""
    documents = {}
    for path in sorted(Path(docs_dir).glob("*.md")):
        doc = parse_document(path.read_text(encoding="utf-8"), path.name)
        if doc.id in documents:
            raise ValueError(f"{path.name}: duplicate document id {doc.id!r}")
        documents[doc.id] = doc
    return dict(sorted(documents.items(), key=lambda kv: kv[1].title.lower()))
