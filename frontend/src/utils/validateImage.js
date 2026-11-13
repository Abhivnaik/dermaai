// Client-side checks before uploading. The backend re-validates everything;
// these checks just give faster, friendlier feedback.

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')
export const MAX_SIZE_BYTES = 10 * 1024 * 1024 // must match backend limit

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Try to decode the image in the browser and read its dimensions.
function readDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('decode failed'))
    img.src = url
  })
}

/**
 * Validate a selected file.
 * @returns {Promise<{ ok: true, url: string, width: number, height: number }
 *                  | { ok: false, error: string }>}
 *   On success, `url` is an object URL the caller must revoke when done.
 */
export async function validateImageFile(file) {
  if (!file) return { ok: false, error: 'No file selected.' }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Unsupported file type. Please upload a JPG, PNG or WEBP image.' }
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      ok: false,
      error: `This image is ${formatBytes(file.size)}. The maximum size is ${formatBytes(MAX_SIZE_BYTES)}.`,
    }
  }

  if (file.size === 0) return { ok: false, error: 'This file is empty.' }

  const url = URL.createObjectURL(file)
  try {
    const { width, height } = await readDimensions(url)
    return { ok: true, url, width, height }
  } catch {
    URL.revokeObjectURL(url)
    return { ok: false, error: 'This file could not be read as an image. It may be corrupted.' }
  }
}
