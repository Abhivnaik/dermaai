import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import Icon from '../components/ui/Icon'
import MarkdownDocument from '../components/library/MarkdownDocument'
import { getLibraryDocument } from '../api/client'
import { slugify } from '../utils/slugify'

function BackLink() {
  return (
    <Link to="/library" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
      <Icon name="arrowLeft" className="h-4 w-4" />
      Knowledge library
    </Link>
  )
}

function SourceDetails({ doc }) {
  const rows = [
    ['Publisher', doc.publisher],
    ['Source date', doc.source_date],
    ['Retrieved', doc.retrieved],
    ['Licence', doc.license],
    ['Credit', doc.attribution],
  ].filter(([, v]) => v)

  return (
    <section className="rounded-2xl bg-navy-50 p-5">
      <h2 className="font-semibold text-navy-900">About this document</h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-navy-400">{k}</dt>
            <dd className="mt-0.5 break-words text-navy-700">{v}</dd>
          </div>
        ))}
      </dl>
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        Read the original
        <Icon name="external" className="h-4 w-4" />
      </a>
      <p className="mt-3 text-xs leading-relaxed text-navy-500">
        Text is reproduced verbatim; images, navigation and reference lists were
        removed. The original may have been updated since it was retrieved.
      </p>
    </section>
  )
}

function DocumentView({ docId }) {
  const { hash } = useLocation()
  const anchor = hash ? decodeURIComponent(hash.slice(1)) : ''

  const [doc, setDoc] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getLibraryDocument(docId, { signal: controller.signal })
      .then((res) => setDoc(res))
      .catch((err) => {
        if (!controller.signal.aborted) setError(err)
      })
    return () => controller.abort()
  }, [docId])

  // Jump to the cited section once the text has rendered
  useEffect(() => {
    if (!doc || !anchor) return
    document.getElementById(anchor)?.scrollIntoView({ block: 'start' })
  }, [doc, anchor])

  if (error) {
    const notFound = error.status === 404
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <BackLink />
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-800">{notFound ? 'Document not found' : 'Could not load the document'}</p>
          <p className="mt-1 text-sm text-red-700">
            {notFound ? 'This document is not in the knowledge library.' : error.message}
          </p>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy="true">
        <div className="h-8 w-2/3 animate-pulse rounded bg-navy-50" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-navy-50" />
      </div>
    )
  }

  return (
    <>
      <div className="border-b border-navy-100 bg-gradient-to-b from-navy-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <BackLink />
          <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-teal-700">{doc.publisher}</p>
          <h1 className="mt-2 max-w-4xl text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{doc.title}</h1>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {doc.classes.map((code) => (
              <Link
                key={code}
                to={`/library?class=${code}`}
                className="rounded-md bg-teal-50 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase text-teal-700 ring-1 ring-teal-100 hover:bg-teal-100"
              >
                {code}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="min-w-0">
          <div role="note" className="mb-8 flex gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
            <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <p className="text-sm leading-relaxed text-teal-900">
              Educational reference material, not medical advice. Consult a
              dermatologist about any skin concern.
            </p>
          </div>
          <MarkdownDocument content={doc.body} highlight={anchor} />
        </article>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
          <SourceDetails doc={doc} />
          {doc.sections.length > 1 && (
            <nav aria-label="Sections" className="rounded-2xl p-5 ring-1 ring-navy-100">
              <h2 className="font-semibold text-navy-900">Sections</h2>
              <ol className="mt-3 space-y-2 text-sm">
                {doc.sections.map((title) => (
                  <li key={title}>
                    <a href={`#${slugify(title)}`} className="text-navy-600 hover:text-teal-700">
                      {title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </aside>
      </div>
    </>
  )
}

function LibraryDocumentPage() {
  const { docId } = useParams()
  // key: a different document starts with fresh state
  return <DocumentView key={docId} docId={docId} />
}

export default LibraryDocumentPage
