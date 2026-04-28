import { useAppState } from '../../lib/AppContext'

export function ViolationsPanel() {
  const { state } = useAppState()
  const { violations } = state

  if (violations.length === 0) return null

  const colorMap = {
    overlap: { color: 'var(--accent-red)', icon: '⚠' },
    door_blocked: { color: 'var(--accent-amber)', icon: '▲' },
    obstruction: { color: 'var(--accent-orange)', icon: '●' },
    boundary: { color: 'var(--accent-red)', icon: '⚠' },
  }

  return (
    <div style={{
      borderTop: '1px solid rgba(248,113,113,0.3)',
      background: 'rgba(248,113,113,0.05)',
      padding: '6px 16px',
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap',
      alignItems: 'center',
      flexShrink: 0,
      maxHeight: 80,
      overflowY: 'auto',
    }}>
      <span style={{ fontSize: 10, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        Clearance Issues
      </span>
      {violations.map((v, i) => {
        const { color, icon } = colorMap[v.type]
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color,
            background: 'rgba(0,0,0,0.2)',
            padding: '2px 8px',
            borderRadius: 4,
            border: `1px solid ${color}40`,
          }}>
            <span style={{ fontSize: 10 }}>{icon}</span>
            {v.message}
          </div>
        )
      })}
    </div>
  )
}
