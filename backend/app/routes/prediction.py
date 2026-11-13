from fastapi import APIRouter, File, UploadFile
from starlette.concurrency import run_in_threadpool

import torch
import torch.nn.functional as F

from ml.inference.model_loader import CLASS_NAMES
from ml.preprocessing.skin_preprocess import preprocess_for_model

# The model is loaded once at startup (backend/app/services/model_service.py)
# and shared with the Grad-CAM route. It is in eval mode and used under
# inference_mode here, so sharing it between requests is safe.
from backend.app.services.model_service import DISCLAIMER, MODEL, read_upload_as_rgb

router = APIRouter(prefix="/api", tags=["Prediction"])


def _predict(image_array):
    tensor = preprocess_for_model(image_array)

    with torch.inference_mode():
        outputs = MODEL(tensor)
        probabilities = F.softmax(outputs, dim=1)[0]

    predicted_index = torch.argmax(probabilities).item()

    return {
        "predicted_class": CLASS_NAMES[predicted_index],
        "confidence": round(probabilities[predicted_index].item() * 100, 2),
        "all_probabilities": {
            CLASS_NAMES[i]: round(probabilities[i].item() * 100, 2)
            for i in range(len(CLASS_NAMES))
        },
        "disclaimer": DISCLAIMER,
    }


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Validates type (JPG/PNG/WEBP), size (10 MB) and that the file is an image
    image_array = await read_upload_as_rgb(file)

    # Preprocessing and inference are CPU-heavy; run them in a worker thread
    # so other requests (chat, library, Grad-CAM) are not blocked meanwhile.
    return await run_in_threadpool(_predict, image_array)
