"""
Grad-CAM (Selvaraju et al., 2017) for the DermaAI ResNet50.

Grad-CAM shows which spatial regions of the final convolutional features most
increased the score (logit) of a chosen class:

    weights_k = mean over (i, j) of  d score_c / d A_k(i, j)
    cam       = ReLU( sum_k weights_k * A_k )

A is the target layer's output. For ResNet50 at 224 x 224 it is a 7 x 7 grid,
so the heatmap is coarse: each cell covers about 32 x 32 input pixels.

The model, its weights and the preprocessing are not modified. The forward
hook is attached only for the duration of one Grad-CAM call and ignores
forward passes made under torch.inference_mode (normal predictions).
"""

import threading

import cv2
import numpy as np
import torch
import torch.nn.functional as F

# Target layers. "block" (the whole last bottleneck, including the residual
# connection and ReLU) is the layer used in the training notebook
# (extra/skin-training-resnet50 (2).ipynb) and the common default in Grad-CAM
# libraries. "conv3" (the bottleneck's last convolution) is kept for comparison.
TARGET_LAYERS = {
    "block": ("layer4[-1]", lambda m: m.layer4[-1]),
    "conv3": ("layer4[-1].conv3", lambda m: m.layer4[-1].conv3),
}
DEFAULT_LAYER = "block"

# One Grad-CAM at a time: the hook is registered on the shared model
_lock = threading.Lock()


def compute_gradcam(model, tensor, target_index=None, layer=DEFAULT_LAYER):
    """
    Args:
        model:        the loaded ResNet50 (eval mode).
        tensor:       preprocessed input, shape [1, 3, 224, 224].
        target_index: class index to explain; None = the predicted class.
        layer:        key of TARGET_LAYERS.

    Returns:
        dict with
          cam:           float32 array (7, 7), values in [0, 1]
          probabilities: float array (7,) softmax output
          predicted:     index of the top class
          target:        index of the explained class
          layer:         readable layer name
    """
    layer_name, get_module = TARGET_LAYERS[layer]
    module = get_module(model)
    captured = {}

    def hook(_module, _inputs, output):
        # Normal predictions run under inference_mode; leave them alone
        if not torch.is_inference_mode_enabled():
            captured["activations"] = output

    with _lock:
        handle = module.register_forward_hook(hook)
        try:
            with torch.enable_grad():
                logits = model(tensor)
                probabilities = F.softmax(logits, dim=1)[0].detach()
                predicted = int(torch.argmax(probabilities))
                target = predicted if target_index is None else int(target_index)

                activations = captured["activations"]
                # autograd.grad does not write .grad on the model parameters
                (gradients,) = torch.autograd.grad(logits[0, target], activations)
        finally:
            handle.remove()

    weights = gradients.mean(dim=(2, 3), keepdim=True)            # [1, K, 1, 1]
    cam = F.relu((weights * activations).sum(dim=1))[0].detach()  # [7, 7]
    peak = float(cam.max())
    cam = (cam / peak) if peak > 0 else torch.zeros_like(cam)

    return {
        "cam": cam.numpy().astype(np.float32),
        "probabilities": probabilities.numpy(),
        "predicted": predicted,
        "target": target,
        "layer": layer_name,
    }


def upsample(cam, width, height):
    """Resize the 7x7 map to the image size (bilinear), clipped to [0, 1]."""
    return np.clip(cv2.resize(cam, (width, height), interpolation=cv2.INTER_LINEAR), 0, 1)


def colorize(cam_full):
    """
    RGBA heatmap: perceptually uniform 'inferno' colour map, with opacity
    proportional to the Grad-CAM value so low-influence areas stay clear.
    """
    values = (cam_full * 255).astype(np.uint8)
    rgb = cv2.cvtColor(cv2.applyColorMap(values, cv2.COLORMAP_INFERNO), cv2.COLOR_BGR2RGB)
    alpha = values[..., None]
    return np.concatenate([rgb, alpha], axis=2)


def overlay(image_rgb, heatmap_rgba, opacity=0.6):
    """Blend the RGBA heatmap onto an RGB image of the same size."""
    alpha = heatmap_rgba[..., 3:4].astype(np.float32) / 255 * opacity
    blended = image_rgb.astype(np.float32) * (1 - alpha) + heatmap_rgba[..., :3].astype(np.float32) * alpha
    return np.clip(blended, 0, 255).astype(np.uint8)
