import { useCallback, useMemo, useRef, useState } from 'react'
import { PredictionContext } from './PredictionContext'
import { getGradCam } from '../api/client'

/*
  Stored analysis shape:
  {
    result:     { predicted_class, confidence, all_probabilities, disclaimer },
    file:       the uploaded File (used to request Grad-CAM heatmaps),
    imageUrl:   object URL of the uploaded image (owned by this provider),
    fileName:   string,
    width, height: number,
    analyzedAt: Date,
  }

  Grad-CAM results are cached per target class for the current analysis:
    gradcams[classCode] = { status: 'loading' | 'success' | 'error', data?, error? }
  Everything lives in memory only: it is cleared on page refresh or when a
  new image is analysed, and is never sent anywhere except our backend.
*/
export function PredictionProvider({ children }) {
  const [analysis, setAnalysis] = useState(null)
  const [gradcams, setGradcams] = useState({})

  // Refs mirror the latest values so async callbacks never use stale state
  const analysisRef = useRef(null)
  const gradcamsRef = useRef({})
  const controllersRef = useRef([])

  const updateGradcams = useCallback((fn) => {
    gradcamsRef.current = fn(gradcamsRef.current)
    setGradcams(gradcamsRef.current)
  }, [])

  const saveAnalysis = useCallback(
    (next) => {
      const prev = analysisRef.current
      // Free the previous image's memory
      if (prev?.imageUrl && prev.imageUrl !== next?.imageUrl) URL.revokeObjectURL(prev.imageUrl)
      // Heatmaps belong to the previous image: cancel and forget them
      controllersRef.current.forEach((c) => c.abort())
      controllersRef.current = []
      updateGradcams(() => ({}))
      analysisRef.current = next
      setAnalysis(next)
    },
    [updateGradcams],
  )

  const clearAnalysis = useCallback(() => saveAnalysis(null), [saveAnalysis])

  // Fetch the Grad-CAM for one class unless it is cached or already loading
  const requestGradCam = useCallback(
    (classCode) => {
      const current = analysisRef.current
      if (!current?.file || !classCode) return
      const existing = gradcamsRef.current[classCode]
      if (existing && existing.status !== 'error') return

      updateGradcams((prev) => ({ ...prev, [classCode]: { status: 'loading' } }))
      const controller = new AbortController()
      controllersRef.current.push(controller)

      getGradCam(current.file, classCode, { signal: controller.signal })
        .then((data) => {
          if (analysisRef.current !== current) return
          updateGradcams((prev) => ({ ...prev, [classCode]: { status: 'success', data } }))
        })
        .catch((err) => {
          if (controller.signal.aborted || analysisRef.current !== current) return
          updateGradcams((prev) => ({
            ...prev,
            [classCode]: { status: 'error', error: err.message || 'Could not generate the heatmap.' },
          }))
        })
        .finally(() => {
          controllersRef.current = controllersRef.current.filter((c) => c !== controller)
        })
    },
    [updateGradcams],
  )

  const value = useMemo(
    () => ({ analysis, saveAnalysis, clearAnalysis, gradcams, requestGradCam }),
    [analysis, saveAnalysis, clearAnalysis, gradcams, requestGradCam],
  )

  return <PredictionContext.Provider value={value}>{children}</PredictionContext.Provider>
}
