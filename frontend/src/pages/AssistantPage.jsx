import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import MarkdownMessage from '../components/assistant/MarkdownMessage'
import { useChat } from '../context/useChat'
import { usePrediction } from '../context/usePrediction'
import { LESION_CLASSES } from '../data/lesionClasses'

const MAX_LENGTH = 2000 // must match backend limit

const GENERAL_SUGGESTIONS = [
  'What is the difference between melanoma and a melanocytic nevus?',
  'What is dermoscopy and why is it used?',
  'How does a ResNet50 model classify skin images?',
  'What are the limitations of AI skin lesion classifiers?',
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2" role="status" aria-label="Assistant is typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 animate-bounce rounded-full bg-navy-300"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

function AssistantAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-teal-300">
      <Icon name="chat" className="h-4 w-4" />
    </span>
  )
}

// Passages from the same section are shown once, with all their numbers
function groupSources(sources) {
  const groups = new Map()
  for (const s of sources) {
    const key = `${s.doc_id}#${s.anchor}`
    if (groups.has(key)) groups.get(key).numbers.push(s.n)
    else groups.set(key, { ...s, key, numbers: [s.n] })
  }
  return [...groups.values()]
}

// Library passages cited in an answer as [n]; each opens the exact section
function SourceList({ sources }) {
  return (
    <div className="mt-2 rounded-xl border border-navy-100 bg-white px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Sources</p>
      <ol className="mt-1.5 space-y-2">
        {groupSources(sources).map((s) => (
          <li key={s.key} className="flex gap-2 text-xs leading-snug">
            <span className="shrink-0 font-mono font-semibold text-teal-700">
              {s.numbers.map((n) => `[${n}]`).join('')}
            </span>
            <span className="min-w-0">
              <Link
                to={`/library/${s.doc_id}${s.anchor ? `#${s.anchor}` : ''}`}
                title={s.excerpt}
                className="font-medium text-navy-800 underline decoration-navy-200 underline-offset-2 hover:text-teal-700 hover:decoration-teal-400"
              >
                {s.title}
              </Link>
              {s.heading && <span className="block text-navy-500">{s.heading}</span>}
              <span className="block text-navy-400">{s.publisher}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function MessageBubble({ message, onRetry }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-teal-600 px-4 py-2.5 text-sm leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.error) {
    return (
      <div className="flex gap-3">
        <AssistantAvatar />
        <div role="alert" className="max-w-[85%] rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">The assistant could not answer</p>
          <p className="mt-0.5 text-sm text-red-700">{message.error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm font-semibold text-red-800 underline hover:text-red-900"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-navy-50 px-4 py-3">
          <MarkdownMessage content={message.content} />
        </div>
        {message.sources?.length > 0 && <SourceList sources={message.sources} />}
        <p className="mt-1 px-1 text-xs text-navy-400">
          AI-generated · may contain errors{message.model ? ` · ${message.model}` : ''}
        </p>
      </div>
    </div>
  )
}

function AssistantPage() {
  const { messages, pending, send, retry, clear } = useChat()
  const { analysis } = usePrediction()

  const [input, setInput] = useState('')
  const [includeResult, setIncludeResult] = useState(true)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const result = analysis?.result
  const predicted = result ? LESION_CLASSES[result.predicted_class] : null

  const predictionContext =
    result && includeResult
      ? {
          predicted_class: result.predicted_class,
          confidence: result.confidence,
          all_probabilities: result.all_probabilities,
        }
      : undefined

  // The "my result" suggestion only makes sense when the result is shared
  const suggestions = predictionContext
    ? ['What does my DermaAI result mean?', ...GENERAL_SUGGESTIONS.slice(0, 3)]
    : GENERAL_SUGGESTIONS

  // Keep the newest message in view (scrolls the chat box, not the page)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, pending])

  const submit = (text) => {
    const question = (text ?? input).trim()
    if (!question || pending) return
    // The result is only sent when the user has ticked "Share this result"
    send(question, predictionContext)
    if (text === undefined) setInput('')
    inputRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const remaining = MAX_LENGTH - input.length

  return (
    <>
      <PageHeader
        eyebrow="AI assistant"
        title="Ask about skin lesions"
        description="An AI assistant powered by Google Gemini for educational questions about skin lesion categories, dermoscopy and how DermaAI works. Answers cite the DermaAI knowledge library where it covers the question."
      />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
        {/* Chat panel */}
        <section className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-navy-100 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-navy-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <h2 className="text-sm font-semibold text-navy-900">DermaAI Assistant</h2>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-navy-500 transition hover:bg-navy-50 hover:text-navy-800"
              >
                Clear conversation
              </button>
            )}
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="h-[28rem] flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:h-[32rem] sm:px-5"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <Icon name="chat" className="h-6 w-6" />
                </span>
                <p className="mt-3 font-semibold text-navy-900">How can I help?</p>
                <p className="mt-1 max-w-sm text-sm text-navy-500">
                  Ask an educational question, or pick a suggestion below.
                </p>
                <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submit(s)}
                      className="rounded-xl border border-navy-100 px-4 py-3 text-left text-sm text-navy-700 transition hover:border-teal-300 hover:bg-teal-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onRetry={() => retry(m.retryQuestion, predictionContext)}
                />
              ))
            )}
            {pending && (
              <div className="flex gap-3">
                <AssistantAvatar />
                <div className="rounded-2xl rounded-tl-md bg-navy-50 px-4 py-1">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            className="border-t border-navy-100 p-3 sm:p-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">Your question</label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={2}
                value={input}
                maxLength={MAX_LENGTH}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about skin lesions, dermoscopy or DermaAI…"
                className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-xl border border-navy-200 px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                aria-label="Send question"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-navy-200"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-navy-400">
              <span>Enter to send · Shift+Enter for a new line</span>
              {remaining < 200 && <span className={remaining < 50 ? 'text-red-600' : ''}>{remaining} left</span>}
            </div>
          </form>
        </section>

        {/* Side panel */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <div className="flex items-center gap-2 text-teal-800">
              <Icon name="shield" className="h-5 w-5" />
              <h2 className="font-semibold">Educational use only</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-teal-900">
              The assistant provides general educational information. It cannot
              diagnose skin conditions or give personal medical advice, and AI
              answers can be wrong. Consult a dermatologist about any skin concern.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 ring-1 ring-navy-100">
            <h2 className="font-semibold text-navy-900">Your latest result</h2>
            {predicted ? (
              <>
                <p className="mt-2 text-sm text-navy-600">
                  <span className="font-medium text-navy-900">{predicted.name}</span>{' '}
                  <span className="font-mono text-xs uppercase text-navy-400">{predicted.code}</span>
                  <br />
                  Model confidence {result.confidence.toFixed(2)}%
                </p>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-navy-700">
                  <input
                    type="checkbox"
                    checked={includeResult}
                    onChange={(e) => setIncludeResult(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-navy-300 accent-teal-600"
                  />
                  Share this result with the assistant so it can explain it
                </label>
              </>
            ) : (
              <p className="mt-2 text-sm text-navy-600">
                No analysis yet.{' '}
                <Link to="/analyze" className="font-semibold text-teal-700 hover:text-teal-800">
                  Analyze an image
                </Link>{' '}
                to ask questions about a result.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 ring-1 ring-navy-100">
            <div className="flex items-center gap-2 text-navy-900">
              <Icon name="book" className="h-5 w-5 text-teal-600" />
              <h2 className="font-semibold">Cited sources</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">
              The assistant searches the knowledge library (National Cancer
              Institute pages and the HAM10000 paper) and cites passages as
              [1], [2]. Select a source to read it in context.
            </p>
            <Link to="/library" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
              Browse the library
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl bg-navy-50 p-5 text-sm text-navy-600">
            <h2 className="font-semibold text-navy-900">Privacy</h2>
            <p className="mt-2 leading-relaxed">
              Your questions, recent conversation and (if shared) the result
              summary are sent to Google Gemini to generate answers. Your image
              is never sent. Don&apos;t include personal information.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}

export default AssistantPage
