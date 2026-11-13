import { createContext } from 'react'

// Holds the most recent analysis so the Results (and later Grad-CAM) pages
// can display it. Provided by PredictionProvider.jsx; read with usePrediction().
export const PredictionContext = createContext(null)
