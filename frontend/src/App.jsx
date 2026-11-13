import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

function Home() {
  return (
    <main style={{ padding: 'var(--space-8)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
        PhotoDrop
      </h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Create an event, share the link, collect photos.
      </p>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
