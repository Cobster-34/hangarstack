import type { ApiNinjasAircraft, AircraftTemplate, EngineType } from '../types'
import { supabase } from './supabase'

const API_NINJAS_KEY = import.meta.env.VITE_API_NINJAS_KEY
const BASE_URL = 'https://api.api-ninjas.com/v1/aircraft'

// ─── Fetch from API Ninjas ────────────────────────────────────────────────────

export async function searchApiNinjas(
  manufacturer: string,
  model?: string
): Promise<ApiNinjasAircraft[]> {
  const params = new URLSearchParams({ manufacturer })
  if (model) params.set('model', model)

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: { 'X-Api-Key': API_NINJAS_KEY },
  })

  if (!res.ok) throw new Error(`API Ninjas error: ${res.status}`)
  return res.json()
}

// ─── Convert API response → our template shape ────────────────────────────────

export function apiNinjasToTemplate(raw: ApiNinjasAircraft): Omit<AircraftTemplate, 'id' | 'created_at'> {
  const engineMap: Record<string, EngineType> = {
    Piston: 'Piston',
    Turboprop: 'Turboprop',
    Propjet: 'Turboprop',
    Jet: 'Jet',
    Electric: 'Electric',
  }

  return {
    manufacturer: raw.manufacturer,
    model: raw.model,
    engine_type: engineMap[raw.engine_type] ?? 'Other',
    wingspan_ft: raw.wingspan_ft,
    length_ft: raw.length_ft,
    height_ft: raw.height_ft,
    gross_weight_lbs: raw.gross_weight_lbs,
    empty_weight_lbs: raw.empty_weight_lbs,
    max_airspeed_kts: raw.max_airspeed_knots ?? null,
    cruise_speed_kts: raw.cruise_speed_knots ?? null,
    range_nm: raw.range_nautical_miles ?? null,
    is_custom: false,
  }
}

// ─── Search templates (local cache first, then live API) ─────────────────────

export async function searchAircraftTemplates(query: string): Promise<AircraftTemplate[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []

  // 1. Search local Supabase cache first
  const { data: cached } = await supabase
    .from('aircraft_templates')
    .select('*')
    .or(`manufacturer.ilike.%${q}%,model.ilike.%${q}%`)
    .order('manufacturer')
    .limit(20)

  if (cached && cached.length > 0) return cached as AircraftTemplate[]

  // 2. Fall back to live API Ninjas search
  try {
    const results = await searchApiNinjas(query)
    const templates = results.map(apiNinjasToTemplate)

    // Auto-cache results so next search is instant
    if (templates.length > 0) {
      await supabase.from('aircraft_templates').upsert(
        templates.map(t => ({ ...t })),
        { onConflict: 'manufacturer,model', ignoreDuplicates: true }
      )
      // Re-fetch with IDs
      const { data: fresh } = await supabase
        .from('aircraft_templates')
        .select('*')
        .or(`manufacturer.ilike.%${q}%,model.ilike.%${q}%`)
        .limit(20)
      return (fresh ?? []) as AircraftTemplate[]
    }
  } catch (err) {
    console.warn('API Ninjas lookup failed, returning cached only:', err)
  }

  return []
}

// ─── FAA N-Number lookup → get make/model → then API Ninjas dims ─────────────

export async function lookupByTailNumber(tailNumber: string): Promise<AircraftTemplate | null> {
  const n = tailNumber.toUpperCase().replace(/^N/, '')

  // FAA AVDATA is a public CSV endpoint — we call a Supabase Edge Function
  // to avoid CORS issues and keep keys server-side
  const { data, error } = await supabase.functions.invoke('faa-lookup', {
    body: { registration: `N${n}` },
  })

  if (error || !data?.manufacturer) return null

  // Now search API Ninjas with what FAA gave us
  const results = await searchApiNinjas(data.manufacturer, data.model)
  if (!results.length) return null

  const template = apiNinjasToTemplate(results[0])

  // Cache it
  const { data: inserted } = await supabase
    .from('aircraft_templates')
    .upsert({ ...template }, { onConflict: 'manufacturer,model', ignoreDuplicates: true })
    .select()
    .single()

  return inserted as AircraftTemplate
}
