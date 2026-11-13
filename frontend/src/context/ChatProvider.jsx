import { useCallback, useMemo, useRef, useState } from 'react'
import { ChatContext } from './ChatContext'
import { askAssistant } from '../api/client'

// Number of earlier messages sent as context with each question
// (backend accepts up to 20).
const MAX_HISTORY_MESSAGES = 12

let nextId = 1
const makeId = () => `m${nextId++}`

/*
  Message shape:
    { id, role: 'user' | 'assistant', content, model?, sources?, error?, retryQuestion? }
  `sources` are the knowledge-library passages an answer cites as [n].
  A failed request adds an assistant message with `error` set; error
  messages are never sent back to the model as history.
  The conversation is kept in memory only and cleared on page refresh.
*/
export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [pending, setPending] = useState(false)

  // Refs mirror the latest values so async callbacks never use stale state
  const messagesRef = useRef([])
  const pendingRef = useRef(false)
  const abortRef = useRef(null)

  const update = useCallback((fn) => {
    messagesRef.current = fn(messagesRef.current)
    setMessages(messagesRef.current)
  }, [])

  const setBusy = useCallback((value) => {
    pendingRef.current = value
    setPending(value)
  }, [])

  const send = useCallback(
    async (question, prediction) => {
      const text = question.trim()
      if (!text || pendingRef.current) return

      // Drop any previous error bubble once the user asks again
      update((prev) => prev.filter((m) => !m.error))

      const history = messagesRef.current
        .slice(-MAX_HISTORY_MESSAGES)
        .map(({ role, content }) => ({ role, content }))

      update((prev) => [...prev, { id: makeId(), role: 'user', content: text }])
      setBusy(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const payload = { question: text, history }
        if (prediction) payload.prediction = prediction
        const res = await askAssistant(payload, { signal: controller.signal })
        if (controller.signal.aborted) return
        update((prev) => [
          ...prev,
          { id: makeId(), role: 'assistant', content: res.answer, model: res.model, sources: res.sources },
        ])
      } catch (err) {
        if (controller.signal.aborted) return
        update((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            content: '',
            error: err.message || 'Something went wrong.',
            retryQuestion: text,
          },
        ])
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
          setBusy(false)
        }
      }
    },
    [update, setBusy],
  )

  // Retry: remove the failed exchange (question + error), then resend it
  const retry = useCallback(
    (question, prediction) => {
      update((prev) => {
        const lastUser = prev.findLastIndex((m) => m.role === 'user' && m.content === question)
        return lastUser === -1 ? prev : prev.slice(0, lastUser)
      })
      send(question, prediction)
    },
    [update, send],
  )

  const clear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    update(() => [])
    setBusy(false)
  }, [update, setBusy])

  const value = useMemo(
    () => ({ messages, pending, send, retry, clear }),
    [messages, pending, send, retry, clear],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
