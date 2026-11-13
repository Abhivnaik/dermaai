import { useEffect } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import ProbabilityBars from '../components/results/ProbabilityBars'
import HeatmapOverlay from '../components/gradcam/HeatmapOverlay'
import HeatmapLegend from '../components/gradcam/HeatmapLegend'
import { usePrediction } from '../context/usePrediction'
import { LESION_CLASSES } from '../data/lesionClasses'

// Below this, no single class holds a majority of the probability
const LOW_CONFIDENCE_THRESHOLD = 50

function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white p-6 ring-1 ring-navy-100 ${className}`}>
      {title && <h2 className="font-semibold text-navy-900">{title}</h2>}
      {children}
    </section>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-dashed border-navy-200 p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-500">
          <Icon name="chart" className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-navy-900">No analysis yet</h2>
        <p className="mx-auto mt-2 max-w-md text-navy-600">
          Upload a dermoscopic image on the Analyze page to see the prediction and
          probability distribution here. Results are kept only until you refresh the page.
        </p>
        <Link
          to="/analyze"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white transition hover:bg-teal-700"
        >
          Go to Analyze
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// Grad-CAM preview for the top category, generated automatically
function GradCamCard({ analysis, entry, onRetry }) {
  const data = entry?.status === 'success' ? entry.data : null
  const code = analysis.result.predicted_class
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-navy-900">Grad-CAM heatmap</h2>
        <span className="font-mono text-xs font-semibold uppercase text-navy-400">{code}</span>
      </div>
      <p className="mt-1 text-sm text-navy-500">Regions that most increased the score for the top category.</p>
      <div className="mt-4">
        {entry?.status === 'error' ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {entry.error}{' '}
            <button type="button" onClick={onRetry} className="font-semibold text-red-800 underline">
              Try again
            </button>
          </div>
        ) : data ? (
          <HeatmapOverlay
            baseSrc={analysis.imageUrl}
            heatmapSrc={data.images.heatmap}
            width={data.width}
            height={data.height}
            alt={`Grad-CAM heatmap for ${LESION_CLASSES[code].name}`}
          />
        ) : (
          <div
            className="flex w-full items-center justify-center rounded-xl bg-navy-100 text-sm text-navy-500"
            style={{ aspectRatio: `${analysis.width} / ${analysis.height}` }}
            role="status"
          >
            Generating heatmap…
          </div>
        )}
      </div>
      <HeatmapLegend className="mt-3" />
      <Link
        to="/grad-cam"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        Open full Grad-CAM view
        <Icon name="arrowRight" className="h-4 w-4" />
      </Link>
    </Card>
  )
}

function ResultsPage() {
  const { analysis, gradcams, requestGradCam } = usePrediction()
  const topClass = analysis?.result.predicted_class

  useEffect(() => {
    if (topClass) requestGradCam(topClass)
  }, [topClass, requestGradCam])

  const header = (
    <PageHeader
      eyebrow="Prediction results"
      title="Results dashboard"
      description="The model's most likely category, its confidence and the probability distribution across all seven classes."
    />
  )

  if (!analysis) {
    return (
      <>
        {header}
        <EmptyState />
      </>
    )
  }

  const { result, imageUrl, fileName, width, height, analyzedAt } = analysis
  const predicted = LESION_CLASSES[result.predicted_class]
  const lowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD

  // Runner-up for context
  const runnerUp = Object.entries(result.all_probabilities)
    .filter(([code]) => code !== result.predicted_class)
    .sort((a, b) => b[1] - a[1])[0]

  return (
    <>
      {header}

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        {/* Disclaimer — first thing on the page */}
        <div role="note" className="flex gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
          <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <p className="text-sm leading-relaxed text-teal-900">
            <strong className="font-semibold">
              {result.disclaimer ?? 'Experimental research output, not a medical diagnosis.'}
            </strong>{' '}
            This result comes from a research model and must not be used to make
            medical decisions. Consult a dermatologist about any skin concern.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Image */}
          <Card className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl bg-navy-950">
              <img src={imageUrl} alt="Analyzed skin lesion" className="max-h-80 w-full object-contain" />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2 min-w-0">
                <dt className="text-xs text-navy-400">File</dt>
                <dd className="truncate font-medium text-navy-800" title={fileName}>{fileName}</dd>
              </div>
              <div>
                <dt className="text-xs text-navy-400">Dimensions</dt>
                <dd className="font-medium text-navy-800">{width} × {height} px</dd>
              </div>
              <div>
                <dt className="text-xs text-navy-400">Analyzed</dt>
                <dd className="font-medium text-navy-800">{analyzedAt.toLocaleTimeString()}</dd>
              </div>
            </dl>
          </Card>

          {/* Headline prediction */}
          <Card className="lg:col-span-3">
            <p className="text-sm font-medium text-navy-500">Most likely category (model output)</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{predicted.name}</h2>
              <span className="rounded-md bg-navy-900 px-2 py-0.5 font-mono text-xs font-semibold uppercase text-white">
                {predicted.code}
              </span>
            </div>
            <p className="mt-3 leading-relaxed text-navy-600">{predicted.description}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-navy-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Model confidence</p>
                <p className="mt-1 text-4xl font-bold tabular-nums text-navy-900">
                  {result.confidence.toFixed(2)}
                  <span className="text-2xl text-navy-500">%</span>
                </p>
              </div>
              {runnerUp && (
                <div className="rounded-xl bg-navy-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Second most likely</p>
                  <p className="mt-1 font-semibold text-navy-900">{LESION_CLASSES[runnerUp[0]].name}</p>
                  <p className="text-sm tabular-nums text-navy-600">{runnerUp[1].toFixed(2)}%</p>
                </div>
              )}
            </div>

            {lowConfidence && (
              <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <p className="text-sm text-amber-900">
                  <strong className="font-semibold">Low confidence.</strong> No category
                  reached {LOW_CONFIDENCE_THRESHOLD}%, so the model&apos;s output is spread
                  across several classes. Treat this result with extra caution.
                </p>
              </div>
            )}

            <p className="mt-4 text-xs leading-relaxed text-navy-500">
              Confidence is the model&apos;s softmax probability. It reflects the
              model&apos;s internal certainty, not the likelihood that the result is
              medically correct.
            </p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Probability distribution */}
          <Card title="Probability distribution" className="lg:col-span-3">
            <p className="mt-1 text-sm text-navy-500">All seven categories, highest first.</p>
            <div className="mt-6">
              <ProbabilityBars probabilities={result.all_probabilities} predictedClass={result.predicted_class} />
            </div>
          </Card>

          {/* Grad-CAM + next steps */}
          <div className="space-y-6 lg:col-span-2">
            <GradCamCard
              analysis={analysis}
              entry={gradcams[topClass]}
              onRetry={() => requestGradCam(topClass)}
            />

            <Card title="Next steps">
              <ul className="mt-4 divide-y divide-navy-100">
                <li>
                  <Link
                    to="/grad-cam"
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-teal-50"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-navy-900">
                      <Icon name="eye" className="h-4 w-4 text-teal-600" /> Compare Grad-CAM heatmaps across categories
                    </span>
                    <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-teal-600" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/assistant"
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-teal-50"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-navy-900">
                      <Icon name="chat" className="h-4 w-4 text-teal-600" /> Ask the AI assistant about this result
                    </span>
                    <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-teal-600" />
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/library?class=${predicted.code}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-teal-50"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-navy-900">
                      <Icon name="book" className="h-4 w-4 text-teal-600" /> Read about {predicted.name.toLowerCase()} in the library
                    </span>
                    <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-teal-600" />
                  </Link>
                </li>
              </ul>
              <Link
                to="/analyze"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white transition hover:bg-teal-700"
              >
                <Icon name="upload" className="h-4 w-4" />
                Analyze another image
              </Link>
            </Card>

            <Card title="About this model">
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                ResNet50 fine-tuned on HAM10000 dermoscopic images. It can only
                choose among seven categories and has not been clinically validated.
              </p>
              <Link to="/about" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
                Model details & limitations
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

export default ResultsPage
