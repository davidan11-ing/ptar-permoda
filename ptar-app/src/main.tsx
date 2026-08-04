// Punto de entrada de la aplicación — monta el árbol React en el DOM
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/splash.css'
import './styles/light-theme.css'
import App from './App.tsx'

// Renderiza la app en modo estricto sobre el elemento raíz del HTML
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
