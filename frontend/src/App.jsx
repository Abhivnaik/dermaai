import { Route, Routes } from 'react-router'
import Layout from './components/layout/Layout'
import LandingPage from './pages/LandingPage'
import AnalyzePage from './pages/AnalyzePage'
import ResultsPage from './pages/ResultsPage'
import GradCamPage from './pages/GradCamPage'
import AssistantPage from './pages/AssistantPage'
import LibraryPage from './pages/LibraryPage'
import LibraryDocumentPage from './pages/LibraryDocumentPage'
import AboutPage from './pages/AboutPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="grad-cam" element={<GradCamPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="library/:docId" element={<LibraryDocumentPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
