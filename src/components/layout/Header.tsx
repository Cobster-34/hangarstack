import { useAppState } from '../../lib/AppContext'

interface HeaderProps {
  onExportPDF: () => void
}

export function Header({ onExportPDF }: HeaderProps) {
  const { state, activeHangar } = useAppState()

  const violationCount = state.violations.length
  const placedCount = state.placements.length

  return (
    <div style={{
      height: 'var(--header-height)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Logo / wordmark */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 17,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          display: 'inline-block',
          width: 20, height: 20,
          background: 'var(--accent-blue)',
          borderRadius: 4,
          fontSize: 12,
          lineHeight: '20px',
          textAlign: 'center',
          color: '#fff',
          fontFamily: 'var(--font-mono)',
        }}>H</span>
        HangarStack
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

      {/* Active hangar */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {activeHangar?.name ?? 'No hangar selected'}
        </div>
        {activeHangar && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {activeHangar.width_ft}′ × {activeHangar.depth_ft}′ · {placedCount} aircraft
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Violations indicator */}
      {violationCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 'var(--radius-md)',
          fontSize: 11,
          color: 'var(--accent-red)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent-red)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          {violationCount} clearance {violationCount === 1 ? 'issue' : 'issues'}
        </div>
      )}

      {violationCount === 0 && activeHangar && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: 'var(--accent-green)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }} />
          All clear
        </div>
      )}

      {/* Export */}
      <button className="btn btn-ghost" onClick={onExportPDF}>
        ↓ Export PDF
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
