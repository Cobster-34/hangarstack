// ─── Aircraft Types ──────────────────────────────────────────────────────────

export type EngineType = 'Piston' | 'Turboprop' | 'Jet' | 'Electric' | 'Other'

export type WeightClass = 'light' | 'medium' | 'heavy' | 'super'

export type AircraftStatus =
  | 'available'
  | 'scheduled'
  | 'maintenance'
  | 'grounded'
  | 'dispatch_ready'
  | 'owner_use'
  | 'transient'

// Template from API Ninjas or local seed — no hangar-specific data
export interface AircraftTemplate {
  id: string
  manufacturer: string
  model: string
  engine_type: EngineType
  wingspan_ft: number
  length_ft: number
  height_ft: number
  gross_weight_lbs: number
  empty_weight_lbs: number
  max_airspeed_kts: number | null
  cruise_speed_kts: number | null
  range_nm: number | null
  is_custom: boolean
  created_at: string
}

// A real aircraft in a user's fleet — references a template, adds ops data
export interface Aircraft {
  id: string
  workspace_id: string
  template_id: string | null
  tail_number: string
  callsign: string | null
  owner_name: string | null
  owner_contact: string | null
  status: AircraftStatus
  notes: string | null
  // Resolved from template (or overridden for custom)
  manufacturer: string
  model: string
  wingspan_ft: number
  length_ft: number
  height_ft: number
  engine_type: EngineType
  created_at: string
  updated_at: string
}

// ─── Hangar Types ─────────────────────────────────────────────────────────────

export type ObstructionType = 'column' | 'toolbox' | 'office' | 'no_park' | 'wall' | 'other'

export interface HangarDoor {
  id: string
  // Position as fraction of the wall (0–1), wall: 'top'|'bottom'|'left'|'right'
  wall: 'top' | 'bottom' | 'left' | 'right'
  position_pct: number   // 0.0–1.0 along that wall
  width_ft: number
  height_ft: number
  label: string
}

export interface HangarObstruction {
  id: string
  type: ObstructionType
  label: string
  x_ft: number
  y_ft: number
  width_ft: number
  height_ft: number
  rotation_deg: number
}

export interface Hangar {
  id: string
  workspace_id: string
  name: string
  width_ft: number
  depth_ft: number
  // polygon points in feet — for simple rectangles this can be derived
  // from width/depth; non-rectangular hangars override this
  polygon_pts: { x: number; y: number }[] | null
  doors: HangarDoor[]
  obstructions: HangarObstruction[]
  clearance_ft: number  // required wingtip clearance, default 3
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Placement Types ─────────────────────────────────────────────────────────

// Where an aircraft sits in a specific hangar right now
export interface AircraftPlacement {
  id: string
  hangar_id: string
  aircraft_id: string
  x_ft: number          // center-x in hangar coordinate space
  y_ft: number          // center-y in hangar coordinate space
  rotation_deg: number  // 0 = nose pointing up (toward top of canvas)
  dispatch_order: number | null  // 1 = departs first, null = no schedule
  departure_time: string | null  // ISO string
  return_time: string | null
  updated_at: string
  // Joined fields
  aircraft?: Aircraft
}

export interface ClearanceViolation {
  type: 'overlap' | 'door_blocked' | 'obstruction' | 'boundary'
  placement_id_a: string
  placement_id_b?: string
  message: string
}

// ─── Workspace / Auth Types ───────────────────────────────────────────────────

export type UserRole = 'admin' | 'dispatcher' | 'viewer'

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: UserRole
  email: string
  full_name: string | null
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  airport_code: string | null
  created_at: string
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface CanvasTransform {
  x: number
  y: number
  scale: number
}

export interface DragState {
  isDragging: boolean
  placementId: string | null
}

export interface SelectionState {
  type: 'aircraft' | 'obstruction' | null
  id: string | null
}

// ─── API Types ────────────────────────────────────────────────────────────────

// Raw response shape from API Ninjas aircraft endpoint
export interface ApiNinjasAircraft {
  manufacturer: string
  model: string
  engine_type: string
  engine_thrust_lb_ft: number
  max_airspeed_knots: number
  cruise_speed_knots: number
  service_ceiling_ft: number
  takeoff_ground_run_ft: number
  landing_ground_roll_ft: number
  gross_weight_lbs: number
  empty_weight_lbs: number
  length_ft: number
  height_ft: number
  wingspan_ft: number
  range_nautical_miles: number
}
