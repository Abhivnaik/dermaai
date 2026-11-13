import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import HeatmapOverlay from '../components/gradcam/HeatmapOverlay'
import HeatmapLegend from '../components/gradcam/HeatmapLegend'
import { usePrediction } from '../context/usePrediction'
import { LESION_CLASSES } from '../data/lesionClasses'

const header = (
  <PageHeader
    eyebrow="Explainability"
    title="Grad-CAM visualization"
    description="Grad-CAM highlights the image regions that most increased the model's score for a chosen category."
  />
)

function EmptyState() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-dashed border-navy-200 p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-500">
          <Icon name="eye" className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-navy-900">No image analysed yet</h2>
        <p className="mx-auto mt-2 max-w-md text-navy-600">
          Analyse a dermoscopic image first; its Grad-CAM heatmap will appear here.
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

function Panel({ title, subtitle, children }) {
  return (
    <figure className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-navy-100">
      {children}
      <figcaption className="mt-3">
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{subtitle}</p>}
      </figcaption>
    </figure>
  )
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-navy-50 p-1">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === key ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-600 hover:text-navy-900'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function GradCamPage() {
  const { analysis, gradcams, requestGradCam } = usePrediction()
  const [searchParams, setSearchParams] = useSearchParams()
  const [base, setBase] = useState('original') // 'original' | 'model'
  const [opacity, setOpacity] = useState(70)

  const result = analysis?.result
  const requested = searchParams.get('class')
  const target = result ? (requested in LESION_CLASSES ? requested : result.predicted_class) : null
  const entry = target ? gradcams[target] : null

  useEffect(() => {
    if (target) requestGradCam(target)
  }, [target, requestGradCam])

  if (!analysis) {
    return (
      <>
        {header}
        <EmptyState />
      </>
    )
  }

  const ranked = Object.entries(result.all_probabilities).sort((a, b) => b[1] - a[1])
  const setTarget = (code) =>
    setSearchParams(code === result.predicted_class ? {} : { class: code }, { replace: true })

  const data = entry?.status === 'success' ? entry.data : null
  const targetInfo = LESION_CLASSES[target]
  const useModelInput = base === 'model'

  return (
    <>
      {header}

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <div role="note" className="flex gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
          <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <p className="text-sm leading-relaxed text-teal-900">
            <strong className="font-semibold">A view into the model, not a medical finding.</strong>{' '}
            Grad-CAM shows where the model&apos;s evidence came from, not whether the
            prediction is correct. Consult a dermatologist about any skin concern.
          </p>
        </div>

        {/* Class selector */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-navy-100">
          <h2 className="text-sm font-semibold text-navy-900">Category to explain</h2>
          <p className="mt-0.5 text-sm text-navy-500">
            By default, the model&apos;s top category. Pick another to see what supported it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ranked.map(([code, p]) => {
              const active = code === target
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setTarget(code)}
                  aria-pressed={active}
                  title={LESION_CLASSES[code].name}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    active ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50'
                  }`}
                >
                  <span className="font-mono font-semibold uppercase">{code}</span>{' '}
                  <span className={`tabular-nums ${active ? 'text-navy-200' : 'text-navy-500'}`}>{p.toFixed(2)}%</span>
                  {code === result.predicted_class && <span className="sr-only"> (top prediction)</span>}
                </button>
              )
            })}
          </div>
        </section>

        {/* Panels */}
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">
                Explaining: {targetInfo.name}{' '}
                <span className="font-mono text-sm font-semibold uppercase text-navy-400">{target}</span>
              </h2>
              <p className="text-sm text-navy-500">
                Model probability {result.all_probabilities[target].toFixed(2)}%
                {target === result.predicted_class ? ' · top prediction' : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <SegmentedControl
                label="Show heatmap on"
                options={[['original', 'Original'], ['model', 'Model input']]}
                value={base}
                onChange={setBase}
              />
              <label className="flex items-center gap-2 text-sm text-navy-700">
                Opacity
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-28 accent-teal-600"
                  aria-valuetext={`${opacity}%`}
                />
                <span className="w-9 text-right tabular-nums text-navy-500">{opacity}%</span>
              </label>
            </div>
          </div>

          {entry?.status === 'error' ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-semibold text-red-800">Could not generate the heatmap</p>
              <p className="mt-1 text-sm text-red-700">{entry.error}</p>
              <button
                type="button"
                onClick={() => requestGradCam(target)}
                className="mt-3 text-sm font-semibold text-red-800 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <Panel title="Original image" subtitle={analysis.fileName}>
                <HeatmapOverlay
                  baseSrc={analysis.imageUrl}
                  width={analysis.width}
                  height={analysis.height}
                  alt="Uploaded skin lesion image"
                />
              </Panel>

              <Panel
                title="Model input"
                subtitle="What the network actually receives: 224 × 224 px after hair removal, contrast enhancement and lesion segmentation (black areas are masked out)."
              >
                {data ? (
                  <HeatmapOverlay baseSrc={data.images.model_input} width={224} height={224} alt="Preprocessed model input" />
                ) : (
                  <div className="aspect-square w-full animate-pulse rounded-xl bg-navy-100" />
                )}
              </Panel>

              <Panel
                title={`Grad-CAM overlay (${useModelInput ? 'model input' : 'original'})`}
                subtitle="Brighter, more opaque areas increased the score for this category the most."
              >
                {data ? (
                  <HeatmapOverlay
                    baseSrc={useModelInput ? data.images.model_input : analysis.imageUrl}
                    heatmapSrc={useModelInput ? data.images.model_input_heatmap : data.images.heatmap}
                    width={useModelInput ? 224 : data.width}
                    height={useModelInput ? 224 : data.height}
                    opacity={opacity / 100}
                    alt={`Grad-CAM heatmap for ${targetInfo.name}`}
                  />
                ) : (
                  <div
                    className="flex w-full items-center justify-center rounded-xl bg-navy-100 text-sm text-navy-500"
                    style={{ aspectRatio: useModelInput ? '1 / 1' : `${analysis.width} / ${analysis.height}` }}
                    role="status"
                  >
                    Generating heatmap…
                  </div>
                )}
                <HeatmapLegend className="mt-3" />
              </Panel>
            </div>
          )}

          {data?.empty_heatmap && (
            <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No image region increased the score for this category, so the heatmap is empty.
              This is common for categories the model considers very unlikely.
            </p>
          )}
        </div>

        {/* How to read it */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-100">
            <h2 className="font-semibold text-navy-900">How to read this</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-navy-700">
              <li>
                Grad-CAM weights the network&apos;s last convolutional features by how much they
                raise the chosen category&apos;s score, then maps them back onto the image.
              </li>
              <li>
                Highlighted regions <strong className="font-semibold">supported</strong> this
                category. They are not a lesion outline and not evidence that the prediction is right.
              </li>
              <li>
                Compare categories: switching to a less likely class often highlights different areas.
              </li>
              <li>
                Use <strong className="font-semibold">Model input</strong> to see the heatmap on the
                image the model really saw; areas masked out by preprocessing were never visible to it.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-navy-50 p-6">
            <h2 className="font-semibold text-navy-900">Limitations</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-navy-700">
              <li>
                The map is computed on a 7 × 7 grid (each cell ≈ 32 × 32 input pixels) and smoothed,
                so it is coarse.
              </li>
              <li>Grad-CAM is an approximation of the model&apos;s behaviour, not a complete explanation.</li>
              <li>The model has not been clinically validated.</li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-navy-500">
              Layer: <span className="font-mono">{data?.layer ?? 'layer4[-1]'}</span> of ResNet50.
              Method: Selvaraju et al., &ldquo;Grad-CAM: Visual Explanations from Deep Networks via
              Gradient-based Localization&rdquo;, ICCV 2017.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/results"
            className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-5 py-2.5 font-semibold text-navy-800 transition hover:bg-navy-50"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back to results
          </Link>
          <Link
            to="/assistant"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white transition hover:bg-teal-700"
          >
            <Icon name="chat" className="h-4 w-4" />
            Ask the AI assistant
          </Link>
        </div>
      </div>
    </>
  )
}

export default GradCamPage
