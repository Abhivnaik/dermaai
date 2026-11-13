




import cv2
import numpy as np
import albumentations as A

from albumentations.pytorch import ToTensorV2


# Same configuration as the training notebook
IMG_SIZE = 224

MEAN = [0.756, 0.555, 0.582]
STD = [0.103, 0.079, 0.090]


def remove_hair(image):
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (17, 17)
    )

    blackhat = cv2.morphologyEx(
        gray, cv2.MORPH_BLACKHAT, kernel
    )

    _, mask = cv2.threshold(
        blackhat, 10, 255, cv2.THRESH_BINARY
    )

    result = cv2.inpaint(
        image, mask, 1, cv2.INPAINT_TELEA
    )

    return result


def apply_clahe(image):
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)

    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    l_channel = clahe.apply(l_channel)

    merged = cv2.merge(
        (l_channel, a_channel, b_channel)
    )

    return cv2.cvtColor(
        merged, cv2.COLOR_LAB2RGB
    )


def segment_lesion(image):
    gray = cv2.cvtColor(
        image, cv2.COLOR_RGB2GRAY
    )

    blurred = cv2.GaussianBlur(
        gray, (5, 5), 0
    )

    _, mask = cv2.threshold(
        blurred,
        0,
        255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    kernel = np.ones((5, 5), np.uint8)

    mask = cv2.morphologyEx(
        mask, cv2.MORPH_CLOSE, kernel
    )

    mask = cv2.morphologyEx(
        mask, cv2.MORPH_OPEN, kernel
    )

    return cv2.bitwise_and(
        image, image, mask=mask
    )


def edge_enhancement(image):
    blurred = cv2.GaussianBlur(
        image, (0, 0), 3
    )

    enhanced = cv2.addWeighted(
        image, 1.5, blurred, -0.5, 0
    )

    return enhanced


def advanced_preprocess(image):
    image = cv2.resize(
        image, (IMG_SIZE, IMG_SIZE)
    )

    image = remove_hair(image)
    image = apply_clahe(image)

    image = cv2.GaussianBlur(
        image, (3, 3), 0
    )

    image = cv2.medianBlur(image, 3)

    image = cv2.bilateralFilter(
        image, 9, 75, 75
    )

    image = segment_lesion(image)
    image = edge_enhancement(image)

    return np.clip(
        image, 0, 255
    ).astype(np.uint8)


# Validation/test transformation from training notebook
val_transform = A.Compose([
    A.Resize(IMG_SIZE, IMG_SIZE),
    A.Normalize(mean=MEAN, std=STD),
    ToTensorV2()
])


def preprocess_for_model(image):
    """
    Input: RGB image as a NumPy array.
    Output: Normalized PyTorch tensor.
    """

    image = advanced_preprocess(image)

    transformed = val_transform(image=image)

    return transformed["image"].unsqueeze(0)
