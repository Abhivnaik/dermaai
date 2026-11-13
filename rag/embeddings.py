"""
Text embeddings via the Gemini API (google-genai SDK).

Configuration (in .env):
    GEMINI_API_KEY            required
    GEMINI_EMBEDDING_MODEL    optional, default "gemini-embedding-001"

gemini-embedding-001 supports task types (RETRIEVAL_DOCUMENT for library
passages, RETRIEVAL_QUERY for user questions). Vectors are requested at 768
dimensions; Google's docs say vectors smaller than 3072 must be normalised
by the caller, which embed_texts() does.
"""

import os
import time

import numpy as np
from google.genai import errors, types

DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768
BATCH_SIZE = 50


def embedding_model():
    return os.getenv("GEMINI_EMBEDDING_MODEL", "").strip() or DEFAULT_EMBEDDING_MODEL


def embed_texts(client, texts, task_type, model=None, timeout_ms=30_000, retries=4):
    """
    Embed a list of strings. Returns a float32 array of shape
    (len(texts), EMBEDDING_DIM) with unit-length rows.

    Rate-limit (429) and transient server errors are retried with backoff.
    """
    model = model or embedding_model()
    vectors = []
    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start:start + BATCH_SIZE]
        config = types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIM,
            http_options=types.HttpOptions(timeout=timeout_ms),
        )
        for attempt in range(retries + 1):
            try:
                result = client.models.embed_content(model=model, contents=batch, config=config)
                break
            except errors.APIError as err:
                if err.code in (429, 500, 503, 504) and attempt < retries:
                    time.sleep(2 ** attempt * 5)
                    continue
                raise
        vectors.extend(e.values for e in result.embeddings)

    matrix = np.asarray(vectors, dtype=np.float32)
    if matrix.shape != (len(texts), EMBEDDING_DIM):
        raise RuntimeError(f"Unexpected embedding shape {matrix.shape}")
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    return matrix / np.maximum(norms, 1e-12)
