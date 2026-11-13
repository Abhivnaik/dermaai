import { useRef, useState } from 'react'
import Icon from '../ui/Icon'
import { ACCEPT_ATTR, MAX_SIZE_BYTES, formatBytes } from '../../utils/validateImage'

/**
 * Drag-and-drop / click-to-browse upload area.
 * Calls onFileSelected(file) with the chosen file; validation happens in the parent.
 */
function ImageDropzone({ onFileSelected, disabled = false }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (files) => {
    if (disabled || !files || files.length === 0) return
    onFileSelected(files[0])
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(e) => {
        // Ignore drag-leave events fired when moving over child elements
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
        dragging ? 'border-teal-500 bg-teal-50' : 'border-navy-200 bg-navy-50/50'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-teal-600 shadow-sm ring-1 ring-navy-100">
        <Icon name="upload" className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-navy-900">
        {dragging ? 'Drop the image here' : 'Drag and drop a dermoscopic image'}
      </p>
      <p className="mt-1 text-sm text-navy-500">or</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-800 shadow-sm ring-1 ring-navy-200 transition hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed"
      >
        Browse files
      </button>
      <p className="mt-4 text-xs text-navy-500">
        JPG, PNG or WEBP · max {formatBytes(MAX_SIZE_BYTES)}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = '' // allow re-selecting the same file
        }}
      />
    </div>
  )
}

export default ImageDropzone
