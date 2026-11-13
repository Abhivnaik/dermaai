"""
Build the knowledge-library search index.

Run from the project root (re-run whenever rag/documents/ changes):
    .venv\\Scripts\\python.exe -m rag.ingest

Steps:
  1. Load every document in rag/documents/ (see rag/library.py).
  2. Split each document into passages ("chunks") along its headings.
  3. Embed each passage with Gemini (RETRIEVAL_DOCUMENT task type).
  4. Save rag/index/chunks.json, rag/index/embeddings.npy and
     rag/index/manifest.json.

The index is small (a few hundred passages), so search is a NumPy dot
product in rag/retriever.py; no separate vector database is needed.
"""

import datetime as dt
import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from google import genai

from rag.embeddings import EMBEDDING_DIM, embed_texts, embedding_model
from rag.library import load_documents, slugify

INDEX_DIR = Path(__file__).resolve().parent / "index"

# Passage size limits, in characters (~4 characters per token)
MAX_CHARS = 1200
MIN_CHARS = 200
OVERLAP_MAX_CHARS = 300  # carry the previous block forward if it is this short


def _sections(body):
    """Yield (heading_path, anchor, [blocks]) for each heading section."""
    path, anchor, blocks = [], "", []
    for block in (b.strip() for b in body.split("\n\n")):
        if not block:
            continue
        if block.startswith("#") and "\n" not in block:
            if blocks:
                yield list(path), anchor, blocks
            level = len(block) - len(block.lstrip("#"))
            title = block[level:].strip()
            path = path[: max(level - 2, 0)] + [title]  # "##" is the top level
            anchor, blocks = slugify(title), []
        else:
            blocks.append(block)
    if blocks:
        yield list(path), anchor, blocks


def _split_long_block(block):
    """Split an oversized block (usually a long list) on line boundaries."""
    pieces, current = [], ""
    for line in block.split("\n"):
        if current and len(current) + len(line) + 1 > MAX_CHARS:
            pieces.append(current)
            current = ""
        current = f"{current}\n{line}" if current else line
    if current:
        pieces.append(current)
    return pieces


def chunk_document(doc):
    chunks = []
    for path, anchor, blocks in _sections(doc.body):
        expanded = [p for b in blocks for p in (_split_long_block(b) if len(b) > MAX_CHARS else [b])]
        current = []
        for block in expanded:
            size = sum(len(b) for b in current) + len(block)
            if current and size > MAX_CHARS:
                chunks.append((path, anchor, current))
                prev = current[-1]
                current = [prev] if len(prev) <= OVERLAP_MAX_CHARS else []
            current.append(block)
        if current:
            # Merge a very small trailing piece into the previous chunk of the
            # same section rather than indexing a fragment on its own
            if (chunks and chunks[-1][1] == anchor and chunks[-1][0] == path
                    and sum(len(b) for b in current) < MIN_CHARS):
                chunks[-1] = (path, anchor, chunks[-1][2] + current)
            else:
                chunks.append((path, anchor, current))

    records = []
    for n, (path, anchor, blocks) in enumerate(chunks):
        records.append({
            "id": f"{doc.id}#{n}",
            "doc_id": doc.id,
            "heading": " › ".join(path),
            "anchor": anchor,
            "text": "\n\n".join(blocks),
        })
    return records


def embedding_input(doc, chunk):
    """Text sent to the embedding model: title and headings give context."""
    heading = f"\nSection: {chunk['heading']}" if chunk["heading"] else ""
    return f"Document: {doc.title}{heading}\n\n{chunk['text']}"


def _fingerprint(docs):
    digest = hashlib.sha256()
    for doc in docs.values():
        digest.update(doc.id.encode())
        digest.update(doc.body.encode())
    return digest.hexdigest()


def main():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        sys.exit("GEMINI_API_KEY is not set in .env")

    docs = load_documents()
    if not docs:
        sys.exit("No documents found in rag/documents/")

    chunks = []
    for doc in docs.values():
        doc_chunks = chunk_document(doc)
        chunks.extend(doc_chunks)
        print(f"  {doc.id}: {len(doc_chunks)} passages")
    print(f"{len(chunks)} passages from {len(docs)} documents")

    model = embedding_model()
    print(f"Embedding with {model} ...")
    client = genai.Client(api_key=api_key)
    texts = [embedding_input(docs[c["doc_id"]], c) for c in chunks]
    matrix = embed_texts(client, texts, task_type="RETRIEVAL_DOCUMENT", model=model)

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    np.save(INDEX_DIR / "embeddings.npy", matrix)
    (INDEX_DIR / "chunks.json").write_text(
        json.dumps(chunks, ensure_ascii=False, indent=1), encoding="utf-8")
    manifest = {
        "model": model,
        "dimensions": EMBEDDING_DIM,
        "chunks": len(chunks),
        "documents": list(docs),
        "documents_fingerprint": _fingerprint(docs),
        "built": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
    }
    (INDEX_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Saved index to {INDEX_DIR}")


if __name__ == "__main__":
    main()
