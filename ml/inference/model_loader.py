




import torch
import torch.nn as nn
from torchvision import models
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BASE_DIR / "ml" / "models" / "best_resnet50.pth"

CLASS_NAMES = ["nv", "mel", "bkl", "bcc", "akiec", "vasc", "df"]

DEVICE = torch.device("cpu")


def build_resnet50(num_classes=7):
    model = models.resnet50(weights=None)

    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(2048, 512),
        nn.ReLU(inplace=True),
        nn.BatchNorm1d(512),
        nn.Dropout(p=0.3),
        nn.Linear(512, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.2),
        nn.Linear(256, num_classes)
    )

    return model


def load_resnet50():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found: {MODEL_PATH}"
        )

    model = build_resnet50(num_classes=7)

    state_dict = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=True
    )

    model.load_state_dict(state_dict, strict=True)
    model.to(DEVICE)
    model.eval()

    return model


if __name__ == "__main__":
    model = load_resnet50()

    print("ResNet50 loaded successfully!")
    print("Device:", DEVICE)
    print("Classes:", CLASS_NAMES)
