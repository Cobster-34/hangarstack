import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppState } from '../lib/AppContext'
import { checkClearances } from '../lib/clearance'
import type { Hangar, AircraftPlacement, Aircraft } from '../types'

const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID ?? 'demo'

export function useHangarData() {
  const { state, dispatch, activeHangar } = useAppState()

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    loadHangars()
    loadFleet()
  }, [])

  // ── Load placements when active hangar changes ──────────────────────────────

  useEffect(() => {
    if (state.activeHangarId) loadPlacements(state.activeHangarId)
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

    if (hangars.length > 0 && !state.activeHangarId) {
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
    dispatch({
      type: 'UPDATE_PLACEMENT',
      placement: {
        ...state.placements.find(p => p.id === placementId)!,
        x_ft, y_ft, rotation_deg,
        updated_at: new Date().toISOString(),
      },
    })

    // Debounce the DB write — we optimistically update UI immediately
    await supabase
      .from('aircraft_placements')
      .update({ x_ft, y_ft, rotation_deg, updated_at: new Date().toISOString() })
      .eq('id', placementId)
  }, [state.placements])

  const addAircraftToHangar = useCallback(async (
    aircraftId: string,
    hangarId: string
  ) => {
    const aircraft = state.fleetAircraft.find(a => a.id === aircraftId)
    if (!aircraft || !activeHangar) return

    const newPlacement = {
      hangar_id: hangarId,
      aircraft_id: aircraftId,
      x_ft: activeHangar.width_ft / 2,
      y_ft: activeHangar.depth_ft / 2,
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
  }, [state.fleetAircraft, activeHangar])

  const removePlacement = useCallback(async (placementId: string) => {
    dispatch({ type: 'REMOVE_PLACEMENT', id: placementId })
    await supabase.from('aircraft_placements').delete().eq('id', placementId)
  }, [])

  const updateAircraftStatus = useCallback(async (
    aircraftId: string,
    status: Aircraft['status']
  ) => {
    const aircraft = state.fleetAircraft.find(a => a.id === aircraftId)
    if (!aircraft) return

    const updated = { ...aircraft, status, updated_at: new Date().toISOString() }
    dispatch({ type: 'UPDATE_AIRCRAFT', aircraft: updated })
    await supabase.from('aircraft').update({ status }).eq('id', aircraftId)
  }, [state.fleetAircraft])

  const updateDispatchOrder = useCallback(async (
    placementId: string,
    dispatch_order: number | null
  ) => {
    const placement = state.placements.find(p => p.id === placementId)
    if (!placement) return

    dispatch({
      type: 'UPDATE_PLACEMENT',
      placement: { ...placement, dispatch_order },
    })
    await supabase
      .from('aircraft_placements')
      .update({ dispatch_order })
      .eq('id', placementId)
  }, [state.placements])

  return {
    movePlacement,
    addAircraftToHangar,
    removePlacement,
    updateAircraftStatus,
    updateDispatchOrder,
    reload: loadHangars,
  }
}
