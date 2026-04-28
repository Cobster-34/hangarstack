import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type {
  Hangar, AircraftPlacement, Aircraft, SelectionState, ClearanceViolation,
} from '../types'

// ─── State shape ──────────────────────────────────────────────────────────────

interface AppState {
  hangars: Hangar[]
  activeHangarId: string | null
  placements: AircraftPlacement[]       // placements for active hangar
  fleetAircraft: Aircraft[]             // all aircraft in workspace
  selection: SelectionState
  violations: ClearanceViolation[]
  isLoading: boolean
  isSaving: boolean
  sidebarTab: 'fleet' | 'dispatch' | 'hangars'
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_HANGARS'; hangars: Hangar[] }
  | { type: 'SET_ACTIVE_HANGAR'; id: string }
  | { type: 'SET_PLACEMENTS'; placements: AircraftPlacement[] }
  | { type: 'UPDATE_PLACEMENT'; placement: AircraftPlacement }
  | { type: 'ADD_PLACEMENT'; placement: AircraftPlacement }
  | { type: 'REMOVE_PLACEMENT'; id: string }
  | { type: 'SET_FLEET'; aircraft: Aircraft[] }
  | { type: 'ADD_AIRCRAFT'; aircraft: Aircraft }
  | { type: 'UPDATE_AIRCRAFT'; aircraft: Aircraft }
  | { type: 'SET_SELECTION'; selection: SelectionState }
  | { type: 'SET_VIOLATIONS'; violations: ClearanceViolation[] }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_SAVING'; isSaving: boolean }
  | { type: 'SET_SIDEBAR_TAB'; tab: AppState['sidebarTab'] }
  | { type: 'ADD_HANGAR'; hangar: Hangar }
  | { type: 'UPDATE_HANGAR'; hangar: Hangar }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_HANGARS':
      return { ...state, hangars: action.hangars }
    case 'SET_ACTIVE_HANGAR':
      return { ...state, activeHangarId: action.id, selection: { type: null, id: null } }
    case 'SET_PLACEMENTS':
      return { ...state, placements: action.placements }
    case 'UPDATE_PLACEMENT':
      return {
        ...state,
        placements: state.placements.map(p =>
          p.id === action.placement.id ? action.placement : p
        ),
      }
    case 'ADD_PLACEMENT':
      return { ...state, placements: [...state.placements, action.placement] }
    case 'REMOVE_PLACEMENT':
      return { ...state, placements: state.placements.filter(p => p.id !== action.id) }
    case 'SET_FLEET':
      return { ...state, fleetAircraft: action.aircraft }
    case 'ADD_AIRCRAFT':
      return { ...state, fleetAircraft: [...state.fleetAircraft, action.aircraft] }
    case 'UPDATE_AIRCRAFT':
      return {
        ...state,
        fleetAircraft: state.fleetAircraft.map(a =>
          a.id === action.aircraft.id ? action.aircraft : a
        ),
        // Also update within placements so canvas re-renders correctly
        placements: state.placements.map(p =>
          p.aircraft?.id === action.aircraft.id
            ? { ...p, aircraft: action.aircraft }
            : p
        ),
      }
    case 'SET_SELECTION':
      return { ...state, selection: action.selection }
    case 'SET_VIOLATIONS':
      return { ...state, violations: action.violations }
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading }
    case 'SET_SAVING':
      return { ...state, isSaving: action.isSaving }
    case 'SET_SIDEBAR_TAB':
      return { ...state, sidebarTab: action.tab }
    case 'ADD_HANGAR':
      return { ...state, hangars: [...state.hangars, action.hangar] }
    case 'UPDATE_HANGAR':
      return {
        ...state,
        hangars: state.hangars.map(h => h.id === action.hangar.id ? action.hangar : h),
      }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const initialState: AppState = {
  hangars: [],
  activeHangarId: null,
  placements: [],
  fleetAircraft: [],
  selection: { type: null, id: null },
  violations: [],
  isLoading: true,
  isSaving: false,
  sidebarTab: 'fleet',
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<Action>
  activeHangar: Hangar | null
} | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const activeHangar = state.hangars.find(h => h.id === state.activeHangarId) ?? null

  return (
    <AppContext.Provider value={{ state, dispatch, activeHangar }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
