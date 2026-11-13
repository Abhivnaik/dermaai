



# DermaAI — Project Context & Development Instructions

## 1. Project Overview

**Project Name:** DermaAI  
**Project Type:** AI-Assisted Skin Lesion Analysis Platform

DermaAI is an experimental AI research application that uses a trained deep learning model to classify dermoscopic skin lesion images into seven HAM10000 dataset categories.

The application will combine:
- Deep learning-based image classification.
- Image preprocessing.
- Explainable AI using Grad-CAM.
- Gemini-powered AI assistant.
- Retrieval-Augmented Generation (RAG).
- Professional web dashboard.

**Important:** This is an educational and research project, not a clinically validated medical diagnostic system.

---

## 2. Main Project Objectives

1. Allow users to upload dermoscopic skin images.
2. Analyze images using a trained ResNet50 model.
3. Display predictions for seven skin lesion classes.
4. Display class probability distributions.
5. Generate Grad-CAM visual explanations.
6. Integrate Gemini API for an AI assistant.
7. Implement RAG for retrieving relevant skin disease information.
8. Build a professional, responsive frontend.
9. Test the complete application.
10. Publish the project on GitHub and prepare for deployment.

---

## 3. Technology Stack

### Machine Learning
- Python 3.10
- PyTorch
- Torchvision
- ResNet50
- NumPy
- OpenCV
- Albumentations
- Pillow

### Backend
- FastAPI
- Uvicorn
- Python
- REST APIs
- Python Multipart

### Frontend
- React 19
- Vite 8
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- React Router 8 (package name `react-router`)
- JavaScript
- Node.js v26.13.1, npm 11.20.0

### AI Integration
- Google Gemini API (`google-genai` SDK): chat (Section 5I)
- Retrieval-Augmented Generation (RAG) with `gemini-embedding-001`
  embeddings and NumPy cosine-similarity search; no separate vector
  database is needed at this size (Section 5J)
- Grad-CAM: planned

### Development Tools
- Visual Studio Code
- PowerShell
- Python virtual environment (.venv)
- Git and GitHub (planned)

---

## 4. Machine Learning Model Details

### Dataset

HAM10000 Skin Cancer Dataset.

Seven classification categories:

| Class | Description |
|---|---|
| nv | Melanocytic nevi |
| mel | Melanoma |
| bkl | Benign keratosis-like lesions |
| bcc | Basal cell carcinoma |
| akiec | Actinic keratoses and intraepithelial carcinoma |
| vasc | Vascular lesions |
| df | Dermatofibroma |

### Trained Model

ResNet50 using ImageNet V2 pretrained weights.

The model has a custom classifier:

- Dropout (0.5)
- Linear (2048 → 512)
- ReLU
- BatchNorm1d
- Dropout (0.3)
- Linear (512 → 256)
- ReLU
- Dropout (0.2)
- Linear (256 → 7)

### Model File

`ml/models/best_resnet50.pth`

- Approximately 94.5 MB.
- Contains a direct PyTorch state dictionary.
- Successfully loaded with strict state dictionary matching.
- Currently runs on CPU.

### Image Configuration

- Input size: 224 × 224.
- Number of classes: 7.
- RGB image input.
- Mean: [0.756, 0.555, 0.582]
- Standard deviation: [0.103, 0.079, 0.090]

### Preprocessing Pipeline

The original training notebook uses:

1. Image resizing.
2. Hair removal using morphological blackhat and inpainting.
3. CLAHE.
4. Gaussian blur.
5. Median filtering.
6. Bilateral filtering.
7. Lesion segmentation using Otsu thresholding.
8. Edge enhancement.
9. Normalization.
10. Conversion into a PyTorch tensor.

Maintain consistency with the original training notebook during inference.

---

## 5. Work Completed So Far

### A. Project Setup — COMPLETED

Created the project directory:

Aproject/

Created the following main folders:

- backend/
- frontend/
- ml/
- rag/
- docs/
- tests/

Created and activated `.venv`.

### B. Python Environment — COMPLETED

Installed and verified:

- PyTorch 2.14.1+cpu
- OpenCV 5.0.0
- Albumentations 2.0.8
- Torchvision
- Pillow
- FastAPI
- Uvicorn
- python-multipart

### C. Model Loading — COMPLETED

Created:

`ml/inference/model_loader.py`

Successfully loaded `best_resnet50.pth`.

Verified:
- Model architecture matches the checkpoint.
- Seven output classes.
- No missing or unexpected state dictionary parameters.
- CPU inference works.

### D. Image Preprocessing — COMPLETED

Created:

`ml/preprocessing/skin_preprocess.py`

Implemented the original training preprocessing pipeline.

Verified that the module imports successfully.

Tested image preprocessing using a sample NumPy image.

Expected tensor shape:

`[1, 3, 224, 224]`

Data type:

`torch.float32`

### E. Prediction Module — COMPLETED

Created:

`ml/inference/predict.py`

Implemented:
- Image loading.
- RGB conversion.
- Preprocessing.
- ResNet50 inference.
- Softmax probability calculation.
- Predicted class.
- Seven-class probability output.

Successfully tested a real image.

Example prediction:

- Predicted class: BKL
- Confidence score: 87.32%

This was a model output, not a clinically confirmed result.

### F. FastAPI Backend — COMPLETED

Created and tested FastAPI backend.

Main file:

`backend/app/main.py`

Existing endpoints:

- GET `/`
- GET `/health`
- POST `/api/chat` — body `{question, history?, prediction?}`; returns
  `{question, answer, model, sources}` (see Sections 5I and 5J)
- GET `/api/library` — library documents' metadata plus `search_index` status
- GET `/api/library/{doc_id}` — one document's metadata and Markdown `body`
- POST `/api/gradcam` — multipart `file` and optional `target_class`; returns
  probabilities and Grad-CAM images (see Section 5K)
- POST `/api/predict` — multipart field `file`; returns `predicted_class`
  (short code), `confidence` (percentage 0–100), `all_probabilities`
  (percentages keyed by short code) and `disclaimer`

Created:

`backend/app/routes/prediction.py`

Image upload prediction API successfully tested through Swagger UI.

Verified:
- Image upload works.
- Image preprocessing works.
- ResNet50 inference works.
- JSON response is returned.
- HTTP 200 OK received.

The backend starts using:

`python -m uvicorn backend.app.main:app --log-level debug`

Swagger documentation:

`http://127.0.0.1:8000/docs`

The prediction endpoint has successfully returned predictions for different images.

### G. Backend Performance Fix — COMPLETED

`backend/app/routes/prediction.py` now loads the ResNet50 model once at
server startup (`MODEL = load_resnet50()`) instead of on every request, and
no longer imports `predict_image` (which loaded a second, unused model copy).

Verified with `tests/sample.jpg`: identical output (BKL, 87.32%, all
probabilities unchanged); prediction time dropped from ~4–10 s to ~0.5 s.
Backend startup takes roughly 60–100 s on this machine (PyTorch import +
model load); wait for `Application startup complete`.

### H. Frontend — COMPLETED (core pages)

React + Vite + Tailwind CSS app in `frontend/`.

Implemented:
- Layout with sticky navbar (mobile menu below 1024 px) and footer with a
  permanent research disclaimer on every page.
- Routes: `/` Landing, `/analyze`, `/results`, `/grad-cam`, `/assistant`,
  `/library`, `/about`, and a 404 page.
- Analyze page: drag-and-drop / browse upload, preview, client-side
  validation (type, 10 MB, decodable image), loading state with elapsed
  time, cancel, readable error messages.
- Results dashboard: predicted class (full name + code), confidence,
  runner-up class, low-confidence warning (< 50%), sorted probability bars
  (plain HTML/Tailwind, no chart library), disclaimer from the API.
- Landing and About pages with dataset, architecture, preprocessing,
  limitations and project status. No evaluation metrics are shown because
  none have been measured yet.
- Later additions: Assistant (Section 5I), Library (Section 5J) and Grad-CAM
  (Section 5K).
- Navy and teal colour scales defined as Tailwind theme tokens in
  `frontend/src/index.css` (e.g. `bg-navy-900`, `text-teal-600`).

The last analysis is held in memory (React context) only; refreshing the
page clears it. Images are never stored.

Verified: `npm.cmd run lint` and `npm.cmd run build` pass; full
Analyze → Results flow tested in headless Chrome at 390 px and 1280 px
with no horizontal overflow.

### I. Gemini AI Assistant — COMPLETED (Phase 4)

Root cause of the old HTTP 400: `.env` contained a placeholder, not a real
key (`API_KEY_INVALID`). The model name was not the problem —
`gemini-3.8-flash` is listed as Stable in Google's official model docs.

Backend (`backend/app/services/gemini_service.py`, `backend/app/routes/chat.py`):
- Client created lazily; a missing key no longer crashes the app
  (`/api/chat` returns 503 "not configured", `/api/predict` still works).
- `.env` settings: `GEMINI_API_KEY` (required), `GEMINI_MODEL` (default
  `gemini-3.8-flash`), `GEMINI_FALLBACK_MODEL` (default
  `gemini-3.5-flash-lite`).
- Automatic fallback when the primary is overloaded/rate-limited/unavailable.
  Primary gets a 20 s time limit, fallback 60 s.
- Educational-only system instruction (no diagnosis, refer to a
  dermatologist, decline off-topic requests, no invented references).
- Multi-turn `history` (max 20 turns) and optional `prediction` context
  (validated class codes, confidence 0–100).
- Error mapping: 503 not configured / busy, 502 invalid key, 429 rate
  limit, 504 timeout, 422 invalid input. Keys never appear in messages.
- Route is plain `def`, so Gemini calls run in a worker thread.

Frontend: `/assistant` chat page (react-markdown rendering, suggestions,
typing indicator, retry, clear, opt-in "share this result" checkbox,
privacy note). Conversation stored in `ChatProvider` (memory only). Results
page links to the assistant.

Verified: all chat cases via curl (basic, history, prediction context,
off-topic refusal, blank → 422, invalid context → 422) and the full
Analyze → Results → Assistant flow in headless Chrome at 390/1280 px.

Observed on 2026-11-13: `gemini-3.8-flash` returned 503/504 on almost every
request, so answers came from the fallback and took ~20 s.

### J. RAG Knowledge Library — COMPLETED (Phase 5)

See `rag/README.md` for details and commands.

**Sources:** 12 documents in `rag/documents/` (328 passages). All are verbatim
excerpts from public sources whose licences allow reuse with credit:
- the HAM10000 paper (CC BY 4.0), including its per-class descriptions;
- NCI PDQ patient summaries: skin cancer treatment, melanoma treatment,
  screening, prevention;
- the NCI moles / dysplastic nevi / melanoma fact sheet;
- 18 NCI Dictionary definitions;
- five peer-reviewed open-access articles from Europe PMC, filling the
  bkl/df/vasc gaps:
  - seborrheic keratosis: Wollina 2019 (CC BY) and Moscarella 2021 (CC BY-NC);
  - dermatofibroma: Wan 2025 (CC BY-NC) and Orzan 2023 (CC BY);
  - vascular lesions: Gao 2021 (CC BY).

Each document records its publisher, URL, licence, credit line, source date
and retrieval date. `fetch_sources.py` checks each article's licence in its
XML and accepts only CC BY and CC BY-NC (DermaAI is non-commercial and
educational). DermNet and WHO were not used because of their licence
restrictions. See `rag/README.md` for the source table and remaining gaps.

**Pipeline:**
- `rag/fetch_sources.py` downloads the sources and converts the HTML to Markdown.
- `rag/library.py` parses the front matter.
- `rag/ingest.py` splits documents into passages by heading and embeds them.
- `rag/embeddings.py` calls `gemini-embedding-001` at 768 dimensions with
  normalised vectors. `GEMINI_EMBEDDING_MODEL` is optional.
- `rag/retriever.py` runs the NumPy cosine search: top 4 passages, score ≥ 0.62,
  within 0.10 of the best match, at most 2 per document.

Retrieval calibration on 2026-11-13, with all 12 documents:
- 15 on-topic questions scored 0.70–0.80 for the best passage, and the
  correct section ranked first;
- off-topic questions scored ≤ 0.52;
- Grad-CAM, which the library doesn't cover, scored 0.60.

**Backend:**
- `find_sources()` builds the search query from the question, the previous
  user turn, and the predicted class name when the question is about the result.
- `ask_gemini(..., sources=)` puts the passages into the system instruction
  as [1]..[n], with rules to cite only those passages.
- `/api/chat` returns only the cited sources, each with `doc_id`, `heading`,
  `anchor` and `excerpt`.
- Earlier answers' [n] markers are removed from the history.
- Retrieval failures, or a missing index, never block an answer.
- `backend/app/routes/library.py` serves the documents. They are looked up
  by known id, never by a file path.

**Frontend:**
- `/library`: document cards with filters by lesion category (`?class=bkl`),
  plus a warning if the index isn't built.
- `/library/:docId` reader:
  - Markdown with heading anchors (`utils/slugify.js` matches the Python `slugify`);
  - the cited section is highlighted and scrolled into view;
  - source, licence and credit panel, and a sections list.
- The assistant shows a numbered "Sources" list linking to the exact section.
- The Results page's "Read about …" link opens the filtered library.

**Verified:**
- library API, including unknown and path-traversal ids → 404;
- six chat cases: df, mole→melanoma, "my result" (bkl), Grad-CAM (no
  citations), off-topic (declined), follow-up using history. Every
  citation mapped to a real passage;
- headless Chrome at 390/1280 px: library, filter, deep link, Results →
  Library, Assistant → Sources → cited section; no overflow and no console errors;
- lint and build pass.

### K. Grad-CAM Explainability — COMPLETED (Phase 3)

Implemented by hand in PyTorch; no new dependencies.

**Module:** `ml/explainability/gradcam.py`
- Target layer: `model.layer4[-1]` (the whole last bottleneck block). This
  matches the training notebook and was chosen by the project owner on
  2026-11-13. It replaces the originally specified `layer4[-1].conv3`, which
  is still available as `layer="conv3"` and maps the same region more broadly.
- The heatmap is the ReLU of the gradient-weighted feature maps, a 7×7 grid
  normalised to 0–1 and upsampled bilinearly.
- Colours: the 'inferno' colour map, with opacity rising with the value.
- The forward hook is attached only during a Grad-CAM call, behind a lock.
  It ignores `inference_mode` forward passes, so predictions are unaffected.
- `torch.autograd.grad` is used, so model parameters never get a `.grad`.
  The model, weights and preprocessing are unchanged.

**Shared model:** `backend/app/services/model_service.py` holds the single
loaded model and the upload validation. Both `/api/predict` and
`/api/gradcam` use it.

**Endpoint:** `POST /api/gradcam`
- Input: multipart `file` and optional `target_class` (one of the 7 codes;
  default is the predicted class).
- Returns `predicted_class`, `confidence` and `all_probabilities` (identical
  to `/api/predict`), plus `target_class`, `target_probability`, `layer`,
  `empty_heatmap`, `width`, `height` and `disclaimer`.
- Also returns `images`, all as PNG data URLs:
  - `heatmap`: RGBA, longest side ≤ 512 px;
  - `overlay`;
  - `model_input`: the 224×224 image after preprocessing;
  - `model_input_heatmap`.
- The heavy work runs in a worker thread. Nothing is stored.
- Measured about 0.6 s per request; the first call after startup takes about 3.7 s.

**Frontend:**
- `/grad-cam` page:
  - panels: original, model input, overlay;
  - overlay can sit on the original or on the model input;
  - opacity slider and colour legend;
  - class selector with probabilities (`?class=mel`);
  - "How to read this" and "Limitations" sections, citing Selvaraju et al., ICCV 2017.
- Results dashboard: a Grad-CAM card for the top class, generated
  automatically, with links to the full view.
- `PredictionProvider` now also stores the uploaded `file` and caches heatmaps
  per class (`gradcams`, `requestGradCam`). The cache is cleared when a new
  image is analysed.

**Finding (not changed):** the training preprocessing's Otsu segmentation
blacks out large parts of `tests/sample.jpg`, so the model sees a heavily
masked image. This is why the page can show the heatmap on the model input.
Consider mentioning it in the report's limitations.

**Verified:**
- `/api/predict` output is unchanged (BKL 87.32%).
- Heatmaps are deterministic and differ between classes; probabilities match.
- Error cases: invalid class → 422, wrong type → 400, broken image → 400,
  over 10 MB → 413, missing file → 422.
- Headless Chrome at 390/1280 px:
  - empty state;
  - Results card generated with 1 request;
  - full view reuses the cache;
  - mel heatmap differs from bkl;
  - model-input toggle and opacity slider work;
  - switching back to bkl uses the cache;
  - no overflow and no console errors.
- Lint and build pass.

### L. Training Notebook Review (evaluation phase skipped)

The original training notebook is `extra/skin-training-resnet50 (2).ipynb`
(Kaggle, Tesla T4). It shows:
- **Data:** Kaggle `kmader/skin-cancer-mnist-ham10000`, all 10,015 images.
- **Split:** `train_test_split`, stratified by label, `random_state=42`:
  70% train, then the remaining 30% halved, giving 7,010 / 1,502 / 1,503
  images.
- **Training:**
  - preprocessing identical to `ml/preprocessing/skin_preprocess.py`;
  - heavy albumentations augmentation and a WeightedRandomSampler;
  - CrossEntropy with label smoothing 0.1, AdamW, OneCycleLR;
  - layers 1–3 frozen for 5 epochs, then all layers trained;
  - early stopping on validation accuracy.
- **Results the notebook reports on its 1,503-image test split:**
  - accuracy 86.63%;
  - macro recall (balanced accuracy) 82.2%;
  - melanoma recall 70.1% and precision 63.6%.
- **Caveat:**
  - The split was made **per image, not per `lesion_id`**. HAM10000 has
    several images of many lesions, so some test images probably show lesions
    seen in training, and the figures are likely optimistic.
  - These figures have not been independently re-evaluated.
- **Grad-CAM:** the notebook used `layer4[-1]`, which the app now uses too.

A formal re-evaluation was planned but **skipped by the project owner on
2026-11-13**. The plan, if it's revisited:
1. Recreate the split from the same metadata CSV.
2. Confirm that it reproduces about 86.6%.
3. Report metrics on the subset of test images whose lesion is absent from
   train/val.
4. Optionally add the ISIC 2018 Task 3 test set as an external check.

The About page still says that formal metrics are not yet published. The
README quotes the notebook's figures with the caveat above.

### M. Backend Hardening, Tests and Packaging — COMPLETED

- `/api/predict` runs preprocessing and inference in a worker thread
  (`run_in_threadpool`) and uses the shared `read_upload_as_rgb` validation.
  Its response is unchanged.
- **CORS:** `CORSMiddleware` is enabled only when `CORS_ORIGINS`
  (comma-separated) is set in `.env`. It allows GET/POST only. In development
  the Vite proxy is used, so CORS stays off.
- **Tests:** `tests/test_api.py`, 20 pytest tests run with `python -m pytest`
  (`pytest.ini` at the root). They cover:
  - health;
  - predict: the sample reference output (bkl 87.32%), PNG, wrong type,
    broken image, over 10 MB, missing file;
  - Grad-CAM: default class, other class, invalid class, bad upload;
  - library: list, document, 404, path traversal;
  - chat: cited-sources mapping, validation errors and error mapping. Gemini
    is replaced with stand-ins, so no key or network is needed.
  - All 20 passed, taking about 65 s including the model load.
- **Packaging:**
  - `requirements.txt` pins the versions in use; torch is the CPU build, and
    the CPU index command is in the README;
  - `requirements-dev.txt` adds pytest;
  - `.env.example` has placeholders only;
  - the root `README.md` covers features, architecture, setup, API, tests,
    performance with its caveat, limitations and licences.

---

## 6. Current Project Status

The machine learning inference pipeline, backend and core frontend are working.

The frontend talks to the backend through the Vite dev proxy (`/api` →
`http://127.0.0.1:8000`, configured in `frontend/vite.config.js`). CORS can
be enabled for deployment with `CORS_ORIGINS` in `.env` (Section 5M).

Gemini AI assistant is working (Section 5I).

RAG knowledge library is working; assistant answers cite library passages (Section 5J).

Grad-CAM explainability is working: endpoint, Grad-CAM page and Results card (Section 5K).

Automated API tests (20) pass; README, requirements and `.env.example` exist
(Section 5M).

**Published on GitHub (2026-11-13):** <https://github.com/Abhivnaik/dermaai>.
The repository is public, on branch `main`, and commits use the GitHub noreply
email. Before publishing, a secret scan confirmed the Gemini key is in no
committed file; `.env` and `*.pth` are ignored. The model weights are attached
to release **v1.0** (<https://github.com/Abhivnaik/dermaai/releases/tag/v1.0>),
and the README links to them. Git and the GitHub CLI were installed with
winget, and `gh` is logged in as Abhivnaik. In this environment, call them by
full path (`C:\Program Files\Git\cmd\git.exe`, `C:\Program Files\GitHub CLI\gh.exe`)
or put Git on PATH first. The app has not been deployed.

Formal model re-evaluation was skipped by choice; only the training
notebook's own test figures exist (Section 5L).

---

## 7. Planned Development Roadmap

### Phase 1 — Frontend Development — CORE PAGES COMPLETED (see Section 5H)

Build a professional healthcare AI research interface using React + Vite + Tailwind CSS.

Required pages:

1. Landing page.
2. Image analysis page.
3. Prediction results dashboard.
4. Grad-CAM visualization page.
5. AI assistant page.
6. Research/knowledge library.
7. About project page.

Design requirements:

- Professional healthcare technology appearance.
- Navy, teal and white colour palette.
- Responsive desktop and mobile layouts.
- Modern typography.
- Clean cards and dashboard components.
- Image upload with preview.
- Loading indicators and error handling.
- Probability charts.
- Clear research disclaimer.

### Phase 2 — Backend Improvements — COMPLETED (see Sections 5G, 5I and 5M)

- ~~Load the trained model once rather than on every request.~~ Done (5G).
- ~~Run CPU-bound inference without blocking the event loop.~~ Done (5M).
- ~~Do not crash at import time when `GEMINI_API_KEY` is missing.~~ Done (5I).
- ~~Image validation and upload limits.~~ Done: type, 10 MB and decodability,
  shared by predict and Grad-CAM.
- ~~Exception handling and validation.~~ Done: Pydantic models and mapped error codes.
- ~~CORS.~~ Done: opt-in via `CORS_ORIGINS` (5M).
- ~~API tests.~~ Done: `tests/test_api.py` (5M).
- ~~No temporary image files.~~ Done: all images are processed in memory.

### Phase 3 — Grad-CAM Explainability — COMPLETED (see Section 5K)

Implement Grad-CAM using:

`model.layer4[-1]` (changed from `layer4[-1].conv3` on 2026-11-13 to match
the training notebook; see Section 5K)

Requirements:

- Generate a heatmap.
- Overlay heatmap on original image.
- Display original and heatmap side by side.
- Explain which image regions influenced the model output.
- Integrate Grad-CAM into the results dashboard.

### Phase 4 — Gemini AI Integration — COMPLETED (see Section 5I)

- Troubleshoot existing Gemini API integration.
- Verify supported model names and SDK using current official Google documentation.
- Keep API key in `.env`.
- Never expose API keys in frontend code.
- Build a conversational AI assistant.
- Provide relevant educational information about skin lesions.

### Phase 5 — RAG Implementation — COMPLETED (see Section 5J)

Build a retrieval-based knowledge system.

Potential knowledge sources:
- Authoritative dermatology references.
- Peer-reviewed research.
- WHO resources.
- Relevant clinical educational resources.

Planned functionality:
- Document ingestion.
- Text extraction and chunking.
- Embedding generation.
- Vector database.
- Semantic retrieval.
- Context-aware Gemini responses.
- Source citations in responses.

Select the RAG framework and vector database based on project requirements.

### Phase 6 — Frontend and Backend Integration

Connect React to FastAPI.

Implement:
- Image upload.
- API requests.
- Prediction display.
- Probability charts.
- Grad-CAM display.
- AI chat.
- Error and loading states.

### Phase 7 — Testing and Evaluation — API TESTS DONE (5M); MODEL RE-EVALUATION SKIPPED (5L)

- Test all seven output categories.
- Evaluate on labelled held-out HAM10000 test data.
- Calculate accuracy, precision, recall and F1-score.
- Evaluate per-class performance.
- Inspect confusion matrices.
- Test invalid image uploads.
- Test large image uploads.
- Test API error handling.
- Verify frontend responsiveness.

Do not claim clinical accuracy without appropriate external clinical validation.

### Phase 8 — GitHub and Deployment — DOCUMENTATION DONE (5M); PUBLISHING AND DEPLOYMENT PENDING

- Create a clean GitHub repository.
- ~~Add README.md.~~ Done.
- ~~Add requirements.txt.~~ Done, along with `requirements-dev.txt` and `.env.example`.
- ~~Add `.gitignore`.~~ Done.
- ~~Document installation, model architecture, dataset and API.~~ Done in README.md.
- Add project screenshots.
- Keep `.env` and secrets out of GitHub.
- Avoid committing large model files unless using Git LFS or another suitable storage solution.
- Deploy backend and frontend.

---

## 8. Current Folder Structure

Expected structure:

Aproject/
│
├── backend/
│   └── app/
│       ├── main.py
│       ├── routes/
│       │   ├── chat.py
│       │   ├── gradcam.py
│       │   ├── library.py
│       │   └── prediction.py
│       └── services/
│           ├── gemini_service.py
│           └── model_service.py      (shared ResNet50 + upload validation)
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js            (Tailwind plugin, 127.0.0.1:5173, /api proxy)
│   ├── package.json
│   ├── public/favicon.svg
│   └── src/
│       ├── main.jsx              (BrowserRouter + PredictionProvider + ChatProvider)
│       ├── App.jsx               (routes)
│       ├── index.css             (Tailwind + navy/teal theme tokens)
│       ├── api/client.js         (predictImage, getGradCam, askAssistant, getLibrary, getLibraryDocument)
│       ├── config/navigation.js
│       ├── context/              (Prediction* and Chat* context, provider, hook)
│       ├── data/lesionClasses.js (7 class names + descriptions)
│       ├── utils/                (validateImage.js, slugify.js)
│       ├── components/
│       │   ├── layout/           (Layout, Navbar, Footer, Logo)
│       │   ├── ui/               (PageHeader, ComingSoon, Icon, StatusBadge)
│       │   ├── analyze/ImageDropzone.jsx
│       │   ├── results/ProbabilityBars.jsx
│       │   ├── gradcam/          (HeatmapOverlay, HeatmapLegend)
│       │   ├── assistant/MarkdownMessage.jsx
│       │   └── library/MarkdownDocument.jsx
│       └── pages/                (Landing, Analyze, Results, GradCam, Assistant,
│                                  Library, LibraryDocument, About, NotFound)
│
├── ml/
│   ├── models/
│   │   └── best_resnet50.pth
│   ├── inference/
│   │   ├── model_loader.py
│   │   └── predict.py
│   ├── explainability/
│   │   └── gradcam.py
│   └── preprocessing/
│       └── skin_preprocess.py
│
├── rag/
│   ├── README.md                 (how the library works, adding documents)
│   ├── fetch_sources.py          (download + convert the bundled sources)
│   ├── library.py                (document loading, front matter, slugify)
│   ├── embeddings.py             (Gemini embeddings)
│   ├── ingest.py                 (chunk + embed → index/)
│   ├── retriever.py              (cosine-similarity search)
│   ├── documents/                (12 Markdown documents with source metadata)
│   └── index/                    (chunks.json, embeddings.npy, manifest.json)
│
├── docs/
├── extra/
│   └── skin-training-resnet50 (2).ipynb   (original Kaggle training notebook)
├── tests/
│   ├── sample.jpg
│   └── test_api.py               (20 pytest API tests)
│
├── main.py                       (placeholder script, not used by the app)
├── README.md
├── requirements.txt              (runtime, pinned)
├── requirements-dev.txt          (+ pytest)
├── pytest.ini
├── .env                          (secrets, not in git)
├── .env.example                  (placeholders only)
├── .gitignore
└── CLAUDE.md

Also present but currently empty: `backend/app/database/`,
`backend/app/schemas/`, `ml/evaluation/`, `docs/`.

The structure is based on the current project setup. Verify actual files before modifying anything.

---

## 9. Important Development Instructions for Claude

Act as a senior full-stack developer and ML engineer.

Follow these instructions throughout development:

1. Read this CLAUDE.md before making changes.
2. Inspect the existing project files before creating or replacing files.
3. Preserve the trained ResNet50 model and its architecture.
4. Do not retrain the model unless explicitly requested.
5. Do not change the original preprocessing pipeline without explaining why.
6. Do not overwrite working backend functionality.
7. Keep frontend, backend, ML and RAG code modular.
8. Use clean, maintainable and production-conscious code.
9. Never hardcode API keys or passwords.
10. Use environment variables for secrets.
11. Explain which files need to be created or modified.
12. Provide exact terminal commands.
13. Work incrementally and verify each major step.
14. When an error occurs, diagnose it before proposing large code changes.
15. Do not claim a feature is complete until it has been tested.
16. Keep medical disclaimers visible throughout the application.
17. Do not present AI predictions as medical diagnoses.
18. Do not fabricate model evaluation results or scientific references.

### Working Style

The project owner is learning full-stack development and prefers detailed, step-by-step guidance.

For each task:

- Explain the objective.
- Identify the file to create or edit.
- Provide complete code where appropriate.
- Explain where to paste it.
- Give the exact terminal command.
- Explain the expected output.
- Wait for confirmation or error output before proceeding to the next major step.

Avoid changing many files at once.

---

## 10. Immediate Next Task

Continue from the current project state. Do not start from scratch.

### Running the app (two terminals)

Backend (from `Aproject/`):

`.\.venv\Scripts\Activate.ps1`

`python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`

Frontend (from `Aproject/frontend/`):

`npm.cmd run dev`

Open `http://127.0.0.1:5173`. Use `npm.cmd` rather than `npm` in
PowerShell to avoid execution-policy errors.

Knowledge library (only after changing `rag/documents/`; then restart the backend):

`python -m rag.ingest`

Tests (from `Aproject/`):

`python -m pytest`

### Candidate next tasks (confirm with the project owner first)

1. ~~Publish to GitHub with screenshots.~~ Done (see Section 6).
2. Deployment: choose hosting. The backend needs about 1 GB of RAM for
   PyTorch. Set `CORS_ORIGINS` and point `VITE_API_BASE_URL` at the API.
3. Phase 7 model re-evaluation, if wanted later (plan in Section 5L).
