import { useState } from 'react';
import { useTheme } from '../../state/ThemeContext';
import ResumenDashboard from './ResumenDashboard';
import AnalisSheet from './AnalisSheet';
import VisualizadorConfigModal from '../dashboard/VisualizadorConfigModal';

type Tab = 'resumen' | 'explorador';

export default function AnalistaPage() {
  const { theme } = useTheme();
  const [tab,        setTab]        = useState<Tab>('resumen');
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Tabs + botón config ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, borderBottom: `1px solid ${theme.surface2}`, paddingBottom: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <TabBtn label="📊 Resumen"    active={tab === 'resumen'}    onClick={() => setTab('resumen')} />
          <TabBtn label="🔬 Explorador" active={tab === 'explorador'} onClick={() => setTab('explorador')} />
        </div>
        <button
          onClick={() => setShowConfig(true)}
          style={{
            background: theme.chipBlueBg, border: '1px solid #1f6feb66',
            color: theme.lblue, borderRadius: 6, fontSize: 12, fontWeight: 600,
            padding: '6px 14px', cursor: 'pointer', marginBottom: 1,
          }}
        >
          ⚙ Configurar Visualizador
        </button>
      </div>

      {showConfig && <VisualizadorConfigModal onClose={() => setShowConfig(false)} />}

      {tab === 'resumen'    && <ResumenDashboard />}
      {tab === 'explorador' && <AnalisSheet />}
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        borderBottom: active ? `2px solid ${theme.lblue}` : '2px solid transparent',
        color: active ? theme.lblue : theme.muted,
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        padding: '8px 16px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        marginBottom: -1,
        transition: 'color .15s, border-color .15s',
      }}
    >
      {label}
    </button>
  );
}
