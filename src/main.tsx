import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { PasswordGate } from './PasswordGate'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </PasswordGate>
  </StrictMode>,
)
