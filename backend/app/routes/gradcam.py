"""
POST /api/gradcam: Grad-CAM explanation for an uploaded image.

Uses exactly the same preprocessing and model as /api/predict. Images are
processed in memory and returned as PNG data URLs; nothing is stored.
"""

import base64
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from backend.app.services.model_service import DISCLAIMER, MODEL, read_upload_as_rgb
from ml.explainability.gradcam import DEFAULT_LAYER, colorize, compute_gradcam, overlay, upsample
from ml.inference.model_loader import CLASS_NAMES
from ml.preprocessing.skin_preprocess import advanced_preprocess, val_transform

router = APIRouter(prefix="/api", tags=["Explainability"])

# Returned images are scaled so the longest side is at most this many pixels
MAX_DISPLAY_SIDE = 512


def _png_data_url(image):
    """RGB or RGBA uint8 array -> PNG data URL."""
    if image.shape[2] == 4:
        bgr = cv2.cvtColor(image, cv2.COLOR_RGBA2BGRA)
    else:
        bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    ok, buffer = cv2.imencode(".png", bgr)
    if not ok:
        raise RuntimeError("PNG encoding failed")
    return "data:image/png;base64," + base64.b64encode(buffer.tobytes()).decode("ascii")


def _display_size(width, height):
    scale = min(1.0, MAX_DISPLAY_SIDE / max(width, height))
    return max(1, round(width * scale)), max(1, round(height * scale))


def _explain(image, target_index):
    # Same steps as preprocess_for_model(), kept separate so the 224x224
    # model input can also be returned for display.
    model_input = advanced_preprocess(image)
    tensor = val_transform(image=model_input)["image"].unsqueeze(0)
    result = compute_gradcam(MODEL, tensor, target_index, layer=DEFAULT_LAYER)

    height, width = image.shape[:2]
    disp_w, disp_h = _display_size(width, height)
    display = cv2.resize(image, (disp_w, disp_h), interpolation=cv2.INTER_AREA)

    # The model input is a uniform resize of the original, so the heatmap maps
    # back onto the original by resizing to its aspect ratio.
    heatmap = colorize(upsample(result["cam"], disp_w, disp_h))
    heatmap_model = colorize(upsample(result["cam"], 224, 224))

    probs = result["probabilities"]
    return {
        "predicted_class": CLASS_NAMES[result["predicted"]],
        "confidence": round(float(probs[result["predicted"]]) * 100, 2),
        "all_probabilities": {c: round(float(p) * 100, 2) for c, p in zip(CLASS_NAMES, probs)},
        "target_class": CLASS_NAMES[result["target"]],
        "target_probability": round(float(probs[result["target"]]) * 100, 2),
        "layer": result["layer"],
        "empty_heatmap": bool(result["cam"].max() == 0),
        "width": disp_w,
        "height": disp_h,
        "images": {
            "heatmap": _png_data_url(heatmap),                       # RGBA, display size
            "overlay": _png_data_url(overlay(display, heatmap)),     # RGB, display size
            "model_input": _png_data_url(model_input),               # RGB, 224 x 224
            "model_input_heatmap": _png_data_url(heatmap_model),     # RGBA, 224 x 224
        },
        "disclaimer": DISCLAIMER,
    }


@router.post("/gradcam")
async def gradcam(
    file: UploadFile = File(...),
    target_class: Optional[str] = Form(None),
):
    if target_class is not None and target_class not in CLASS_NAMES:
        raise HTTPException(
            status_code=422,
            detail=f"target_class must be one of: {', '.join(CLASS_NAMES)}.",
        )
    image = await read_upload_as_rgb(file)
    target_index = CLASS_NAMES.index(target_class) if target_class else None
    # CPU-heavy work runs in a worker thread so other requests are not blocked
    return await run_in_threadpool(_explain, image, target_index)
