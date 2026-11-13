




import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routes.chat import router as chat_router
from backend.app.routes.gradcam import router as gradcam_router
from backend.app.routes.library import router as library_router
from backend.app.routes.prediction import router as prediction_router

app = FastAPI(
    title="DermaAI",
    description="AI-Assisted Skin Lesion Analysis Platform",
    version="1.0.0"
)

# CORS: only needed when the frontend is served from a different origin than
# the API (e.g. a deployed site). In development the Vite proxy forwards /api,
# so CORS stays off unless CORS_ORIGINS is set in .env, e.g.
#   CORS_ORIGINS=https://dermaai.example.org,http://localhost:4173
load_dotenv()
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


@app.get("/")
def home():
    return {
        "message": "Welcome to DermaAI!",
        "status": "Backend is running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# Register Gemini chat API
app.include_router(
    chat_router,
    prefix="/api",
    tags=["Gemini AI"]
)


# Register skin lesion prediction API
app.include_router(prediction_router)


# Register Grad-CAM explainability API
app.include_router(gradcam_router)


# Register knowledge-library API (documents behind the assistant's citations)
app.include_router(library_router)
