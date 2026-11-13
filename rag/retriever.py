"""
Semantic search over the knowledge-library index built by rag/ingest.py.

The index is loaded lazily on first use. If it has not been built (or was
built with a different embedding model), retrieval is disabled and callers
get an empty result, so the assistant keeps working without citations.
"""

import json
import logging
import threading
from pathlib import Path

import numpy as np

from rag.embeddings import EMBEDDING_DIM, embed_texts, embedding_model
from rag.library import load_documents

logger = logging.getLogger(__name__)

INDEX_DIR = Path(__file__).resolve().parent / "index"

DEFAULT_TOP_K = 4
# Passages scoring below this cosine similarity are treated as unrelated.
# Calibrated on this library with gemini-embedding-001 (see CLAUDE.md, 5J):
# on-topic questions scored 0.72-0.78 for the best passage, off-topic ones
# <= 0.49, and an uncovered topic (Grad-CAM) 0.60.
MIN_SCORE = 0.62
# Also drop passages much weaker than the best match for the same question
RELATIVE_MARGIN = 0.10
# Avoid filling every slot with near-duplicate passages from one document
MAX_PER_DOCUMENT = 2


class Index:
    def __init__(self, chunks, matrix, documents, manifest):
        self.chunks, self.matrix = chunks, matrix
        self.documents, self.manifest = documents, manifest


_index = None
_index_error = None
_lock = threading.Lock()


def _load():
    manifest = json.loads((INDEX_DIR / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("model") != embedding_model() or manifest.get("dimensions") != EMBEDDING_DIM:
        raise RuntimeError(
            f"index was built with {manifest.get('model')}; rebuild it with `python -m rag.ingest`")
    chunks = json.loads((INDEX_DIR / "chunks.json").read_text(encoding="utf-8"))
    matrix = np.load(INDEX_DIR / "embeddings.npy")
    if matrix.shape != (len(chunks), EMBEDDING_DIM):
        raise RuntimeError("index files are inconsistent; rebuild with `python -m rag.ingest`")
    documents = load_documents()
    missing = {c["doc_id"] for c in chunks} - set(documents)
    if missing:
        raise RuntimeError(f"index refers to missing documents {sorted(missing)}; rebuild it")
    return Index(chunks, matrix, documents, manifest)


def get_index():
    """Return the loaded Index, or None if it is unavailable."""
    global _index, _index_error
    with _lock:
        if _index is None and _index_error is None:
            try:
                _index = _load()
                logger.info("Knowledge index loaded: %d passages", len(_index.chunks))
            except FileNotFoundError:
                _index_error = "not built (run `python -m rag.ingest`)"
            except Exception as err:  # noqa: BLE001 - reported via status()
                _index_error = str(err)
            if _index_error:
                logger.warning("Knowledge index unavailable: %s", _index_error)
        return _index


def status():
    index = get_index()
    if index is None:
        return {"ready": False, "reason": _index_error}
    return {
        "ready": True,
        "model": index.manifest["model"],
        "passages": len(index.chunks),
        "built": index.manifest.get("built"),
    }


def search(client, query, top_k=DEFAULT_TOP_K, min_score=MIN_SCORE, timeout_ms=10_000):
    """
    Return up to top_k passages relevant to `query`, best first. Each result
    is a dict with the chunk fields plus `score` and document metadata.
    Returns [] when the index is unavailable.
    """
    index = get_index()
    if index is None or not query.strip():
        return []

    query_vec = embed_texts(client, [query], task_type="RETRIEVAL_QUERY",
                            timeout_ms=timeout_ms, retries=0)[0]
    scores = index.matrix @ query_vec

    results, per_doc = [], {}
    order = np.argsort(-scores)
    floor = max(min_score, float(scores[order[0]]) - RELATIVE_MARGIN)
    for i in order:
        score = float(scores[i])
        if score < floor or len(results) >= top_k:
            break
        chunk = index.chunks[i]
        if per_doc.get(chunk["doc_id"], 0) >= MAX_PER_DOCUMENT:
            continue
        per_doc[chunk["doc_id"]] = per_doc.get(chunk["doc_id"], 0) + 1
        doc = index.documents[chunk["doc_id"]]
        results.append({
            **chunk,
            "score": round(score, 4),
            "title": doc.title,
            "publisher": doc.publisher,
            "url": doc.url,
        })
    return results
