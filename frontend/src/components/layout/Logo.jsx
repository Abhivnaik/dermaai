import { Link } from 'react-router'

// DermaAI wordmark with a simple lesion-scan icon.
function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="DermaAI home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-teal-600" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="16" cy="16" r="2.5" fill="white" />
        <path d="M6 9V6h3M23 6h3v3M26 23v3h-3M9 26H6v-3" fill="none" stroke="white" strokeWidth="1.5" />
      </svg>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>
        Derma<span className="text-teal-500">AI</span>
      </span>
    </Link>
  )
}

export default Logo
