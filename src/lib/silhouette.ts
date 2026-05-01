/**
 * Aircraft Silhouette Generator
 * 
 * Generates parametric top-down aircraft silhouettes from wingspan, length,
 * and engine type. All coordinates are in pixels, centered at (0,0) with
 * nose pointing UP (negative Y).
 * 
 * Archetypes:
 *   high_wing_single   - C172, C182, C206
 *   low_wing_single    - Archer, SR22, Bonanza, Mooney
 *   low_wing_twin      - Baron, Seneca, DA42
 *   turboprop_single   - PC-12, TBM, Caravan
 *   turboprop_twin     - King Air series
 *   jet                - Citations, PC-24, Gulfstream
 *   taildragger        - Super Cub, Decathlon, Extra 300
 */

import type { EngineType } from '../types'
import { ftToPx } from './clearance'

export type AircraftArchetype =
  | 'high_wing_single'
  | 'low_wing_single'
  | 'low_wing_twin'
  | 'turboprop_single'
  | 'turboprop_twin'
  | 'jet'
  | 'taildragger'

// ─── Auto-detect archetype from dimensions + engine type ─────────────────────

export function detectArchetype(
  manufacturer: string,
  model: string,
  wingspan_ft: number,
  engine_type: EngineType
): AircraftArchetype {
  const mfr = manufacturer.toLowerCase()
  const mdl = model.toLowerCase()

  // Known taildraggers
  if (
    mdl.includes('cub') ||
    mdl.includes('decathlon') ||
    mdl.includes('extra') ||
    mdl.includes('rv-') ||
    mdl.includes('citabria') ||
    mdl.includes('husky')
  ) return 'taildragger'

  // Jets
  if (engine_type === 'Jet') return 'jet'

  // Turboprops
if (engine_type === 'Turboprop' || engine_type === 'Turboprop') {
    // Twin turboprops have wider wingspan relative to length
    if (wingspan_ft > 50) return 'turboprop_twin'
    return 'turboprop_single'
  }

  // Piston twins — wider wingspan, heavier
  if (
    mdl.includes('baron') ||
    mdl.includes('seneca') ||
    mdl.includes('navajo') ||
    mdl.includes('aztec') ||
    mdl.includes('twin') ||
    mdl.includes('da42') ||
    mdl.includes('da62') ||
    mdl.includes('310') ||
    mdl.includes('337')
  ) return 'low_wing_twin'

  // High wing singles — Cessna singles, Caravan, etc.
  if (
    mfr.includes('cessna') ||
    mdl.includes('caravan') ||
    mdl.includes('skyhawk') ||
    mdl.includes('skylane') ||
    mdl.includes('stationair') ||
    mdl.includes('172') ||
    mdl.includes('182') ||
    mdl.includes('206') ||
    mdl.includes('152') ||
    mdl.includes('162')
  ) return 'high_wing_single'

  // Low wing singles — everything else piston
  return 'low_wing_single'
}

// ─── Shape data returned to canvas ───────────────────────────────────────────

export interface SilhouetteShape {
  // Main fuselage polygon points (flat array: x1,y1,x2,y2,...)
  fuselage: number[]
  // Left wing polygon points
  wingLeft: number[]
  // Right wing polygon points  
  wingRight: number[]
  // Horizontal stabilizer left
  stabLeft: number[]
  // Horizontal stabilizer right
  stabRight: number[]
  // Vertical fin (center)
  fin: number[]
  // Engine nacelles (array of {points} for each engine)
  nacelles: number[][]
  // Prop disc center and radius (piston/turboprop only)
  propDiscs: { x: number; y: number; rx: number; ry: number }[]
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateSilhouette(
  wingspan_ft: number,
  length_ft: number,
  archetype: AircraftArchetype
): SilhouetteShape {
  const ws = ftToPx(wingspan_ft)   // full wingspan in px
  const ln = ftToPx(length_ft)     // full length in px
  const hw = ws / 2                // half wingspan
  const hl = ln / 2                // half length (nose = -hl, tail = +hl)

  switch (archetype) {
    case 'high_wing_single':
      return highWingSingle(hw, hl, ws, ln)
    case 'low_wing_single':
      return lowWingSingle(hw, hl, ws, ln)
    case 'low_wing_twin':
      return lowWingTwin(hw, hl, ws, ln)
    case 'turboprop_single':
      return turbopropSingle(hw, hl, ws, ln)
    case 'turboprop_twin':
      return turbopropTwin(hw, hl, ws, ln)
    case 'jet':
      return jet(hw, hl, ws, ln)
    case 'taildragger':
      return taildragger(hw, hl, ws, ln)
    default:
      return lowWingSingle(hw, hl, ws, ln)
  }
}

// ─── Archetype shape functions ────────────────────────────────────────────────

function highWingSingle(hw: number, hl: number, ws: number, ln: number): SilhouetteShape {
  const fw = ws * 0.10  // fuselage half-width
  const noseY = -hl
  const tailY = hl

  // Rounded fuselage
  const fuselage = [
    0, noseY,                          // nose tip
    fw * 0.7, noseY + ln * 0.06,
    fw, noseY + ln * 0.2,              // widest point
    fw * 0.95, noseY + ln * 0.55,
    fw * 0.85, noseY + ln * 0.75,      // cabin narrows to tail
    fw * 0.5, tailY - ln * 0.08,
    0, tailY,                          // tail tip
    -fw * 0.5, tailY - ln * 0.08,
    -fw * 0.85, noseY + ln * 0.75,
    -fw * 0.95, noseY + ln * 0.55,
    -fw, noseY + ln * 0.2,
    -fw * 0.7, noseY + ln * 0.06,
  ]

  // Straight high wings — mounted at ~35% back from nose
  const wingY = noseY + ln * 0.35
  const wingChord = ln * 0.14
  const wingLeft = [
    -fw, wingY,
    -hw, wingY + wingChord * 0.15,        // swept leading edge
    -hw, wingY + wingChord,
    -fw, wingY + wingChord,
  ]
  const wingRight = [
    fw, wingY,
    hw, wingY + wingChord * 0.15,
    hw, wingY + wingChord,
    fw, wingY + wingChord,
  ]

  // Horizontal stabilizer
  const stabW = hw * 0.32
  const stabY = tailY - ln * 0.12
  const stabChord = ln * 0.07
  const stabLeft = [
    -fw * 0.5, stabY,
    -stabW, stabY + stabChord * 0.2,
    -stabW, stabY + stabChord,
    -fw * 0.5, stabY + stabChord,
  ]
  const stabRight = [
    fw * 0.5, stabY,
    stabW, stabY + stabChord * 0.2,
    stabW, stabY + stabChord,
    fw * 0.5, stabY + stabChord,
  ]

  const fin = [
    0, stabY - ln * 0.01,
    fw * 0.15, stabY + stabChord * 0.5,
    fw * 0.1, stabY + stabChord,
    -fw * 0.1, stabY + stabChord,
    -fw * 0.15, stabY + stabChord * 0.5,
  ]

  // Single prop disc at nose
  const propDiscs = [{ x: 0, y: noseY - ftToPx(0.5), rx: fw * 1.1, ry: ftToPx(0.8) }]

  return { fuselage, wingLeft, wingRight, stabLeft, stabRight, fin, nacelles: [], propDiscs }
}

function lowWingSingle(hw: number, hl: number, ws: number, ln: number): SilhouetteShape {
  const fw = ws * 0.09
  const noseY = -hl
  const tailY = hl

  const fuselage = [
    0, noseY,
    fw * 0.6, noseY + ln * 0.05,
    fw, noseY + ln * 0.18,
    fw * 1.0, noseY + ln * 0.45,
    fw * 0.9, noseY + ln * 0.68,
    fw * 0.55, tailY - ln * 0.1,
    0, tailY,
    -fw * 0.55, tailY - ln * 0.1,
    -fw * 0.9, noseY + ln * 0.68,
    -fw * 1.0, noseY + ln * 0.45,
    -fw, noseY + ln * 0.18,
    -fw * 0.6, noseY + ln * 0.05,
  ]

  // Low swept wings at ~40% back
  const wingY = noseY + ln * 0.40
  const wingChord = ln * 0.16
  const sweep = hw * 0.08
  const wingLeft = [
    -fw, wingY + wingChord * 0.1,
    -hw * 0.85, wingY + sweep,
    -hw, wingY + sweep + wingChord * 0.7,
    -hw * 0.6, wingY + wingChord,
    -fw * 0.8, wingY + wingChord,
  ]
  const wingRight = [
    fw, wingY + wingChord * 0.1,
    hw * 0.85, wingY + sweep,
    hw, wingY + sweep + wingChord * 0.7,
    hw * 0.6, wingY + wingChord,
    fw * 0.8, wingY + wingChord,
  ]

  const stabW = hw * 0.30
  const stabY = tailY - ln * 0.14
  const stabChord = ln * 0.065
  const stabLeft = [
    -fw * 0.45, stabY,
    -stabW, stabY + stabChord * 0.25,
    -stabW * 0.9, stabY + stabChord,
    -fw * 0.45, stabY + stabChord,
  ]
  const stabRight = [
    fw * 0.45, stabY,
    stabW, stabY + stabChord * 0.25,
    stabW * 0.9, stabY + stabChord,
    fw * 0.45, stabY + stabChord,
  ]

  const fin = [
    0, stabY - ln * 0.015,
    fw * 0.18, stabY + stabChord * 0.6,
    fw * 0.12, stabY + stabChord,
    -fw * 0.12, stabY + stabChord,
    -fw * 0.18, stabY + stabChord * 0.6,
  ]

  const propDiscs = [{ x: 0, y: noseY - ftToPx(0.4), rx: fw * 1.05, ry: ftToPx(0.7) }]

  return { fuselage, wingLeft, wingRight, stabLeft, stabRight, fin, nacelles: [], propDiscs }
}

function lowWingTwin(hw: number, hl: number, ws: number, ln: number): SilhouetteShape {
  const fw = ws * 0.085
  const noseY = -hl
  const tailY = hl

  const fuselage = [
    0, noseY,
    fw * 0.65, noseY + ln * 0.06,
    fw, noseY + ln * 0.2,
    fw, noseY + ln * 0.5,
    fw * 0.88, noseY + ln * 0.7,
    fw * 0.5, tailY - ln * 0.08,
    0, tailY,
    -fw * 0.5, tailY - ln * 0.08,
    -fw * 0.88, noseY + ln * 0.7,
    -fw, noseY + ln * 0.5,
    -fw, noseY + ln * 0.2,
    -fw * 0.65, noseY + ln * 0.06,
  ]

  const wingY = noseY + ln * 0.38
  const wingChord = ln * 0.18
  const sweep = hw * 0.06
  const wingLeft = [
    -fw * 0.9, wingY,
    -hw * 0.9, wingY + sweep,
    -hw, wingY + sweep + wingChord * 0.65,
    -hw * 0.65, wingY + wingChord,
    -fw * 0.8, wingY + wingChord,
  ]
  const wingRight = [
    fw * 0.9, wingY,
    hw * 0.9, wingY + sweep,
    hw, wingY + sweep + wingChord * 0.65,
    hw * 0.65, wingY + wingChord,
    fw * 0.8, wingY + wingChord,
  ]

  // Engine nacelles at ~45% span
  const nacelleX = hw * 0.45
  const nacelleW = fw * 0.55
  const nacelleY = wingY - ln * 0.02
  const nacelleLen = ln * 0.22
  const nacelles = [
    // Left engine
    [
      -nacelleX - nacelleW * 0.4, nacelleY,
      -nacelleX + nacelleW * 0.4, nacelleY,
      -nacelleX + nacelleW * 0.5, nacelleY + nacelleLen,
      -nacelleX - nacelleW * 0.5, nacelleY + nacelleLen,
    ],
    // Right engine
    [
      nacelleX - nacelleW * 0.4, nacelleY,
      nacelleX + nacelleW * 0.4, nacelleY,
      nacelleX + nacelleW * 0.5, nacelleY + nacelleLen,
      nacelleX - nacelleW * 0.5, nacelleY + nacelleLen,
    ],
  ]

  const stabW = hw * 0.33
  const stabY = tailY - ln * 0.13
  const stabChord = ln * 0.065
  const stabLeft = [
    -fw * 0.48, stabY,
    -stabW, stabY + stabChord * 0.25,
    -stabW * 0.9, stabY + stabChord,
    -fw * 0.48, stabY + stabChord,
  ]
  const stabRight = [
    fw * 0.48, stabY,
    stabW, stabY + stabChord * 0.25,
    stabW * 0.9, stabY + stabChord,
    fw * 0.48, stabY + stabChord,
  ]

  const fin = [
    0, stabY - ln * 0.015,
    fw * 0.2, stabY + stabChord * 0.55,
    fw * 0.14, stabY + stabChord,
    -fw * 0.14, stabY + stabChord,
    -fw * 0.2, stabY + stabChord * 0.55,
  ]

  const propDiscs = [
    { x: -nacelleX, y: nacelleY - ftToPx(0.5), rx: nacelleW * 0.9, ry: ftToPx(0.7) },
    { x: nacelleX, y: nacelleY - ftToPx(0.5), rx: nacelleW * 0.9, ry: ftToPx(0.7) },
  ]

  return { fuselage, wingLeft, wingRight, stabLeft, stabRight, fin, nacelles, propDiscs }
}

function turbopropSingle(hw: number, hl: number, ws: number, ln: number): SilhouetteShape {
  const fw = ws * 0.085
  const noseY = -hl
  const tailY = hl

  // Long pointed nose characteristic of turboprops
  const fuselage = [
    0, noseY,                           // nose tip (very pointed)
    fw * 0.3, noseY + ln * 0.08,
    fw * 0.75, noseY + ln * 0.22,
    fw, noseY + ln * 0.38,
    fw * 0.95, noseY + ln * 0.6,
    fw * 0.72, tailY - ln * 0.1,
    0, tailY,
    -fw * 0.72, tailY - ln * 0.1,
    -fw * 0.95, noseY + ln * 0.6,
    -fw, noseY + ln * 0.38,
    -fw * 0.75, noseY + ln * 0.22,
    -fw * 0.3, noseY + ln * 0.08,
  ]

  const wingY = noseY + ln * 0.42
  const wingChord = ln * 0.17
  const sweep = hw * 0.05
  const wingLeft = [
    -fw * 0.95, wingY,
    -hw * 0.88, wingY + sweep,
    -hw, wingY + sweep + wingChord * 0.7,
    -hw * 0.6, wingY + wingChord,
    -fw * 0.85, wingY + wingChord,
  ]
  const wingRight = [
    fw * 0.95, wingY,
    hw * 0.88, wingY + sweep,
    hw, wingY + sweep + wingChord * 0.7,
    hw * 0.6, wingY + wingChord,
    fw * 0.85, wingY + wingChord,
  ]

  const stabW = hw * 0.32
  const stabY = tailY - ln * 0.13
  const stabChord = ln * 0.07
  const stabLeft = [
    -fw * 0.48, stabY,
    -stabW, stabY + stabChord * 0.3,
    -stabW * 0.88, stabY + stabChord,
    -fw * 0.48, stabY + stabChord,
  ]
  const stabRight = [
    fw * 0.48, stabY,
    stabW, stabY + stabChord * 0.3,
    stabW * 0.88, stabY + stabChord,
    fw * 0.48, stabY + stabChord,
  ]

  const fin = [
    0, stabY - ln * 0.02,
    fw * 0.22, stabY + stabChord * 0.5,
    fw * 0.15, stabY + stabChord,
    -fw * 0.15, stabY + stabChord,
    -fw * 0.22, stabY + stabChord * 0.5,
  ]

  // Large single prop disc
  const propDiscs = [{ x: 0, y: noseY - ftToPx(0.3), rx: fw * 1.4, ry: ftToPx(0.8) }]

  return { fuselage, wingLeft, wingRight, stabLeft, stabRight, fin, nacelles: [], propDiscs }
}

function turbopropTwin(hw: number, hl: number, ws: number, ln: number): SilhouetteShape {
  const fw = ws * 0.075
  const noseY = -hl
  const tailY = hl

  const fuselage = [
    0, noseY,
    fw * 0.55, noseY + ln * 0.07,
    fw, noseY + ln * 0.22,
    fw, noseY + ln * 0.52,
    fw * 0.88, noseY + ln * 0.72,
    fw * 0.52, tailY - ln * 0.08,
    0, tailY,
    -fw * 0.52, tailY - ln * 0.08,
    -fw * 0.88, noseY + ln * 0.72,
    -fw, noseY + ln * 0.52,
    -fw, noseY + ln * 0.22,
    -fw * 0.55, noseY + ln * 0.07,
  ]

  const wingY = noseY + ln * 0.40
  const wingChord = ln * 0.19
  const sweep = hw * 0.04
  const wingLeft = [
    -fw * 0.9, wingY,
    -hw * 0.88, wingY + sweep,
    -hw, wingY + sweep + wingChord * 0.68,
    -hw * 0.68, wingY + wingChord,
    -fw * 0.82, wingY + wingChord,
  ]
  const wingRight = [
    fw * 0.9, wingY,
    hw * 0.88, wingY + sweep,
    hw, wingY + sweep + wingChord * 0.68,
    hw * 0.68, wingY + wingChord,
    fw * 0.82, wingY + wingChord,
  ]

  // Large turboprop nacelles
  const nacelleX = hw * 0.40
  const nacelleW = fw * 0.65
  const nacelleY = wingY - ln * 0.04
  const nacelleLen = ln * 0.26
  const nacelles = [
    [
      -nacelleX - nacelleW * 0.35, nacelleY,
      -nacelleX + nacelleW * 0.35, nacelleY,
      -nacelleX + nacelleW * 0.45, nacelleY + nacelleLen,
      -nacelleX - nacelleW * 0.45, nacelleY + nacelleLen,
    ],
    [
      nacelleX - nacelleW * 0.35, nacelleY,
      nacelleX + nacelleW * 0.35, nacelleY,
      nacelleX + nacelleW * 0.45, nacelleY + nacelleLen,
      nacelleX - nacelleW * 0.45, nacelleY + nacelleLen,
    ],
  ]

  // T-tail horizontal stabilizer (at top of fin)
  const stabW = hw * 0.35
  const stabY = tailY - ln * 0.14
  const stabChord = ln * 0.07
  const stabLeft = [
    -fw * 0.5, stabY,
    -stabW, stabY + stabChord * 0.28,
    -stabW * 0.9, stabY + stabChord,
    -fw * 0.5, stabY + stabChord,
  ]
  const stabRight = [
    fw * 0.5, stabY,
    stabW, stabY + stabChord * 0.28,
    stabW * 0.9, stabY + stabChord,
    fw * 0.5, stabY + stabChord,
  ]

  const fin = [
    0, stabY - ln * 0.025,
    fw * 0.22, stabY + stabChord * 0.55,
    fw * 0.16, stabY + stabChord,
    -fw * 0.16, stabY + stabChord,
    -fw * 0.22, stabY + stabChord * 0.55,
  ]

  const propDiscs = [
    { x: -nacelleX, y: nacelleY - ftToPx(0.4), rx: nacelleW * 1.05, ry: ftToPx(0.75) },
    { x: nacelleX, y: nacelleY - ftToPx(0.4), rx: nacelleW * 1.05, ry: ftToPx(0.75) },
  ]

  return { fuselage, wingLeft, wingRight, stabLeft, stabRight, fin, nacelles, propDiscs }
}

function jet(hw: number, hl: number, ws: number, ln: number): SilhouetteShape {
  const fw = ws * 0.07
  const noseY = -hl
  const tailY = hl

  // Slender jet fuselage with pointed nose
  const fuselage = [
    0, noseY,
    fw * 0.35, noseY + ln * 0.07,
    fw * 0.8, noseY + ln * 0.2,
    fw, noseY + ln * 0.35,
    fw, noseY + ln * 0.58,
    fw * 0.82, noseY + ln * 0.75,
    fw * 0.48, tailY - ln * 0.06,
    0, tailY,
    -fw * 0.48, tailY - ln * 0.06,
    -fw * 0.82, noseY + ln * 0.75,
    -fw, noseY + ln * 0.58,
    -fw, noseY + ln * 0.35,
    -fw * 0.8, noseY + ln * 0.2,
    -fw * 0.35, noseY + ln * 0.07,
  ]

  // Swept wings
  const wingY = noseY + ln * 0.38
  const wingChord = ln * 0.20
  const sweep = hw * 0.22  // significant sweep
  const taper = 0.38       // tip chord is 38% of root chord
  const wingLeft = [
    -fw * 0.88, wingY + wingChord * 0.05,
    -hw, wingY + sweep + wingChord * taper * 0.5,
    -hw * 0.85, wingY + sweep + wingChord * taper,
    -fw * 0.75, wingY + wingChord,
  ]
  const wingRight = [
    fw * 0.88, wingY + wingChord * 0.05,
    hw, wingY + sweep + wingChord * taper * 0.5,
    hw * 0.85, wingY + sweep + wingChord * taper,
    fw * 0.75, wingY + wingChord,
  ]

  // Swept tail
  const stabW = hw * 0.30
  const stabY = tailY - ln * 0.12
  const stabChord = ln * 0.068
  const stabSweep = stabW * 0.15
  const stabLeft = [
    -fw * 0.42, stabY,
    -stabW, stabY + stabSweep + stabChord * 0.3,
    -stabW * 0.88, stabY + stabSweep + stabChord,
    -fw * 0.42, stabY + stabChord,
  ]
  const stabRight = [
    fw * 0.42, stabY,
    stabW, stabY + stabSweep + stabChord * 0.3,
    stabW * 0.88, stabY + stabSweep + stabChord,
    fw * 0.42, stabY + stabChord,
  ]

  const fin = [
    0, stabY - ln * 0.025,
    fw * 0.25, stabY + stabChord * 0.5,
    fw * 0.18, stabY + stabChord,
    -fw * 0.18, stabY + stabChord,
    -fw * 0.25, stabY + stabChord * 0.5,
  ]

  // No props on jets
  return { fuselage, wingLeft, wingRight, stabLeft, stabRight, fin, nacelles: [], propDiscs: [] }
}

function taildragger(hw: number, hl: number, ws: number, ln: number): SilhouetteShape {
  const fw = ws * 0.075  // narrow fuselage
  const noseY = -hl
  const tailY = hl

  // Round cowl, narrow fuselage, tapers sharply at tail
  const fuselage = [
    0, noseY,
    fw * 0.8, noseY + ln * 0.06,
    fw, noseY + ln * 0.16,
    fw * 0.95, noseY + ln * 0.38,
    fw * 0.72, noseY + ln * 0.62,
    fw * 0.35, tailY - ln * 0.06,
    0, tailY,
    -fw * 0.35, tailY - ln * 0.06,
    -fw * 0.72, noseY + ln * 0.62,
    -fw * 0.95, noseY + ln * 0.38,
    -fw, noseY + ln * 0.16,
    -fw * 0.8, noseY + ln * 0.06,
  ]

  // Straight wings, typically strut-braced — at ~28% back
  const wingY = noseY + ln * 0.28
  const wingChord = ln * 0.13
  const wingLeft = [
    -fw * 0.9, wingY,
    -hw, wingY + wingChord * 0.1,
    -hw, wingY + wingChord,
    -fw * 0.9, wingY + wingChord,
  ]
  const wingRight = [
    fw * 0.9, wingY,
    hw, wingY + wingChord * 0.1,
    hw, wingY + wingChord,
    fw * 0.9, wingY + wingChord,
  ]

  const stabW = hw * 0.28
  const stabY = tailY - ln * 0.10
  const stabChord = ln * 0.06
  const stabLeft = [
    -fw * 0.35, stabY,
    -stabW, stabY + stabChord * 0.2,
    -stabW, stabY + stabChord,
    -fw * 0.35, stabY + stabChord,
  ]
  const stabRight = [
    fw * 0.35, stabY,
    stabW, stabY + stabChord * 0.2,
    stabW, stabY + stabChord,
    fw * 0.35, stabY + stabChord,
  ]

  const fin = [
    0, stabY - ln * 0.02,
    fw * 0.2, stabY + stabChord * 0.5,
    fw * 0.12, stabY + stabChord,
    -fw * 0.12, stabY + stabChord,
    -fw * 0.2, stabY + stabChord * 0.5,
  ]

  // Large prop disc relative to fuselage
  const propDiscs = [{ x: 0, y: noseY - ftToPx(0.5), rx: fw * 1.25, ry: ftToPx(0.75) }]

  return { fuselage, wingLeft, wingRight, stabLeft, stabRight, fin, nacelles: [], propDiscs }
}
// updated
