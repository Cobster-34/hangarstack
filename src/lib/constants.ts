import type { AircraftStatus } from '../types'

export const STATUS_CONFIG: Record<
  AircraftStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  available: {
    label: 'Available',
    color: '#4ade80',
    bgColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: 'rgba(74, 222, 128, 0.5)',
  },
  dispatch_ready: {
    label: 'Dispatch Ready',
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.15)',
    borderColor: 'rgba(96, 165, 250, 0.5)',
  },
  scheduled: {
    label: 'Scheduled',
    color: '#facc15',
    bgColor: 'rgba(250, 204, 21, 0.15)',
    borderColor: 'rgba(250, 204, 21, 0.5)',
  },
  maintenance: {
    label: 'Maintenance',
    color: '#fb923c',
    bgColor: 'rgba(251, 146, 60, 0.15)',
    borderColor: 'rgba(251, 146, 60, 0.5)',
  },
  grounded: {
    label: 'Grounded',
    color: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: 'rgba(248, 113, 113, 0.5)',
  },
  owner_use: {
    label: 'Owner Use',
    color: '#a78bfa',
    bgColor: 'rgba(167, 139, 250, 0.15)',
    borderColor: 'rgba(167, 139, 250, 0.5)',
  },
  transient: {
    label: 'Transient',
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: 'rgba(148, 163, 184, 0.5)',
  },
}

export const ALL_STATUSES = Object.keys(STATUS_CONFIG) as AircraftStatus[]
