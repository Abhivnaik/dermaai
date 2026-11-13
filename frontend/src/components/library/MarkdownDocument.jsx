import { Children, isValidElement, useMemo } from 'react'
import Markdown from 'react-markdown'
import { slugify } from '../../utils/slugify'

// Plain text of rendered children (used to build heading ids)
function textOf(children) {
  return Children.toArray(children)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : isValidElement(c) ? textOf(c.props.children) : ''))
    .join('')
}

// Heading with an anchor id matching the backend's passage anchors.
// scroll-mt keeps it clear of the sticky navbar when linked to.
function heading(Tag, className) {
  return function Heading({ children, highlight }) {
    const id = slugify(textOf(children))
    const active = id && id === highlight
    return (
      <Tag
        id={id || undefined}
        className={`scroll-mt-24 rounded-md text-navy-900 transition-colors ${className} ${
          active ? '-mx-2 bg-teal-50 px-2 ring-1 ring-teal-200' : ''
        }`}
      >
        {children}
      </Tag>
    )
  }
}

const H2 = heading('h2', 'mb-3 mt-10 text-xl font-bold first:mt-0')
const H3 = heading('h3', 'mb-2 mt-8 text-lg font-semibold')
const H4 = heading('h4', 'mb-2 mt-6 font-semibold')

// Renders a library document. No raw HTML is rendered.
function MarkdownDocument({ content, highlight }) {
  const components = useMemo(
    () => ({
      h1: ({ children }) => <H2 highlight={highlight}>{children}</H2>,
      h2: ({ children }) => <H2 highlight={highlight}>{children}</H2>,
      h3: ({ children }) => <H3 highlight={highlight}>{children}</H3>,
      h4: ({ children }) => <H4 highlight={highlight}>{children}</H4>,
      p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
      ul: ({ children }) => <ul className="mb-4 list-disc space-y-1.5 pl-6">{children}</ul>,
      ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1.5 pl-6">{children}</ol>,
      li: ({ children }) => <li className="pl-1 leading-relaxed [&>ul]:mb-0 [&>ul]:mt-1.5">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold text-navy-900">{children}</strong>,
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 underline hover:text-teal-800">
          {children}
        </a>
      ),
    }),
    [highlight],
  )

  return (
    <div className="text-[15px] text-navy-700">
      <Markdown components={components}>{content}</Markdown>
    </div>
  )
}

export default MarkdownDocument
