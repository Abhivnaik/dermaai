"""
Shared model and image-input helpers for the prediction and Grad-CAM routes.

The ResNet50 is loaded once when the backend starts and shared by both
routes, so there is only one copy in memory.
"""

import io

import numpy as np
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from ml.inference.model_loader import load_resnet50

MODEL = load_resnet50()

ACCEPTED_TYPES = ("image/jpeg", "image/png", "image/webp")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
DISCLAIMER = "Experimental research output, not a medical diagnosis."


async def read_upload_as_rgb(file: UploadFile) -> np.ndarray:
    """Validate an uploaded image and return it as an RGB NumPy array."""
    if file.content_type not in ACCEPTED_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WEBP image.")
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image size must be below 10 MB.")
    try:
        return np.array(Image.open(io.BytesIO(contents)).convert("RGB"))
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from None
