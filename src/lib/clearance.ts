import type { AircraftPlacement, Hangar, ClearanceViolation } from '../types'

// ─── Geometry helpers ─────────────────────────────────────────────────────────

interface OBB {
  cx: number; cy: number
  hw: number; hd: number  // half-width (wingspan/2), half-depth (length/2)
  angle: number           // radians
}

function placementToOBB(p: AircraftPlacement, clearance: number): OBB {
  return {
    cx: p.x_ft,
    cy: p.y_ft,
    hw: (p.aircraft!.wingspan_ft / 2) + clearance,
    hd: (p.aircraft!.length_ft / 2) + clearance,
    angle: (p.rotation_deg * Math.PI) / 180,
  }
}

// Separating Axis Theorem for two Oriented Bounding Boxes
function obbsOverlap(a: OBB, b: OBB): boolean {
  const axes = [
    { x: Math.cos(a.angle), y: Math.sin(a.angle) },
    { x: -Math.sin(a.angle), y: Math.cos(a.angle) },
    { x: Math.cos(b.angle), y: Math.sin(b.angle) },
    { x: -Math.sin(b.angle), y: Math.cos(b.angle) },
  ]

  const corners = (o: OBB) => {
    const cos = Math.cos(o.angle)
    const sin = Math.sin(o.angle)
    return [
      [o.cx + cos * o.hw - sin * o.hd, o.cy + sin * o.hw + cos * o.hd],
      [o.cx - cos * o.hw - sin * o.hd, o.cy - sin * o.hw + cos * o.hd],
      [o.cx + cos * o.hw + sin * o.hd, o.cy + sin * o.hw - cos * o.hd],
      [o.cx - cos * o.hw + sin * o.hd, o.cy - sin * o.hw - cos * o.hd],
    ]
  }

  const ca = corners(a)
  const cb = corners(b)

  for (const ax of axes) {
    const projA = ca.map(([x, y]) => x * ax.x + y * ax.y)
    const projB = cb.map(([x, y]) => x * ax.x + y * ax.y)
    if (Math.max(...projA) < Math.min(...projB) || Math.max(...projB) < Math.min(...projA)) {
      return false // Separating axis found — no overlap
    }
  }
  return true
}

// ─── Main clearance check ─────────────────────────────────────────────────────

export function checkClearances(
  placements: AircraftPlacement[],
  hangar: Hangar
): ClearanceViolation[] {
  const violations: ClearanceViolation[] = []
  const cl = hangar.clearance_ft

  // 1. Aircraft ↔ Aircraft overlaps (with clearance margin)
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i]
      const b = placements[j]
      if (!a.aircraft || !b.aircraft) continue

      const obbA = placementToOBB(a, cl)
      const obbB = placementToOBB(b, 0)  // clearance applied once on A

      if (obbsOverlap(obbA, obbB)) {
        violations.push({
          type: 'overlap',
          placement_id_a: a.id,
          placement_id_b: b.id,
          message: `${a.aircraft.tail_number} and ${b.aircraft.tail_number} are too close (min ${cl} ft clearance)`,
        })
      }
    }
  }

  // 2. Boundary check — aircraft must fit within hangar walls
  for (const p of placements) {
    if (!p.aircraft) continue
    const obb = placementToOBB(p, 0)
    const cos = Math.cos(obb.angle)
    const sin = Math.sin(obb.angle)

    // Approximate boundary by checking all 4 corners
    const corners = [
      [obb.cx + cos * obb.hw - sin * obb.hd, obb.cy + sin * obb.hw + cos * obb.hd],
      [obb.cx - cos * obb.hw - sin * obb.hd, obb.cy - sin * obb.hw + cos * obb.hd],
      [obb.cx + cos * obb.hw + sin * obb.hd, obb.cy + sin * obb.hw - cos * obb.hd],
      [obb.cx - cos * obb.hw + sin * obb.hd, obb.cy - sin * obb.hw - cos * obb.hd],
    ]

    const outOfBounds = corners.some(
      ([x, y]) => x < 0 || x > hangar.width_ft || y < 0 || y > hangar.depth_ft
    )

    if (outOfBounds) {
      violations.push({
        type: 'boundary',
        placement_id_a: p.id,
        message: `${p.aircraft.tail_number} extends outside hangar boundary`,
      })
    }
  }

  // 3. Door clearance — aircraft within 10 ft of door zone
  for (const door of hangar.doors) {
    for (const p of placements) {
      if (!p.aircraft) continue
      const doorX = door.wall === 'left' ? 0
        : door.wall === 'right' ? hangar.width_ft
        : hangar.width_ft * door.position_pct
      const doorY = door.wall === 'top' ? 0
        : door.wall === 'bottom' ? hangar.depth_ft
        : hangar.depth_ft * door.position_pct

      const dist = Math.hypot(p.x_ft - doorX, p.y_ft - doorY)
      const halfSpan = p.aircraft.wingspan_ft / 2

      if (dist < halfSpan + 5) {
        violations.push({
          type: 'door_blocked',
          placement_id_a: p.id,
          message: `${p.aircraft.tail_number} may block door "${door.label}"`,
        })
      }
    }
  }

  return violations
}

// ─── Pixel ↔ feet conversion ──────────────────────────────────────────────────

export const PIXELS_PER_FOOT = 6  // 6px = 1 ft at 100% zoom

export function ftToPx(ft: number): number {
  return ft * PIXELS_PER_FOOT
}

export function pxToFt(px: number): number {
  return px / PIXELS_PER_FOOT
}
