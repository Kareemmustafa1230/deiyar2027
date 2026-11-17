import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { LangProvider } from './lib/i18n'
import { AuthProvider, MetaProvider, ToastProvider } from './lib/store'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LangProvider>
        <ToastProvider>
          <MetaProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MetaProvider>
        </ToastProvider>
      </LangProvider>
    </BrowserRouter>
  </StrictMode>,
)
