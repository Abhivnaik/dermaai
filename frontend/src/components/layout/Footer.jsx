import { Link } from 'react-router'
import Logo from './Logo'
import { NAV_LINKS } from '../../config/navigation'

const CURRENT_YEAR = new Date().getFullYear()

function Footer() {
  return (
    <footer className="mt-auto bg-navy-950 text-navy-200">
      {/* Research disclaimer — always visible on every page */}
      <div className="border-b border-navy-800 bg-navy-900">
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-4 sm:px-6">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
          <p className="text-sm leading-relaxed">
            <strong className="font-semibold text-white">Research disclaimer:</strong>{' '}
            DermaAI is an educational and research project. It is not a clinically
            validated medical device and does not provide medical diagnoses. Always
            consult a qualified healthcare professional about any skin concern.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2">
        <div>
          <Logo light />
          <p className="mt-3 max-w-sm text-sm text-navy-300">
            AI-assisted skin lesion analysis using a ResNet50 model trained on the
            HAM10000 dermoscopy dataset.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="hover:text-white">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-navy-800 py-4 text-center text-xs text-navy-400">
        © {CURRENT_YEAR} DermaAI · Educational research project
      </div>
    </footer>
  )
}

export default Footer
