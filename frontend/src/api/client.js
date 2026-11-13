// API client for the DermaAI FastAPI backend.
// In development, Vite proxies /api/* to http://127.0.0.1:8000 (see vite.config.js).

import { LESION_CLASSES } from '../data/lesionClasses'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

// CPU inference can be slow; give up after 2 minutes
const REQUEST_TIMEOUT_MS = 120_000

export class ApiError extends Error {
  constructor(message, status = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Turn a FastAPI error body into a readable message
function extractDetail(body) {
  if (!body || body.detail == null) return null
  if (typeof body.detail === 'string') return body.detail
  // 422 validation errors: [{ loc, msg, type }, ...]
  if (Array.isArray(body.detail)) return body.detail.map((d) => d.msg).join('; ')
  return null
}

// Make sure the response has the shape the UI expects
function validatePrediction(data) {
  const ok =
    data &&
    typeof data.predicted_class === 'string' &&
    data.predicted_class in LESION_CLASSES &&
    typeof data.confidence === 'number' &&
    data.all_probabilities &&
    typeof data.all_probabilities === 'object' &&
    Object.keys(LESION_CLASSES).every((k) => typeof data.all_probabilities[k] === 'number')

  if (!ok) throw new ApiError('The server returned an unexpected response format.')
  return data
}

/**
 * Send an image to POST /api/predict.
 * @param {File} file
 * @param {{ signal?: AbortSignal }} options  signal lets the caller cancel
 * @returns {Promise<{predicted_class: string, confidence: number,
 *   all_probabilities: Record<string, number>, disclaimer?: string}>}
 */
export async function predictImage(file, { signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response
  try {
    response = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      body: formData,
      signal: combined,
    })
  } catch (err) {
    if (signal?.aborted) throw err // user cancelled — let caller handle quietly
    if (timeout.aborted) {
      throw new ApiError('The analysis took too long and was stopped. Please try again.')
    }
    throw new ApiError(
      'Cannot reach the analysis server. Make sure the FastAPI backend is running on port 8000.',
    )
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON body (e.g. proxy error page) — handled below
  }

  if (!response.ok) {
    if ([502, 503, 504].includes(response.status) && !extractDetail(body)) {
      throw new ApiError(
        'The analysis server is not responding. Make sure the FastAPI backend is running and has finished starting up.',
        response.status,
      )
    }
    throw new ApiError(
      extractDetail(body) ?? `The server returned an error (HTTP ${response.status}).`,
      response.status,
    )
  }

  return validatePrediction(body)
}

/**
 * Grad-CAM heatmap for an image via POST /api/gradcam.
 * @param {File} file
 * @param {string} targetClass  class code to explain (e.g. 'bkl')
 * @returns {Promise<{ predicted_class: string, confidence: number,
 *   all_probabilities: Record<string, number>, target_class: string,
 *   target_probability: number, layer: string, empty_heatmap: boolean,
 *   width: number, height: number,
 *   images: { heatmap: string, overlay: string, model_input: string,
 *             model_input_heatmap: string } }>}  images are PNG data URLs
 */
export async function getGradCam(file, targetClass, { signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (targetClass) formData.append('target_class', targetClass)

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response
  try {
    response = await fetch(`${API_BASE}/api/gradcam`, { method: 'POST', body: formData, signal: combined })
  } catch (err) {
    if (signal?.aborted) throw err
    if (timeout.aborted) throw new ApiError('Generating the heatmap took too long. Please try again.')
    throw new ApiError('Cannot reach the analysis server. Make sure the FastAPI backend is running on port 8000.')
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // handled below
  }

  if (!response.ok) {
    if ([502, 503, 504].includes(response.status) && !extractDetail(body)) {
      throw new ApiError('The analysis server is not responding. Make sure the FastAPI backend is running.', response.status)
    }
    throw new ApiError(extractDetail(body) ?? `The server returned an error (HTTP ${response.status}).`, response.status)
  }

  const images = body?.images
  const isPng = (v) => typeof v === 'string' && v.startsWith('data:image/png;base64,')
  if (
    !body ||
    !(body.target_class in LESION_CLASSES) ||
    !images ||
    !['heatmap', 'overlay', 'model_input', 'model_input_heatmap'].every((k) => isPng(images[k])) ||
    !(body.width > 0 && body.height > 0)
  ) {
    throw new ApiError('The server returned an unexpected response format.')
  }
  return body
}

// Backend worst case: primary model 20 s + fallback model 60 s
const CHAT_TIMEOUT_MS = 100_000

/**
 * Ask the AI assistant a question via POST /api/chat.
 * @param {{ question: string,
 *           history?: {role: 'user'|'assistant', content: string}[],
 *           prediction?: {predicted_class: string, confidence: number,
 *                         all_probabilities: Record<string, number>} }} payload
 * @param {{ signal?: AbortSignal }} options
 * @returns {Promise<{ question: string, answer: string, model: string,
 *   sources: {n: number, doc_id: string, title: string, publisher: string,
 *             url: string, heading: string, anchor: string, excerpt: string}[] }>}
 *   `sources` lists only the library passages the answer cites as [n].
 */
export async function askAssistant(payload, { signal } = {}) {
  const timeout = AbortSignal.timeout(CHAT_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response
  try {
    response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: combined,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    if (timeout.aborted) {
      throw new ApiError('The assistant took too long to respond. Please try again.')
    }
    throw new ApiError(
      'Cannot reach the server. Make sure the FastAPI backend is running on port 8000.',
    )
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // handled below
  }

  if (!response.ok) {
    if ([502, 503, 504].includes(response.status) && !extractDetail(body)) {
      throw new ApiError('The server is not responding. Make sure the FastAPI backend is running.', response.status)
    }
    throw new ApiError(
      extractDetail(body) ?? `The assistant returned an error (HTTP ${response.status}).`,
      response.status,
    )
  }

  if (!body || typeof body.answer !== 'string' || !body.answer.trim()) {
    throw new ApiError('The assistant returned an empty response. Please try again.')
  }
  const sources = Array.isArray(body.sources)
    ? body.sources.filter((s) => s && typeof s.doc_id === 'string' && typeof s.title === 'string')
    : []
  return { ...body, sources }
}

const LIBRARY_TIMEOUT_MS = 20_000

// GET a JSON resource from the backend with the same error handling as above
async function getJson(path, { signal } = {}) {
  const timeout = AbortSignal.timeout(LIBRARY_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { signal: combined })
  } catch (err) {
    if (signal?.aborted) throw err
    if (timeout.aborted) throw new ApiError('The server took too long to respond. Please try again.')
    throw new ApiError('Cannot reach the server. Make sure the FastAPI backend is running on port 8000.')
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // handled below
  }

  if (!response.ok) {
    if ([502, 503, 504].includes(response.status) && !extractDetail(body)) {
      throw new ApiError('The server is not responding. Make sure the FastAPI backend is running.', response.status)
    }
    throw new ApiError(extractDetail(body) ?? `The server returned an error (HTTP ${response.status}).`, response.status)
  }
  if (!body || typeof body !== 'object') throw new ApiError('The server returned an unexpected response format.')
  return body
}

/**
 * List the knowledge-library documents (GET /api/library).
 * @returns {Promise<{ documents: object[], search_index: {ready: boolean} }>}
 */
export async function getLibrary(options) {
  const body = await getJson('/api/library', options)
  if (!Array.isArray(body.documents)) throw new ApiError('The server returned an unexpected response format.')
  return body
}

/**
 * Fetch one library document with its Markdown text (GET /api/library/{id}).
 */
export async function getLibraryDocument(id, options) {
  const body = await getJson(`/api/library/${encodeURIComponent(id)}`, options)
  if (typeof body.body !== 'string' || typeof body.title !== 'string') {
    throw new ApiError('The server returned an unexpected response format.')
  }
  return body
}
