import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { searchAircraftTemplates } from '../../lib/aircraftApi'
import { useAppState } from '../../lib/AppContext'
import type { AircraftTemplate, AircraftStatus } from '../../types'
import { STATUS_CONFIG } from '../../lib/constants'

const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID ?? 'demo'

interface AddAircraftModalProps {
  onClose: () => void
  onAdded: () => void
}

export function AddAircraftModal({ onClose, onAdded }: AddAircraftModalProps) {
  const { dispatch } = useAppState()
  const [step, setStep] = useState<'search' | 'details'>('search')
  const [query, setQuery] = useState('')
  const [tailNumber, setTailNumber] = useState('')
  const [results, setResults] = useState<AircraftTemplate[]>([])
  const [selected, setSelected] = useState<AircraftTemplate | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [status, setStatus] = useState<AircraftStatus>('available')
  const [notes, setNotes] = useState('')
  const searchRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(searchRef.current)
    setIsSearching(true)
    searchRef.current = setTimeout(async () => {
      try {
        const res = await searchAircraftTemplates(query)
        setResults(res)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }, [query])

  const handleSelect = (t: AircraftTemplate) => {
    setSelected(t)
    setStep('details')
  }

  const handleSave = async () => {
    if (!tailNumber.trim() || !selected) return
    setIsSaving(true)

    const { data, error } = await supabase
      .from('aircraft')
      .insert({
        workspace_id: WORKSPACE_ID,
        template_id: selected.id,
        tail_number: tailNumber.trim().toUpperCase(),
        manufacturer: selected.manufacturer,
        model: selected.model,
        wingspan_ft: selected.wingspan_ft,
        length_ft: selected.length_ft,
        height_ft: selected.height_ft,
        engine_type: selected.engine_type,
        owner_name: ownerName || null,
        status,
        notes: notes || null,
      })
      .select()
      .single()

    setIsSaving(false)
    if (error) { console.error(error); return }

    dispatch({ type: 'ADD_AIRCRAFT', aircraft: data })
    onAdded()
    onClose()
  }

  const handleCustom = () => {
    // Allow entering custom aircraft without API lookup
    setSelected({
      id: 'custom',
      manufacturer: query.split(' ')[0] ?? '',
      model: query.split(' ').slice(1).join(' ') ?? '',
      engine_type: 'Piston',
      wingspan_ft: 36,
      length_ft: 27,
      height_ft: 9,
      gross_weight_lbs: 2550,
      empty_weight_lbs: 1600,
      max_airspeed_kts: 140,
      cruise_speed_kts: 122,
      range_nm: 640,
      is_custom: true,
      created_at: new Date().toISOString(),
    })
    setStep('details')
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-mid)',
        borderRadius: 'var(--radius-lg)',
        width: 480,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>
              {step === 'search' ? 'Find Aircraft' : `${selected?.manufacturer} ${selected?.model}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {step === 'search' ? 'Search by manufacturer or model' : 'Enter registration details'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
        </div>

        {/* Step: Search */}
        {step === 'search' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
              <input
                autoFocus
                placeholder="e.g. Cessna 172, Cirrus SR22, King Air…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {isSearching && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Searching aircraft database…
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {results.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  style={{
                    width: '100%', padding: '10px 18px',
                    background: 'transparent',
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'left', cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {t.manufacturer} {t.model}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', gap: 12 }}>
                    <span>Span: {t.wingspan_ft}′</span>
                    <span>Length: {t.length_ft}′</span>
                    <span>Height: {t.height_ft}′</span>
                    <span style={{ color: 'var(--text-muted)' }}>{t.engine_type}</span>
                  </div>
                </button>
              ))}

              {query.trim() && !isSearching && results.length === 0 && (
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    No results found for "{query}"
                  </div>
                  <button className="btn btn-ghost" onClick={handleCustom}>
                    Add "{query}" as custom aircraft
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && selected && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
            {/* Dimensions summary */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex', gap: 20,
            }}>
              {[
                ['Wingspan', `${selected.wingspan_ft}′`],
                ['Length', `${selected.length_ft}′`],
                ['Height', `${selected.height_ft}′`],
                ['Engine', selected.engine_type],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            {selected.is_custom && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label>Wingspan (ft)</label>
                  <input
                    type="number"
                    value={selected.wingspan_ft}
                    onChange={e => setSelected({ ...selected, wingspan_ft: +e.target.value })}
                  />
                </div>
                <div>
                  <label>Length (ft)</label>
                  <input
                    type="number"
                    value={selected.length_ft}
                    onChange={e => setSelected({ ...selected, length_ft: +e.target.value })}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label>Tail Number *</label>
              <input
                autoFocus={step === 'details'}
                placeholder="N12345"
                value={tailNumber}
                onChange={e => setTailNumber(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', fontWeight: 600 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Owner / Customer</label>
              <input
                placeholder="Optional"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as AircraftStatus)}>
                {(['available', 'scheduled', 'maintenance', 'grounded', 'dispatch_ready', 'owner_use', 'transient'] as AircraftStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Notes</label>
              <textarea
                rows={2}
                placeholder="Optional notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          {step === 'details' && (
            <button className="btn btn-ghost" onClick={() => setStep('search')}>
              ← Back
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {step === 'details' && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!tailNumber.trim() || isSaving}
            >
              {isSaving ? 'Adding…' : 'Add to Fleet'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
