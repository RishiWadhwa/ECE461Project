import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startHeartbeat } from './connection.ts'

// Outside React so StrictMode's double-mount in development cannot start a second heartbeat.
startHeartbeat()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
