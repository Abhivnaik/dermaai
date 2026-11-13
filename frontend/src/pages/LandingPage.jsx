import { Link } from 'react-router'
import Icon from '../components/ui/Icon'
import StatusBadge from '../components/ui/StatusBadge'
import { CLASS_ORDER, LESION_CLASSES } from '../data/lesionClasses'

const STEPS = [
  {
    icon: 'upload',
    title: 'Upload an image',
    text: 'Provide a dermoscopic image in JPG, PNG or WEBP format (up to 10 MB).',
  },
  {
    icon: 'filter',
    title: 'Preprocessing',
    text: 'The image goes through the same pipeline used in training: hair removal, contrast enhancement, filtering and lesion segmentation.',
  },
  {
    icon: 'cpu',
    title: 'ResNet50 inference',
    text: 'A fine-tuned ResNet50 network outputs a probability for each of the seven HAM10000 categories.',
  },
]

const FEATURES = [
  {
    icon: 'chart',
    title: 'Seven-class prediction',
    text: 'See the most likely category, the model confidence and the full probability distribution.',
    available: true,
  },
  {
    icon: 'eye',
    title: 'Grad-CAM explainability',
    text: 'Heatmaps showing which image regions most influenced the model output, for any of the seven categories.',
    available: true,
  },
  {
    icon: 'chat',
    title: 'AI assistant',
    text: 'Ask educational questions about skin lesion categories and your result, powered by Google Gemini.',
    available: true,
  },
  {
    icon: 'book',
    title: 'Knowledge library',
    text: 'Reference material from the US National Cancer Institute and the HAM10000 paper, searched by the assistant to cite its sources.',
    available: true,
  },
]

// Decorative diagram of the analysis pipeline (no real data shown)
function PipelineCard() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-navy-100" aria-hidden="true">
      <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Analysis pipeline</p>
      <div className="mt-5 space-y-3">
        {['Dermoscopic image', 'Preprocessing', 'ResNet50 (ImageNet V2 → HAM10000)', '7-class probabilities'].map(
          (label, i, arr) => (
            <div key={label}>
              <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
                i === arr.length - 1 ? 'bg-teal-600 text-white' : 'bg-navy-50 text-navy-800'
              }`}>
                {label}
              </div>
              {i < arr.length - 1 && (
                <div className="flex justify-center py-1 text-navy-300">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14m-5-5l5 5 5-5" />
                  </svg>
                </div>
              )}
            </div>
          ),
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {CLASS_ORDER.map((code) => (
          <span key={code} className="rounded-md bg-teal-50 px-2 py-1 font-mono text-xs font-semibold uppercase text-teal-700">
            {code}
          </span>
        ))}
      </div>
    </div>
  )
}

function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-navy-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy-600 ring-1 ring-navy-100">
              <Icon name="shield" className="h-4 w-4 text-teal-600" />
              Research &amp; education project
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
              Explore dermoscopic images with{' '}
              <span className="text-teal-600">explainable deep learning</span>
            </h1>
            <p className="mt-5 text-lg text-navy-600">
              DermaAI classifies dermoscopic skin lesion images into seven
              HAM10000 categories using a fine-tuned ResNet50 model, and shows
              the full probability distribution behind each prediction.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                Analyze an image
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="rounded-lg border border-navy-200 bg-white px-5 py-3 font-semibold text-navy-800 transition hover:bg-navy-50"
              >
                How it works
              </Link>
            </div>
            <p className="mt-6 text-sm text-navy-500">
              Not a diagnostic tool. Outputs are experimental model predictions.
            </p>
          </div>
          <PipelineCard />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">How it works</h2>
        <p className="mt-2 text-navy-600">Three stages, from image to prediction.</p>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-navy-100 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon name={step.icon} />
                </span>
                <span className="text-sm font-semibold text-navy-400">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-navy-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Lesion categories */}
      <section className="bg-navy-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">Seven lesion categories</h2>
          <p className="mt-2 max-w-2xl text-navy-600">
            The model was trained on the HAM10000 dataset, which groups
            dermoscopic images into these diagnostic categories.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CLASS_ORDER.map((code) => {
              const c = LESION_CLASSES[code]
              return (
                <div key={code} className="rounded-xl bg-white p-5 ring-1 ring-navy-100">
                  <span className="rounded-md bg-navy-900 px-2 py-0.5 font-mono text-xs font-semibold uppercase text-white">
                    {c.code}
                  </span>
                  <h3 className="mt-3 font-semibold text-navy-900">{c.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-600">{c.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">Platform features</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4 rounded-xl border border-navy-100 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-teal-300">
                <Icon name={f.icon} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-navy-900">{f.title}</h3>
                  <StatusBadge available={f.available} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl bg-navy-900 px-6 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white">Try the classifier</h2>
          <p className="mx-auto mt-2 max-w-xl text-navy-200">
            Upload a dermoscopic image to see the model&apos;s prediction and
            probability distribution. Results are for research and education only.
          </p>
          <Link
            to="/analyze"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-3 font-semibold text-navy-950 transition hover:bg-teal-400"
          >
            Start analysis
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}

export default LandingPage
