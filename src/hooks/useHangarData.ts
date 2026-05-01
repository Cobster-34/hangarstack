import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAppState } from '../lib/AppContext'
import { checkClearances } from '../lib/clearance'
import type { Hangar, AircraftPlacement, Aircraft } from '../types'

const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID ?? 'demo'

export function useHangarData() {
  const { state, dispatch, activeHangar } = useAppState()
  const activeHangarIdRef = useRef<string | null>(null)
  const placementsRef = useRef<AircraftPlacement[]>([])
  const fleetRef = useRef<Aircraft[]>([])

  // Keep refs in sync so callbacks don't go stale
  placementsRef.current = state.placements
  fleetRef.current = state.fleetAircraft

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadHangars()
    loadFleet()
  }, [])

  // ── Load placements only when hangar ID actually changes ────────────────────
  useEffect(() => {
    if (!state.activeHangarId) return
    if (state.activeHangarId === activeHangarIdRef.current) return
    activeHangarIdRef.current = state.activeHangarId
    loadPlacements(state.activeHangarId)
  }, [state.activeHangarId])

  // ── Re-check clearances whenever placements change ──────────────────────────
  useEffect(() => {
    if (!activeHangar || !state.placements.length) {
      dispatch({ type: 'SET_VIOLATIONS', violations: [] })
      return
    }
    const violations = checkClearances(state.placements, activeHangar)
    dispatch({ type: 'SET_VIOLATIONS', violations })
  }, [state.placements, activeHangar])

  // ── Loaders ─────────────────────────────────────────────────────────────────
  async function loadHangars() {
    dispatch({ type: 'SET_LOADING', isLoading: true })
    const { data, error } = await supabase
      .from('hangars')
      .select('*')
      .eq('workspace_id', WORKSPACE_ID)
      .order('sort_order')

    if (error) { console.error('loadHangars:', error); return }

    const hangars = (data ?? []) as Hangar[]
    dispatch({ type: 'SET_HANGARS', hangars })

    if (hangars.length > 0 && !activeHangarIdRef.current) {
      dispatch({ type: 'SET_ACTIVE_HANGAR', id: hangars[0].id })
    }
    dispatch({ type: 'SET_LOADING', isLoading: false })
  }

  async function loadFleet() {
    const { data, error } = await supabase
      .from('aircraft')
      .select('*')
      .eq('workspace_id', WORKSPACE_ID)
      .order('tail_number')

    if (error) { console.error('loadFleet:', error); return }
    dispatch({ type: 'SET_FLEET', aircraft: (data ?? []) as Aircraft[] })
  }

  async function loadPlacements(hangarId: string) {
    const { data, error } = await supabase
      .from('aircraft_placements')
      .select('*, aircraft(*)')
      .eq('hangar_id', hangarId)
      .order('dispatch_order', { nullsFirst: false })

    if (error) { console.error('loadPlacements:', error); return }
    dispatch({ type: 'SET_PLACEMENTS', placements: (data ?? []) as AircraftPlacement[] })
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  const movePlacement = useCallback(async (
    placementId: string,
    x_ft: number,
    y_ft: number,
    rotation_deg: number
  ) => {
    // Use ref to avoid stale closure
    const placement = placementsRef.current.find(p => p.id === placementId)
    if (!placement) return

    // Optimistic update
    dispatch({
      type: 'UPDATE_PLACEMENT',
      placement: { ...placement, x_ft, y_ft, rotation_deg, updated_at: new Date().toISOString() },
    })

    // Write to DB — no reload after
    supabase
      .from('aircraft_placements')
      .update({ x_ft, y_ft, rotation_deg, updated_at: new Date().toISOString() })
      .eq('id', placementId)
      .then(({ error }) => {
        if (error) console.error('movePlacement DB error:', error)
      })
  }, [])

  const addAircraftToHangar = useCallback(async (
    aircraftId: string,
    hangarId: string
  ) => {
    const aircraft = fleetRef.current.find(a => a.id === aircraftId)
    // Get hangar from state via ref would be complex — just use center
    const newPlacement = {
      hangar_id: hangarId,
      aircraft_id: aircraftId,
      x_ft: 30,
      y_ft: 30,
      rotation_deg: 0,
      dispatch_order: null,
      departure_time: null,
      return_time: null,
    }

    const { data, error } = await supabase
      .from('aircraft_placements')
      .insert(newPlacement)
      .select('*, aircraft(*)')
      .single()

    if (error) { console.error('addAircraftToHangar:', error); return }
    dispatch({ type: 'ADD_PLACEMENT', placement: data as AircraftPlacement })
  }, [])

  const removePlacement = useCallback(async (placementId: string) => {
    dispatch({ type: 'REMOVE_PLACEMENT', id: placementId })
    supabase.from('aircraft_placements').delete().eq('id', placementId)
      .then(({ error }) => { if (error) console.error('removePlacement:', error) })
  }, [])

  const updateAircraftStatus = useCallback(async (
    aircraftId: string,
    status: Aircraft['status']
  ) => {
    const aircraft = fleetRef.current.find(a => a.id === aircraftId)
    if (!aircraft) return
    const updated = { ...aircraft, status, updated_at: new Date().toISOString() }
    dispatch({ type: 'UPDATE_AIRCRAFT', aircraft: updated })
    supabase.from('aircraft').update({ status }).eq('id', aircraftId)
      .then(({ error }) => { if (error) console.error('updateStatus:', error) })
  }, [])

  const updateDispatchOrder = useCallback(async (
    placementId: string,
    dispatch_order: number | null
  ) => {
    const placement = placementsRef.current.find(p => p.id === placementId)
    if (!placement) return
    dispatch({
      type: 'UPDATE_PLACEMENT',
      placement: { ...placement, dispatch_order },
    })
    supabase.from('aircraft_placements').update({ dispatch_order }).eq('id', placementId)
      .then(({ error }) => { if (error) console.error('updateDispatchOrder:', error) })
  }, [])

  return {
    movePlacement,
    addAircraftToHangar,
    removePlacement,
    updateAircraftStatus,
    updateDispatchOrder,
    reload: loadHangars,
  }
}
