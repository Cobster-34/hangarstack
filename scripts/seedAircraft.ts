/**
 * HangarStack — Aircraft Seeding Script
 * 
 * Seeds your Supabase aircraft_templates table with the most common
 * GA aircraft using the API Ninjas aircraft endpoint.
 * 
 * Usage:
 *   cp .env.example .env.local
 *   # fill in VITE_API_NINJAS_KEY and VITE_SUPABASE_* values
 *   npm run seed
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

// Load env
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env'
dotenv.config({ path: envFile })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY!
const API_KEY = process.env.VITE_API_NINJAS_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
  console.error('❌  Missing environment variables. Check your .env.local file.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Aircraft to seed ─────────────────────────────────────────────────────────
// Format: [manufacturer, model]
// These cover the vast majority of GA flight school and FBO fleets.

const SEED_LIST: [string, string][] = [
  // Cessna Singles
  ['Cessna', '172 Skyhawk'],
  ['Cessna', '182 Skylane'],
  ['Cessna', '206 Stationair'],
  ['Cessna', '152'],
  ['Cessna', '162 Skycatcher'],
  // Cessna Twins
  ['Cessna', '310'],
  ['Cessna', '337 Skymaster'],
  // Cessna Jets
  ['Cessna', 'Citation CJ3'],
  ['Cessna', 'Citation CJ4'],
  ['Cessna', 'Citation Latitude'],
  // Piper Singles
  ['Piper', 'Cherokee'],
  ['Piper', 'Archer'],
  ['Piper', 'Arrow'],
  ['Piper', 'Warrior'],
  ['Piper', 'Comanche'],
  ['Piper', 'Super Cub'],
  // Piper Twins
  ['Piper', 'Seneca'],
  ['Piper', 'Navajo'],
  ['Piper', 'Aztec'],
  // Cirrus
  ['Cirrus', 'SR20'],
  ['Cirrus', 'SR22'],
  ['Cirrus', 'SR22T'],
  ['Cirrus', 'Vision SF50'],
  // Beechcraft
  ['Beechcraft', 'Bonanza G36'],
  ['Beechcraft', 'Baron 58'],
  ['Beechcraft', 'King Air C90'],
  ['Beechcraft', 'King Air 200'],
  ['Beechcraft', 'King Air 350'],
  // Mooney
  ['Mooney', 'M20 Ovation'],
  ['Mooney', 'M20 Acclaim'],
  // Diamond
  ['Diamond', 'DA40'],
  ['Diamond', 'DA42'],
  ['Diamond', 'DA62'],
  // Socata / TBM
  ['Socata', 'TBM 700'],
  ['Socata', 'TBM 850'],
  ['Socata', 'TBM 900'],
  ['Socata', 'TBM 930'],
  // Pilatus
  ['Pilatus', 'PC-12'],
  ['Pilatus', 'PC-24'],
  // American Champion
  ['American Champion', 'Decathlon'],
  ['American Champion', 'Super Decathlon'],
  // Extra
  ['Extra', '300'],
  ['Extra', '330'],
  // Van's Aircraft
  ["Van's Aircraft", 'RV-7'],
  ["Van's Aircraft", 'RV-10'],
  // Tecnam
  ['Tecnam', 'P2006T'],
  ['Tecnam', 'P2010'],
  // Cessna Caravan
  ['Cessna', '208 Caravan'],
  // Daher
  ['Daher', 'TBM 940'],
  ['Daher', 'TBM 960'],
  // Pipistrel
  ['Pipistrel', 'Alpha Electro'],
  // Gulfstream (for FBOs)
  ['Gulfstream', 'G550'],
  ['Gulfstream', 'G650'],
]

// ─── API Ninjas fetch ─────────────────────────────────────────────────────────

interface ApiNinjasAircraft {
  manufacturer: string
  model: string
  engine_type: string
  wingspan_ft: number
  length_ft: number
  height_ft: number
  gross_weight_lbs: number
  empty_weight_lbs: number
  max_airspeed_knots: number
  cruise_speed_knots: number
  range_nautical_miles: number
}

async function fetchAircraft(manufacturer: string, model: string): Promise<ApiNinjasAircraft[]> {
  const params = new URLSearchParams({ manufacturer, model })
  const res = await fetch(`https://api.api-ninjas.com/v1/aircraft?${params}`, {
    headers: { 'X-Api-Key': API_KEY },
  })
  if (!res.ok) {
    console.warn(`  ⚠  API error ${res.status} for ${manufacturer} ${model}`)
    return []
  }
  return res.json()
}

function mapEngineType(raw: string): string {
  const map: Record<string, string> = {
    Piston: 'Piston', Turboprop: 'Turboprop',
    Propjet: 'Turboprop', Jet: 'Jet', Electric: 'Electric',
  }
  return map[raw] ?? 'Other'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🛫  HangarStack — Aircraft Template Seeding')
  console.log(`    Source: API Ninjas | Target: Supabase`)
  console.log(`    Aircraft to attempt: ${SEED_LIST.length}\n`)

  let seeded = 0
  let skipped = 0
  let failed = 0

  for (const [manufacturer, model] of SEED_LIST) {
    process.stdout.write(`  • ${manufacturer} ${model}… `)

    try {
      const results = await fetchAircraft(manufacturer, model)

      if (!results.length) {
        console.log('not found')
        skipped++
        continue
      }

      const r = results[0]

      if (!r.wingspan_ft || !r.length_ft) {
        console.log('missing dimensions, skipped')
        skipped++
        continue
      }

      const template = {
        manufacturer: r.manufacturer || manufacturer,
        model: r.model || model,
        engine_type: mapEngineType(r.engine_type),
        wingspan_ft: r.wingspan_ft,
        length_ft: r.length_ft,
        height_ft: r.height_ft || 0,
        gross_weight_lbs: r.gross_weight_lbs || null,
        empty_weight_lbs: r.empty_weight_lbs || null,
        max_airspeed_kts: r.max_airspeed_knots || null,
        cruise_speed_kts: r.cruise_speed_knots || null,
        range_nm: r.range_nautical_miles || null,
        is_custom: false,
      }

      const { error } = await supabase
        .from('aircraft_templates')
        .upsert(template, { onConflict: 'manufacturer,model', ignoreDuplicates: true })

      if (error) {
        console.log(`DB error: ${error.message}`)
        failed++
      } else {
        console.log(`✓  ${r.wingspan_ft}′ span / ${r.length_ft}′ length`)
        seeded++
      }

      // Respect API rate limits — 50ms between calls
      await new Promise(r => setTimeout(r, 50))
    } catch (err) {
      console.log(`error: ${err}`)
      failed++
    }
  }

  console.log(`\n✅  Done!`)
  console.log(`    Seeded:  ${seeded}`)
  console.log(`    Skipped: ${skipped} (not in API)`)
  console.log(`    Failed:  ${failed}`)
  console.log(`\n    You can now search these aircraft in HangarStack without hitting the live API.`)
}

seed().catch(console.error)
