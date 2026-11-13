"""
Knowledge-library API: lists the curated reference documents in
rag/documents/ and serves their text for the Library page.
"""

import logging

from fastapi import APIRouter, HTTPException

from rag import retriever
from rag.library import load_documents

router = APIRouter(prefix="/api/library", tags=["Knowledge library"])
logger = logging.getLogger(__name__)

# Documents are loaded once at startup, like the model and the search index.
# Restart the backend after adding or editing documents (and re-run
# `python -m rag.ingest` so the assistant can search them).
try:
    DOCUMENTS = load_documents()
except Exception:  # noqa: BLE001 - a bad file must not stop the backend
    logger.exception("Could not load knowledge-library documents")
    DOCUMENTS = {}


@router.get("")
def list_documents():
    return {
        "documents": [doc.metadata() for doc in DOCUMENTS.values()],
        "search_index": retriever.status(),
    }


@router.get("/{doc_id}")
def get_document(doc_id: str):
    # Lookup by known id only: the id is never used to build a file path
    doc = DOCUMENTS.get(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {**doc.metadata(), "body": doc.body}
