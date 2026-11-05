import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { installSystemSalesApi } from './auth/system-sales-api'
import App from './App'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles.css'
import './system-sales.css'

installSystemSalesApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
