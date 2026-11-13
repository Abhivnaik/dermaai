import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import { PredictionProvider } from './context/PredictionProvider'
import { ChatProvider } from './context/ChatProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PredictionProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </PredictionProvider>
    </BrowserRouter>
  </StrictMode>,
)
