




import torch
import torch.nn.functional as F
from PIL import Image
import numpy as np

from ml.inference.model_loader import load_resnet50, CLASS_NAMES
from ml.preprocessing.skin_preprocess import preprocess_for_model


DEVICE = torch.device("cpu")

# Load the trained model once
model = load_resnet50()


def predict_image(image_path):

    # Read image and convert to RGB
    image = Image.open(image_path).convert("RGB")
    image = np.array(image)

    # Preprocess image
    tensor = preprocess_for_model(image)
    tensor = tensor.to(DEVICE)

    # Predict
    with torch.inference_mode():
        outputs = model(tensor)
        probabilities = F.softmax(outputs, dim=1)[0]

    predicted_index = torch.argmax(probabilities).item()

    predicted_class = CLASS_NAMES[predicted_index]
    confidence = probabilities[predicted_index].item() * 100

    results = {
        "predicted_class": predicted_class,
        "confidence": round(confidence, 2),
        "all_probabilities": {
            CLASS_NAMES[i]: round(
                probabilities[i].item() * 100, 2
            )
            for i in range(len(CLASS_NAMES))
        }
    }

    return results


if __name__ == "__main__":
    print("DermaAI prediction module ready!")
    print("Model loaded and waiting for an image.")
