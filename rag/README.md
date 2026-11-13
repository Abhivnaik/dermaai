# DermaAI knowledge library (RAG)

The AI assistant answers with citations from the documents in `documents/`.

## How it works

1. `documents/*.md`: reference documents. Each starts with a front-matter block
   (see below). All current documents are verbatim excerpts from public
   sources whose licences allow reuse with credit.
2. `python -m rag.ingest` splits each document into passages along its
   headings (about 1,200 characters each). It embeds them with Gemini
   (`gemini-embedding-001`, 768 dimensions, `RETRIEVAL_DOCUMENT`) and writes
   `index/chunks.json`, `index/embeddings.npy` and `index/manifest.json`.
3. On each chat question, `retriever.search()` embeds the question
   (`RETRIEVAL_QUERY`) and ranks passages by cosine similarity with NumPy.
   - It keeps up to 4 passages, at most 2 per document.
   - A passage must score at least 0.62, and no more than 0.10 below the best match.
4. The backend gives the passages to Gemini numbered [1]..[n]. It returns
   only the passages the answer actually cites, and the frontend links
   each one to `/library/<doc-id>#<section>`.

If the index is missing or out of date, the assistant still answers, but
without sources, and `GET /api/library` reports `search_index.ready: false`.

## Commands (run from the project root)

```powershell
# Re-download the bundled sources (overwrites those documents)
.\.venv\Scripts\python.exe -m rag.fetch_sources

# Rebuild the search index: required after any document change
.\.venv\Scripts\python.exe -m rag.ingest
```

Restart the backend after rebuilding so it loads the new index.

## Adding a document

Create `documents/<id>.md`:

```markdown
---
id: my-document-id
title: Full title of the source
publisher: Organisation or authors (journal, year)
url: https://link-to-the-original
license: Licence that allows this reuse
attribution: How the source asks to be credited
classes: nv,mel
source_date: 2024-01-31
retrieved: 2026-11-13
---
## First section

Text…
```

- `id` must be lowercase letters, digits and hyphens. `classes` are HAM10000
  codes: nv, mel, bkl, bcc, akiec, vasc, df.
- Only add material whose licence allows reuse, and never write text and
  present it as coming from a source.
- Use `##`/`###` headings: they become the citation anchors.

## Bundled sources

| Document | Source | Licence |
|---|---|---|
| ham10000-dataset | Tschandl et al., *Scientific Data* 5:180161 (2018) | CC BY 4.0 |
| nci-moles-dysplastic-nevi-melanoma | NCI fact sheet | US Government work |
| nci-skin-cancer-treatment-pdq | NCI PDQ, patient version | PDQ text may be used freely |
| nci-melanoma-treatment-pdq | NCI PDQ, patient version | PDQ text may be used freely |
| nci-skin-cancer-screening-pdq | NCI PDQ, patient version | PDQ text may be used freely |
| nci-skin-cancer-prevention-pdq | NCI PDQ, patient version | PDQ text may be used freely |
| nci-dictionary-skin-terms | NCI Dictionary of Cancer Terms | US Government work |
| seborrheic-keratosis-review-wollina-2019 | Wollina U, *F1000Research* 2019 (PMC6719672) | CC BY 4.0 |
| seborrheic-keratosis-elderly-moscarella-2021 | Moscarella E et al., *Clin Cosmet Investig Dermatol* 2021 (PMC8088980) | CC BY-NC 3.0 |
| dermatofibroma-review-wan-2025 | Wan L et al., *Clin Cosmet Investig Dermatol* 2025 (PMC12333637) | CC BY-NC 4.0 |
| atypical-dermatofibroma-review-2023 | Orzan OA et al., *Diagnostics* 2023 (PMC9955442) | CC BY 4.0 |
| vascular-lesions-dermoscopy-gao-2021 | Gao J et al., *Frontiers in Medicine* 2021 (PMC8273173) | CC BY |

The five journal articles fill the gaps for bkl, df and vasc. They are
downloaded as full-text XML from the Europe PMC API, and `fetch_sources.py`
checks each article's licence in the XML. Only CC BY and CC BY-NC are
accepted; CC BY-NC is acceptable because DermaAI is non-commercial and
educational. Citation markers, figures, references and declarations are
removed; everything else is verbatim.

Remaining gaps:
- No reusable review was found for solar lentigo or lichen planus-like
  keratosis (BKL subtypes); the open-access results were case reports, or
  their licences were unclear.
- The vascular-lesion source is an original research study (Chinese Han
  population), not a review.

Before any commercial use, re-check the CC BY-NC documents.
