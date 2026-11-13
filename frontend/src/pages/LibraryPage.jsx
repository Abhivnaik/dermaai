import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import { getLibrary } from '../api/client'
import { CLASS_ORDER, LESION_CLASSES } from '../data/lesionClasses'

const WORDS_PER_MINUTE = 220

function DocumentCard({ doc }) {
  const minutes = Math.max(1, Math.round(doc.word_count / WORDS_PER_MINUTE))
  return (
    <li className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-navy-100 transition hover:ring-teal-300">
      <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">{doc.publisher}</p>
      <h2 className="mt-2 font-semibold leading-snug text-navy-900">
        <Link to={`/library/${doc.id}`} className="hover:text-teal-700">
          {doc.title}
        </Link>
      </h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {doc.classes.map((code) => (
          <span key={code} className="rounded-md bg-teal-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-teal-700">
            {code}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-navy-500">
        {doc.sections.length} sections · about {minutes} min read
        {doc.source_date && <> · source dated {doc.source_date}</>}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
        <Link
          to={`/library/${doc.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          Read
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
        >
          Original source
          <Icon name="external" className="h-3.5 w-3.5" />
        </a>
      </div>
    </li>
  )
}

function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = searchParams.get('class')
  const activeClass = selected in LESION_CLASSES ? selected : null

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getLibrary({ signal: controller.signal })
      .then((res) => setData(res))
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message)
      })
    return () => controller.abort()
  }, [reloadKey])

  const retry = () => {
    setError(null)
    setReloadKey((k) => k + 1)
  }

  const setClass = (code) => {
    setSearchParams(code ? { class: code } : {}, { replace: true })
  }

  const documents = data?.documents ?? []
  const visible = activeClass ? documents.filter((d) => d.classes.includes(activeClass)) : documents
  const countFor = (code) => documents.filter((d) => d.classes.includes(code)).length

  const chip = (active) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50'
    }`

  return (
    <>
      <PageHeader
        eyebrow="Knowledge library"
        title="Research & knowledge library"
        description="Reference material on skin lesions from the US National Cancer Institute and the HAM10000 dataset paper. The AI assistant searches these documents and cites them."
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <div role="note" className="flex gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
          <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <p className="text-sm leading-relaxed text-teal-900">
            <strong className="font-semibold">Educational information, not medical advice.</strong>{' '}
            Documents are verbatim excerpts from public sources, reproduced under their
            licences with credit; images and reference lists are omitted. Each document
            links to its original. Consult a dermatologist about any skin concern.
          </p>
        </div>

        {data && !data.search_index?.ready && (
          <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <p className="text-sm text-amber-900">
              The search index has not been built, so the assistant cannot cite these
              documents yet. Run <code className="font-mono">python -m rag.ingest</code> and
              restart the backend.
            </p>
          </div>
        )}

        {/* Category filter */}
        <div>
          <p className="text-sm font-semibold text-navy-900">Filter by lesion category</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setClass(null)} className={chip(!activeClass)} aria-pressed={!activeClass}>
              All{data && ` (${documents.length})`}
            </button>
            {CLASS_ORDER.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setClass(code)}
                className={chip(activeClass === code)}
                aria-pressed={activeClass === code}
                title={LESION_CLASSES[code].name}
              >
                <span className="font-mono uppercase">{code}</span>
                {data && <span className="opacity-70"> ({countFor(code)})</span>}
              </button>
            ))}
          </div>
          {activeClass && (
            <p className="mt-3 text-sm text-navy-600">
              Documents discussing <strong className="font-semibold text-navy-900">{LESION_CLASSES[activeClass].name}</strong>.
            </p>
          )}
        </div>

        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-800">Could not load the library</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button type="button" onClick={retry} className="mt-3 text-sm font-semibold text-red-800 underline">
              Try again
            </button>
          </div>
        ) : !data ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading documents">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-52 animate-pulse rounded-2xl bg-navy-50" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy-200 p-8 text-center text-navy-600">
            No documents for this category yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export default LibraryPage
