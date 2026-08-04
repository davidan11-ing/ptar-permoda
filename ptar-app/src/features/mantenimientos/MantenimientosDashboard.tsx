// Página de mantenimientos preventivos: contenedor principal del módulo GFT-PTAR
import MttoPanel from './MttoPanel';

// Vista de mantenimientos que envuelve el panel con encabezado de sección
export default function MantenimientosDashboard() {
  return (
    <div className="cal-page">
      <div className="cal-header">
        <h1 className="cal-title">Mantenimientos Preventivos</h1>
        <p className="cal-subtitle">Sincronizado desde SharePoint · GFT Área PTAR</p>
      </div>
      <section className="dash-section">
        <MttoPanel />
      </section>
    </div>
  );
}
