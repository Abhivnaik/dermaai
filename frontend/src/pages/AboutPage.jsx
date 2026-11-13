import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import StatusBadge from '../components/ui/StatusBadge'
import { CLASS_ORDER, LESION_CLASSES } from '../data/lesionClasses'

// Classifier head — matches ml/inference/model_loader.py exactly
const CLASSIFIER_LAYERS = [
  'Dropout (p = 0.5)',
  'Linear (2048 → 512)',
  'ReLU',
  'BatchNorm1d (512)',
  'Dropout (p = 0.3)',
  'Linear (512 → 256)',
  'ReLU',
  'Dropout (p = 0.2)',
  'Linear (256 → 7)',
]

// Preprocessing — matches ml/preprocessing/skin_preprocess.py
const PREPROCESSING = [
  ['Resize', 'Image resized to 224 × 224 pixels.'],
  ['Hair removal', 'Morphological black-hat filter detects hair, which is removed by inpainting.'],
  ['CLAHE', 'Contrast-limited adaptive histogram equalisation on the lightness channel.'],
  ['Gaussian blur', 'Light smoothing to reduce noise.'],
  ['Median filter', 'Removes remaining speckle noise.'],
  ['Bilateral filter', 'Smooths while preserving lesion edges.'],
  ['Lesion segmentation', 'Otsu thresholding isolates the lesion from surrounding skin.'],
  ['Edge enhancement', 'Unsharp masking sharpens lesion borders.'],
  ['Normalisation', 'Per-channel mean [0.756, 0.555, 0.582] and std [0.103, 0.079, 0.090].'],
  ['Tensor conversion', 'Converted to a PyTorch tensor of shape [1, 3, 224, 224].'],
]

const STACK = [
  { group: 'Machine learning', items: ['PyTorch', 'Torchvision', 'OpenCV', 'Albumentations', 'NumPy', 'Pillow'] },
  { group: 'Backend', items: ['Python', 'FastAPI', 'Uvicorn', 'Google Gemini API'] },
  { group: 'Frontend', items: ['React', 'Vite', 'Tailwind CSS', 'React Router', 'react-markdown'] },
  { group: 'Retrieval (RAG)', items: ['Gemini embeddings (gemini-embedding-001)', 'NumPy similarity search'] },
  { group: 'Explainability', items: ['Grad-CAM (PyTorch, layer4[-1])'] },
]

const STATUS = [
  ['ResNet50 inference pipeline', true],
  ['Prediction REST API', true],
  ['Web interface', true],
  ['Grad-CAM explainability', true],
  ['Gemini AI assistant', true],
  ['RAG knowledge library', true],
  ['Formal evaluation on held-out test data', false],
]

function Section({ icon, title, children }) {
  return (
    <section className="border-b border-navy-100 py-12 last:border-0">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          <Icon name={icon} />
        </span>
        <h2 className="text-2xl font-bold text-navy-900">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="About DermaAI"
        description="An educational research project exploring deep learning and explainable AI for dermoscopic skin lesion classification."
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Section icon="shield" title="Purpose">
          <p className="leading-relaxed text-navy-700">
            DermaAI demonstrates how a convolutional neural network can be
            applied to dermoscopic images and how its outputs can be presented
            transparently. It is intended for learning and research.
          </p>
          <div className="mt-5 flex gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
            <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <p className="text-sm leading-relaxed text-teal-900">
              DermaAI is <strong>not</strong> a clinically validated medical
              device. Its outputs are experimental model predictions, not
              diagnoses, and must not be used to make medical decisions.
            </p>
          </div>
        </Section>

        <Section icon="database" title="Dataset">
          <p className="leading-relaxed text-navy-700">
            The model was trained on <strong>HAM10000</strong> (&ldquo;Human
            Against Machine with 10000 training images&rdquo;), a public
            collection of 10,015 dermatoscopic images of common pigmented skin
            lesions. Images are labelled with one of seven diagnostic categories:
          </p>
          <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-navy-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-50 text-navy-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {CLASS_ORDER.map((code) => (
                  <tr key={code}>
                    <td className="px-4 py-3 font-mono font-semibold uppercase text-teal-700">{code}</td>
                    <td className="px-4 py-3 text-navy-800">{LESION_CLASSES[code].name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-navy-500">
            Reference: Tschandl P., Rosendahl C. &amp; Kittler H. The HAM10000
            dataset, a large collection of multi-source dermatoscopic images of
            common pigmented skin lesions. <em>Scientific Data</em> 5, 180161 (2018).
          </p>
        </Section>

        <Section icon="layers" title="Model architecture">
          <p className="leading-relaxed text-navy-700">
            The classifier is a <strong>ResNet50</strong> convolutional network
            initialised with ImageNet (V2) pretrained weights and fine-tuned on
            HAM10000. The original final layer was replaced with a custom
            classification head:
          </p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <ol className="space-y-1.5">
              {CLASSIFIER_LAYERS.map((layer, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg bg-navy-50 px-3 py-2 font-mono text-sm text-navy-800">
                  <span className="w-5 text-right text-xs text-navy-400">{i + 1}</span>
                  {layer}
                </li>
              ))}
            </ol>
            <dl className="space-y-3 text-sm">
              {[
                ['Backbone', 'ResNet50 (2048-dim features)'],
                ['Input', '224 × 224 RGB image'],
                ['Output', '7 class probabilities (softmax)'],
                ['Inference device', 'CPU'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-navy-100 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-navy-400">{k}</dt>
                  <dd className="mt-1 font-medium text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <Section icon="filter" title="Preprocessing pipeline">
          <p className="leading-relaxed text-navy-700">
            Every uploaded image passes through the same preprocessing used
            during training, so the model sees inputs consistent with what it
            learned from.
          </p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {PREPROCESSING.map(([title, text], i) => (
              <li key={title} className="flex gap-3 rounded-lg border border-navy-100 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-navy-900">{title}</p>
                  <p className="mt-0.5 text-sm text-navy-600">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section icon="cpu" title="Technology stack">
          <div className="grid gap-4 sm:grid-cols-2">
            {STACK.map((s) => (
              <div key={s.group} className="rounded-xl border border-navy-100 p-5">
                <p className="text-sm font-semibold text-navy-900">{s.group}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.items.map((item) => (
                    <span key={item} className="rounded-md bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="alert" title="Limitations">
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-navy-700">
            <li>The model has not been clinically validated and has no regulatory approval.</li>
            <li>It was trained only on dermoscopic images; ordinary phone photos are outside its training distribution and may give unreliable results.</li>
            <li>It can only choose among seven categories, even when an image shows something else entirely.</li>
            <li>HAM10000 is imbalanced (most images are melanocytic nevi), which can bias predictions.</li>
            <li>A high confidence score reflects the model&apos;s internal certainty, not the probability that the prediction is medically correct.</li>
            <li>Formal performance metrics on held-out test data have not yet been published for this project.</li>
          </ul>
        </Section>

        <Section icon="chart" title="Project status">
          <ul className="divide-y divide-navy-100 rounded-xl ring-1 ring-navy-100">
            {STATUS.map(([label, done]) => (
              <li key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-navy-800">{label}</span>
                <StatusBadge available={done} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}

export default AboutPage
