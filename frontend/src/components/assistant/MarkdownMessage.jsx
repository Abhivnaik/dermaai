import Markdown from 'react-markdown'

// Renders assistant answers written in Markdown.
// react-markdown does not render raw HTML and strips unsafe link
// protocols (e.g. javascript:), so model output cannot inject markup.
const components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-navy-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h3 className="mb-2 mt-1 font-semibold text-navy-900">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-1 font-semibold text-navy-900">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-1 font-semibold text-navy-900">{children}</h3>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 underline hover:text-teal-800">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-navy-50 px-1 py-0.5 font-mono text-[0.85em] text-navy-800">{children}</code>
  ),
  hr: () => <hr className="my-3 border-navy-100" />,
}

function MarkdownMessage({ content }) {
  return (
    <div className="text-sm leading-relaxed text-navy-800">
      <Markdown components={components}>{content}</Markdown>
    </div>
  )
}

export default MarkdownMessage
