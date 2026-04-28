import { useState } from 'react'
import { useAppState } from '../../lib/AppContext'
import { STATUS_CONFIG, ALL_STATUSES } from '../../lib/constants'
import type { Aircraft, AircraftStatus } from '../../types'

interface SidebarProps {
  onAddToHangar: (aircraftId: string) => void
  onUpdateStatus: (aircraftId: string, status: AircraftStatus) => void
  onUpdateDispatchOrder: (placementId: string, order: number | null) => void
  onOpenAddAircraft: () => void
}

export function Sidebar({
  onAddToHangar,
  onUpdateStatus,
  onUpdateDispatchOrder,
  onOpenAddAircraft,
}: SidebarProps) {
  const { state, dispatch, activeHangar } = useAppState()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AircraftStatus | 'all'>('all')

  const placedIds = new Set(state.placements.map(p => p.aircraft_id))

  const filteredFleet = state.fleetAircraft.filter(ac => {
    const matchSearch =
      !search ||
      ac.tail_number.toLowerCase().includes(search.toLowerCase()) ||
      `${ac.manufacturer} ${ac.model}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || ac.status === statusFilter
    return matchSearch && matchStatus
  })

  const dispatchList = [...state.placements]
    .filter(p => p.dispatch_order !== null)
    .sort((a, b) => (a.dispatch_order ?? 99) - (b.dispatch_order ?? 99))

  return (
    <div style={{
      width: 'var(--sidebar-width)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-surface)',
      flexShrink: 0,
    }}>
      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        padding: '0 4px',
      }}>
        {(['fleet', 'dispatch', 'hangars'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => dispatch({ type: 'SET_SIDEBAR_TAB', tab })}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'transparent',
              color: state.sidebarTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: state.sidebarTab === tab
                ? '2px solid var(--accent-blue)'
                : '2px solid transparent',
              fontSize: 11,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              transition: 'all 150ms ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Fleet Tab ────────────────────────────────────────────────────────── */}
      {state.sidebarTab === 'fleet' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              placeholder="Search tail # or model…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button
                className="badge"
                onClick={() => setStatusFilter('all')}
                style={{
                  color: statusFilter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderColor: statusFilter === 'all' ? 'var(--border-strong)' : 'var(--border)',
                  background: 'transparent', cursor: 'pointer',
                }}
              >
                All
              </button>
              {ALL_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s]
                return (
                  <button
                    key={s}
                    className="badge"
                    onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                    style={{
                      color: statusFilter === s ? cfg.color : 'var(--text-muted)',
                      borderColor: statusFilter === s ? cfg.color : 'var(--border)',
                      background: statusFilter === s ? cfg.bgColor : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {filteredFleet.length === 0 && (
              <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                {state.fleetAircraft.length === 0
                  ? 'No aircraft in fleet yet.'
                  : 'No aircraft match your filter.'}
              </div>
            )}
            {filteredFleet.map(ac => (
              <AircraftRow
                key={ac.id}
                aircraft={ac}
                isPlaced={placedIds.has(ac.id)}
                isSelected={state.selection.id === ac.id}
                onSelect={() => dispatch({ type: 'SET_SELECTION', selection: { type: 'aircraft', id: ac.id } })}
                onAddToHangar={() => onAddToHangar(ac.id)}
                onStatusChange={(status) => onUpdateStatus(ac.id, status)}
              />
            ))}
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onOpenAddAircraft}>
              + Add Aircraft
            </button>
          </div>
        </div>
      )}

      {/* ── Dispatch Tab ──────────────────────────────────────────────────────── */}
      {state.sidebarTab === 'dispatch' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Morning launch sequence for {activeHangar?.name ?? '—'}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {dispatchList.length === 0 && (
              <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                No aircraft have been assigned a dispatch order yet. Right-click an aircraft on the canvas or use the fleet panel to set departure priority.
              </div>
            )}
            {dispatchList.map((p, idx) => {
              const ac = p.aircraft
              if (!ac) return null
              const cfg = STATUS_CONFIG[ac.status]
              return (
                <div
                  key={p.id}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{
                    width: 22, height: 22,
                    borderRadius: 4,
                    background: 'rgba(250,204,21,0.15)',
                    border: '1px solid rgba(250,204,21,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, color: '#facc15',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: cfg.color }}>
                      {ac.tail_number}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ac.manufacturer} {ac.model}
                    </div>
                    {p.departure_time && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        Departs {new Date(p.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '3px 6px', fontSize: 10 }}
                    onClick={() => onUpdateDispatchOrder(p.id, null)}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>

          {/* Unscheduled in hangar */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Not scheduled
            </div>
            {state.placements
              .filter(p => p.dispatch_order === null && p.aircraft)
              .map(p => {
                const ac = p.aircraft!
                const cfg = STATUS_CONFIG[ac.status]
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: cfg.color, flex: 1 }}>{ac.tail_number}</span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: 10 }}
                      onClick={() => {
                        const nextOrder = dispatchList.length + 1
                        onUpdateDispatchOrder(p.id, nextOrder)
                      }}
                    >
                      + Queue
                    </button>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {/* ── Hangars Tab ───────────────────────────────────────────────────────── */}
      {state.sidebarTab === 'hangars' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {state.hangars.map(hangar => {
            const placed = state.placements.filter(p => p.hangar_id === hangar.id).length
            const isActive = hangar.id === state.activeHangarId
            const areaSqFt = hangar.width_ft * hangar.depth_ft
            return (
              <button
                key={hangar.id}
                onClick={() => dispatch({ type: 'SET_ACTIVE_HANGAR', id: hangar.id })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 500, fontSize: 13 }}>{hangar.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {hangar.width_ft}′ × {hangar.depth_ft}′ · {areaSqFt.toLocaleString()} sq ft
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {isActive ? `${placed} aircraft placed` : ''}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Aircraft row component ───────────────────────────────────────────────────

function AircraftRow({
  aircraft: ac,
  isPlaced,
  isSelected,
  onSelect,
  onAddToHangar,
  onStatusChange,
}: {
  aircraft: Aircraft
  isPlaced: boolean
  isSelected: boolean
  onSelect: () => void
  onAddToHangar: () => void
  onStatusChange: (s: AircraftStatus) => void
}) {
  const [showStatus, setShowStatus] = useState(false)
  const cfg = STATUS_CONFIG[ac.status]

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        borderLeft: isSelected ? '2px solid var(--accent-blue)' : '2px solid transparent',
        background: isSelected ? 'var(--bg-hover)' : 'transparent',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: cfg.color, flexShrink: 0,
          boxShadow: `0 0 6px ${cfg.color}`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>
            {ac.tail_number}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ac.manufacturer} {ac.model}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Status toggle */}
          <button
            className="badge"
            style={{ color: cfg.color, borderColor: cfg.color, background: cfg.bgColor, cursor: 'pointer', fontSize: 9 }}
            onClick={(e) => { e.stopPropagation(); setShowStatus(!showStatus) }}
          >
            {cfg.label}
          </button>

          {/* Add to / placed indicator */}
          {isPlaced ? (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>✓ In</span>
          ) : (
            <button
              className="btn btn-ghost"
              style={{ padding: '2px 6px', fontSize: 10 }}
              onClick={(e) => { e.stopPropagation(); onAddToHangar() }}
            >
              + Place
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 16 }}>
        {ac.wingspan_ft}′ span · {ac.length_ft}′ long · {ac.engine_type}
      </div>

      {/* Status picker dropdown */}
      {showStatus && (
        <div
          style={{
            position: 'absolute', right: 8, top: '100%', zIndex: 100,
            background: 'var(--bg-raised)', border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-md)', padding: 4, minWidth: 140,
          }}
          onClick={e => e.stopPropagation()}
        >
          {ALL_STATUSES.map(s => {
            const c = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => { onStatusChange(s); setShowStatus(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 8px',
                  background: ac.status === s ? c.bgColor : 'transparent',
                  color: c.color,
                  borderRadius: 4, fontSize: 11, cursor: 'pointer',
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
                {c.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
