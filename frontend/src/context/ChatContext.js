import { createContext } from 'react'

// Holds the AI assistant conversation so it survives page navigation.
// Provided by ChatProvider.jsx; read with useChat().
export const ChatContext = createContext(null)
