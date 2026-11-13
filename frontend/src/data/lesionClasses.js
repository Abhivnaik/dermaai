// The seven HAM10000 lesion categories, keyed by the short code the
// backend returns (see ml/inference/model_loader.py CLASS_NAMES).
// Descriptions are brief educational summaries, not diagnostic guidance.

export const LESION_CLASSES = {
  nv: {
    code: 'nv',
    name: 'Melanocytic nevi',
    description:
      'Common moles: benign growths of the pigment-producing cells (melanocytes) of the skin.',
  },
  mel: {
    code: 'mel',
    name: 'Melanoma',
    description:
      'A malignant tumour arising from melanocytes. Any suspicious lesion should be assessed by a dermatologist.',
  },
  bkl: {
    code: 'bkl',
    name: 'Benign keratosis-like lesions',
    description:
      'A group including seborrhoeic keratoses, solar lentigines and lichen-planus-like keratoses.',
  },
  bcc: {
    code: 'bcc',
    name: 'Basal cell carcinoma',
    description:
      'A common type of skin cancer arising from basal cells of the epidermis, usually slow-growing.',
  },
  akiec: {
    code: 'akiec',
    name: 'Actinic keratoses & intraepithelial carcinoma',
    description:
      "Sun-damage-related lesions, including actinic keratoses and Bowen's disease (carcinoma in situ).",
  },
  vasc: {
    code: 'vasc',
    name: 'Vascular lesions',
    description:
      'Lesions of blood vessels, such as cherry angiomas, angiokeratomas and pyogenic granulomas.',
  },
  df: {
    code: 'df',
    name: 'Dermatofibroma',
    description: 'A common benign fibrous nodule of the skin, often found on the legs.',
  },
}

// Same order as the model's output layer
export const CLASS_ORDER = ['nv', 'mel', 'bkl', 'bcc', 'akiec', 'vasc', 'df']
