import logging
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.app.services.gemini_service import (
    AssistantError,
    ask_gemini,
    cited_numbers,
    find_sources,
)

router = APIRouter()
logger = logging.getLogger(__name__)

LesionCode = Literal["nv", "mel", "bkl", "bcc", "akiec", "vasc", "df"]


class ChatTurn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class PredictionContext(BaseModel):
    """The user's latest DermaAI result (optional)."""

    predicted_class: LesionCode
    confidence: float = Field(ge=0, le=100)
    all_probabilities: Optional[dict[LesionCode, float]] = None


class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    question: str = Field(min_length=1, max_length=2000)
    # Earlier turns of the conversation, oldest first (optional)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)
    prediction: Optional[PredictionContext] = None


class SourceRef(BaseModel):
    """A knowledge-library passage the answer cites as [n]."""

    n: int
    doc_id: str
    title: str
    publisher: str
    url: str
    heading: str
    anchor: str
    excerpt: str


class ChatResponse(BaseModel):
    question: str
    answer: str
    model: str
    # Only passages actually cited in the answer, in citation-number order
    sources: list[SourceRef] = Field(default_factory=list)


EXCERPT_CHARS = 280


def _excerpt(text):
    text = " ".join(text.split())
    if len(text) <= EXCERPT_CHARS:
        return text
    return text[:EXCERPT_CHARS].rsplit(" ", 1)[0] + "…"


# Plain `def` (not async): FastAPI runs it in a worker thread, so the
# blocking Gemini call does not freeze other requests such as /api/predict.
@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        history = [turn.model_dump() for turn in request.history]
        prediction = request.prediction.model_dump() if request.prediction else None

        passages = find_sources(request.question, history, prediction)
        answer, model = ask_gemini(
            question=request.question,
            history=history,
            prediction=prediction,
            sources=passages,
        )
        sources = [
            SourceRef(
                n=n,
                doc_id=passages[n - 1]["doc_id"],
                title=passages[n - 1]["title"],
                publisher=passages[n - 1]["publisher"],
                url=passages[n - 1]["url"],
                heading=passages[n - 1]["heading"],
                anchor=passages[n - 1]["anchor"],
                excerpt=_excerpt(passages[n - 1]["text"]),
            )
            for n in cited_numbers(answer, len(passages))
        ]
        return ChatResponse(
            question=request.question, answer=answer, model=model, sources=sources)

    except AssistantError as e:
        logger.warning("Assistant error: %s", type(e).__name__)
        raise HTTPException(status_code=e.status_code, detail=e.public_message)

    except Exception:
        logger.exception("Unexpected error in /api/chat")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred in the AI assistant.",
        )
