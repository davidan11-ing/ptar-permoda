// Estructura base de la aplicación: navbar, notificaciones, toasts y área de contenido
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from '../components/layout/Navbar';
import { NotificationManager } from '../components/notifications/NotificationManager';

// Contenedor principal con navbar, sistema de alertas y slot de página activa
export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar />

      {/* Polling + toasts de nuevos registros para encargado/admin */}
      <NotificationManager />

      {/* Toast global — éxito/error de formularios + notificaciones */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerStyle={{ top: 68 }}
        // Estilos y duración de los toasts según el tema oscuro de la app
        toastOptions={{
          duration: 6000,
          style: {
            background: '#161b22',
            color: '#e6edf3',
            border: '1px solid #30363d',
            borderRadius: 8,
            fontSize: 13,
            maxWidth: 360,
          },
          success: { iconTheme: { primary: '#3fb950', secondary: '#0d1117' } },
          error:   { iconTheme: { primary: '#f85149', secondary: '#0d1117' } },
        }}
      />

      {/* Área de contenido donde se renderiza la ruta activa */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
