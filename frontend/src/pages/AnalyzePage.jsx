import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import ImageDropzone from '../components/analyze/ImageDropzone'
import { predictImage } from '../api/client'
import { formatBytes, validateImageFile } from '../utils/validateImage'
import { usePrediction } from '../context/usePrediction'

const TIPS = [
  'Use a dermoscopic image: the model was trained on dermatoscope images, not ordinary photos.',
  'Centre the lesion and make sure it is in focus.',
  'Avoid heavy compression, filters or overlaid text.',
]

function AnalyzePage() {
  const navigate = useNavigate()
  const { saveAnalysis } = usePrediction()

  // selected = { file, url, width, height } once a valid image is chosen
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'checking' | 'loading'
  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  const abortRef = useRef(null)
  const urlRef = useRef(null) // preview URL this page still owns

  const loading = status === 'loading'

  const releasePreview = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }

  // On leaving the page: cancel any request and free the preview
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  // Elapsed-seconds counter while waiting for the model
  useEffect(() => {
    if (!loading) return
    const started = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500)
    return () => clearInterval(id)
  }, [loading])

  const handleFileSelected = async (file) => {
    setError(null)
    setStatus('checking')
    const check = await validateImageFile(file)
    setStatus('idle')

    if (!check.ok) {
      setError(check.error)
      return
    }
    releasePreview()
    urlRef.current = check.url
    setSelected({ file, url: check.url, width: check.width, height: check.height })
  }

  const handleRemove = () => {
    releasePreview()
    setSelected(null)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!selected || loading) return
    setError(null)
    setElapsed(0)
    setStatus('loading')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await predictImage(selected.file, { signal: controller.signal })

      // Hand the preview URL over to the shared store; it now owns it
      urlRef.current = null
      saveAnalysis({
        result,
        file: selected.file,
        imageUrl: selected.url,
        fileName: selected.file.name,
        width: selected.width,
        height: selected.height,
        analyzedAt: new Date(),
      })
      navigate('/results')
    } catch (err) {
      if (controller.signal.aborted) return // cancelled by user or page change
      setError(err.message || 'Something went wrong. Please try again.')
      setStatus('idle')
    } finally {
      abortRef.current = null
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    setStatus('idle')
  }

  return (
    <>
      <PageHeader
        eyebrow="Image analysis"
        title="Analyze a dermoscopic image"
        description="Upload a dermoscopic image to receive a model prediction across seven HAM10000 lesion categories."
      />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
        {/* Upload / preview */}
        <div className="lg:col-span-2">
          {!selected ? (
            <ImageDropzone onFileSelected={handleFileSelected} disabled={status === 'checking'} />
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-navy-100">
              <div className="relative flex items-center justify-center bg-navy-950">
                <img
                  src={selected.url}
                  alt="Selected skin lesion preview"
                  className={`max-h-[28rem] w-full object-contain transition ${loading ? 'opacity-40' : ''}`}
                />
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white" role="status" aria-live="polite">
                    <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-teal-400" />
                    <p className="mt-4 font-semibold">Analyzing image… {elapsed}s</p>
                    <p className="mt-1 max-w-xs text-center text-sm text-navy-200">
                      Preprocessing and running ResNet50 on CPU. This usually takes a few seconds.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900" title={selected.file.name}>
                    {selected.file.name}
                  </p>
                  <p className="text-sm text-navy-500">
                    {selected.width} × {selected.height} px · {formatBytes(selected.file.size)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {loading ? (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="rounded-lg px-4 py-2.5 text-sm font-semibold text-navy-700 ring-1 ring-navy-200 transition hover:bg-navy-50"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="rounded-lg px-4 py-2.5 text-sm font-semibold text-navy-700 ring-1 ring-navy-200 transition hover:bg-navy-50"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-600/60"
                  >
                    {loading ? 'Analyzing…' : 'Analyze image'}
                    {!loading && <Icon name="arrowRight" className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === 'checking' && (
            <p className="mt-3 text-sm text-navy-500" role="status">Checking image…</p>
          )}

          {error && (
            <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Analysis could not be completed</p>
                <p className="mt-0.5 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Guidance */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-navy-100">
            <h2 className="font-semibold text-navy-900">For best results</h2>
            <ul className="mt-3 space-y-3">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm text-navy-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <div className="flex items-center gap-2 text-teal-800">
              <Icon name="shield" className="h-5 w-5" />
              <h2 className="font-semibold">Not a diagnosis</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-teal-900">
              Results are experimental outputs from a research model. They are
              not a medical diagnosis. If you are concerned about a skin
              lesion, consult a dermatologist.
            </p>
          </div>

          <div className="rounded-2xl bg-navy-50 p-5 text-sm text-navy-600">
            <h2 className="font-semibold text-navy-900">Your image</h2>
            <p className="mt-2 leading-relaxed">
              The image is sent only to the DermaAI backend for analysis. It is
              processed in memory and is not stored by this web app.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}

export default AnalyzePage
