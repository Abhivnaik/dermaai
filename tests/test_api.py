"""
Automated API tests for the DermaAI backend.

Run from the project root:
    .venv\\Scripts\\python.exe -m pytest

The tests load the real ResNet50 (about 20-60 s on first import). Gemini is
never called: the chat tests replace the Gemini/retrieval functions with
stand-ins, so they need no API key or network.
"""

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import backend.app.routes.chat as chat_route
from backend.app.main import app
from backend.app.services.gemini_service import AssistantUnavailable

SAMPLE = Path(__file__).parent / "sample.jpg"
CLASSES = {"nv", "mel", "bkl", "bcc", "akiec", "vasc", "df"}

client = TestClient(app)


def upload(data=None, name="sample.jpg", content_type="image/jpeg"):
    return {"file": (name, SAMPLE.read_bytes() if data is None else data, content_type)}


def png_bytes(color=(200, 120, 100), size=(64, 48)):
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


# ---------------------------------------------------------------- health
def test_health():
    assert client.get("/health").json() == {"status": "healthy"}


# ---------------------------------------------------------------- predict
def test_predict_sample_matches_known_output():
    r = client.post("/api/predict", files=upload())
    assert r.status_code == 200
    body = r.json()
    # Reference output for tests/sample.jpg (CLAUDE.md, Section 5G)
    assert body["predicted_class"] == "bkl"
    assert body["confidence"] == 87.32
    assert set(body["all_probabilities"]) == CLASSES
    assert abs(sum(body["all_probabilities"].values()) - 100) < 0.1
    assert "not a medical diagnosis" in body["disclaimer"]


def test_predict_accepts_png():
    r = client.post("/api/predict", files=upload(png_bytes(), "x.png", "image/png"))
    assert r.status_code == 200
    assert r.json()["predicted_class"] in CLASSES


@pytest.mark.parametrize(
    "files, status",
    [
        (upload(b"hello", "x.txt", "text/plain"), 400),            # wrong type
        (upload(b"not really a jpeg"), 400),                       # not an image
        (upload(b"0" * (10 * 1024 * 1024 + 1)), 413),              # over 10 MB
    ],
)
def test_predict_rejects_bad_uploads(files, status):
    assert client.post("/api/predict", files=files).status_code == status


def test_predict_requires_file():
    assert client.post("/api/predict").status_code == 422


# ---------------------------------------------------------------- grad-cam
def test_gradcam_default_explains_predicted_class():
    predict = client.post("/api/predict", files=upload()).json()
    r = client.post("/api/gradcam", files=upload())
    assert r.status_code == 200
    body = r.json()
    assert body["target_class"] == body["predicted_class"] == "bkl"
    assert body["all_probabilities"] == predict["all_probabilities"]
    assert body["layer"] == "layer4[-1]"
    assert body["empty_heatmap"] is False
    assert max(body["width"], body["height"]) <= 512
    for key in ("heatmap", "overlay", "model_input", "model_input_heatmap"):
        assert body["images"][key].startswith("data:image/png;base64,")


def test_gradcam_other_class_gives_different_heatmap():
    bkl = client.post("/api/gradcam", files=upload()).json()
    mel = client.post("/api/gradcam", files=upload(), data={"target_class": "mel"}).json()
    assert mel["target_class"] == "mel"
    assert mel["target_probability"] == mel["all_probabilities"]["mel"]
    assert mel["images"]["heatmap"] != bkl["images"]["heatmap"]


def test_gradcam_rejects_unknown_class():
    r = client.post("/api/gradcam", files=upload(), data={"target_class": "cancer"})
    assert r.status_code == 422


def test_gradcam_rejects_bad_upload():
    assert client.post("/api/gradcam", files=upload(b"nope", "x.txt", "text/plain")).status_code == 400


# ---------------------------------------------------------------- library
def test_library_lists_documents():
    body = client.get("/api/library").json()
    assert len(body["documents"]) >= 1
    first = body["documents"][0]
    for key in ("id", "title", "publisher", "url", "license", "classes", "sections"):
        assert key in first
    assert "ready" in body["search_index"]


def test_library_document_and_404():
    doc_id = client.get("/api/library").json()["documents"][0]["id"]
    r = client.get(f"/api/library/{doc_id}")
    assert r.status_code == 200 and r.json()["body"]
    assert client.get("/api/library/does-not-exist").status_code == 404
    assert client.get("/api/library/..%2F..%2F.env").status_code == 404


# ---------------------------------------------------------------- chat
FAKE_PASSAGES = [
    {"doc_id": "ham10000-dataset", "title": "HAM10000", "publisher": "Sci Data",
     "url": "https://example.org", "heading": "Usage Notes › bkl", "anchor": "bkl",
     "text": "Benign keratosis is a generic class."},
    {"doc_id": "other", "title": "Other", "publisher": "NCI",
     "url": "https://example.org/2", "heading": "", "anchor": "", "text": "Unused."},
]


@pytest.fixture
def fake_gemini(monkeypatch):
    calls = {}

    def fake_find_sources(question, history, prediction):
        calls["prediction"] = prediction
        return FAKE_PASSAGES

    def fake_ask(question, history, prediction, sources):
        calls["history"] = history
        return "BKL is a benign group [1]. Not cited: [7].", "test-model"

    monkeypatch.setattr(chat_route, "find_sources", fake_find_sources)
    monkeypatch.setattr(chat_route, "ask_gemini", fake_ask)
    return calls


def test_chat_returns_only_cited_sources(fake_gemini):
    r = client.post("/api/chat", json={
        "question": "What is BKL?",
        "history": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}],
        "prediction": {"predicted_class": "bkl", "confidence": 87.32},
    })
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == "test-model"
    assert [s["n"] for s in body["sources"]] == [1]          # [7] is not a real source
    assert body["sources"][0]["anchor"] == "bkl"
    assert fake_gemini["prediction"]["predicted_class"] == "bkl"
    assert len(fake_gemini["history"]) == 2


@pytest.mark.parametrize(
    "payload",
    [
        {"question": "   "},                                                      # blank
        {"question": "x" * 2001},                                                 # too long
        {"question": "hi", "prediction": {"predicted_class": "cancer", "confidence": 50}},
        {"question": "hi", "prediction": {"predicted_class": "bkl", "confidence": 150}},
        {"question": "hi", "history": [{"role": "system", "content": "x"}]},     # bad role
    ],
)
def test_chat_validates_input(fake_gemini, payload):
    assert client.post("/api/chat", json=payload).status_code == 422


def test_chat_maps_assistant_errors(monkeypatch):
    def failing(*args, **kwargs):
        raise AssistantUnavailable()

    monkeypatch.setattr(chat_route, "find_sources", lambda *a: [])
    monkeypatch.setattr(chat_route, "ask_gemini", failing)
    r = client.post("/api/chat", json={"question": "hi"})
    assert r.status_code == 503
    assert "busy" in r.json()["detail"]
