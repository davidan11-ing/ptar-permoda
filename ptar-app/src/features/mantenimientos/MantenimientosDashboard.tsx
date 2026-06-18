import MttoPanel from './MttoPanel';

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
