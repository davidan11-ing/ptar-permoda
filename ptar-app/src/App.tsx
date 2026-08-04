// Raíz de la aplicación: envuelve el router con los proveedores de auth y tema
import { AuthProvider } from './state/AuthContext'
import { ThemeProvider } from './state/ThemeContext'
import AppRouter from './app/Router'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  )
}
