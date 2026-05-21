import { AuthProvider } from './state/AuthContext'
import AppRouter from './app/Router'

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
