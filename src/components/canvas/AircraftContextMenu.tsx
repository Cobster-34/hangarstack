import { useEffect, useRef } from 'react'
import { STATUS_CONFIG, ALL_STATUSES } from '../../lib/constants'
import type { AircraftPlacement, AircraftStatus } from '../../types'

interface AircraftContextMenuProps {
  placement: AircraftPlacement
  x: number
  y: number
  onClose: () => void
  onRemove: (id: string) => void
  onStatusChange: (aircraftId: string, status: AircraftStatus) => void
  onSetDispatch: (placementId: string, order: number | null) => void
  nextDispatchOrder: number
}

export function AircraftContextMenu({
  placement,
  x,
  y,
  onClose,
  onRemove,
  onStatusChange,
  onSetDispatch,
  nextDispatchOrder,
}: AircraftContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const ac = placement.aircraft

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (!ac) return null

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000,
    background: 'var(--bg-elevated, #1a1f2e)',
    border: '1px solid var(--border, rgba(255,255,255,0.12))',
    borderRadius: 'var(--radius-md, 6px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    minWidth: 200,
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 12,
    color: 'var(--text-primary, #e2e8f0)',
    overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
    color: 'var(--text-muted, #64748b)',
    fontSize: 11,
  }

  const itemStyle: React.CSSProperties = {
    padding: '7px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background 0.1s',
  }

  const sectionLabelStyle: React.CSSProperties = {
    padding: '6px 12px 2px',
    fontSize: 10,
    color: 'var(--text-muted, #64748b)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
    margin: '4px 0',
  }

  return (
    <div ref={menuRef} style={menuStyle}>
      <div style={headerStyle}>
        <div style={{ fontWeight: 'bold', color: 'var(--text-primary, #e2e8f0)' }}>{ac.tail_number}</div>
        <div style={{ marginTop: 2 }}>{ac.manufacturer} {ac.model}</div>
      </div>

      <div style={sectionLabelStyle}>Status</div>
      {ALL_STATUSES.map(status => {
        const cfg = STATUS_CONFIG[status]
        const isActive = ac.status === status
        return (
          <div
            key={status}
            style={{
              ...itemStyle,
              background: isActive ? 'rgba(255,255,255,0.06)' : undefined,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isActive ? 'rgba(255,255,255,0.06)' : '' }}
            onClick={() => { onStatusChange(ac.id, status); onClose() }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0, display: 'inline-block' }} />
            {cfg.label}
            {isActive && <span style={{ marginLeft: 'auto', color: cfg.color, fontSize: 10 }}>✓</span>}
          </div>
        )
      })}

      <div style={dividerStyle} />
      <div style={sectionLabelStyle}>Dispatch</div>

      {placement.dispatch_order === null ? (
        <div
          style={itemStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '' }}
          onClick={() => { onSetDispatch(placement.id, nextDispatchOrder); onClose() }}
        >
          <span style={{ color: 'rgba(250,204,21,0.8)' }}>＋</span>
          Add to dispatch #{nextDispatchOrder}
        </div>
      ) : (
        <div
          style={itemStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '' }}
          onClick={() => { onSetDispatch(placement.id, null); onClose() }}
        >
          <span style={{ color: 'rgba(248,113,113,0.8)' }}>✕</span>
          Remove from dispatch (#{placement.dispatch_order})
        </div>
      )}

      <div style={dividerStyle} />

      <div
        style={{ ...itemStyle, color: 'rgba(248,113,113,0.85)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(248,113,113,0.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '' }}
        onClick={() => { onRemove(placement.id); onClose() }}
      >
        <span>✕</span>
        Remove from hangar
      </div>
    </div>
  )
}
