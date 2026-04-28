import { useRef, useCallback, useState } from 'react'
import { Stage, Layer, Rect, Group, Text, Line, Arrow } from 'react-konva'
import type Konva from 'konva'
import { useAppState } from '../../lib/AppContext'
import { ftToPx, pxToFt } from '../../lib/clearance'
import { STATUS_CONFIG } from '../../lib/constants'
import type { AircraftPlacement } from '../../types'

interface HangarCanvasProps {
  onMovePlacement: (id: string, x: number, y: number, rot: number) => void
}

const GRID_FT = 10  // grid lines every 10 ft
const MIN_SCALE = 0.3
const MAX_SCALE = 3

export function HangarCanvas({ onMovePlacement }: HangarCanvasProps) {
  const { state, dispatch, activeHangar } = useAppState()
  const stageRef = useRef<Konva.Stage>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 1 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Resize observer
  const containerCallback = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const ro = new ResizeObserver(([entry]) => {
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    ro.observe(node)
  }, [])

  if (!activeHangar) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
      }}>
        No hangar selected
      </div>
    )
  }

  const W = ftToPx(activeHangar.width_ft)
  const D = ftToPx(activeHangar.depth_ft)

  // ── Wheel zoom ──────────────────────────────────────────────────────────────

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current!
    const pointer = stage.getPointerPosition()!
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const factor = 1 + direction * 0.08
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, transform.scale * factor))
    const mousePointTo = {
      x: (pointer.x - transform.x) / transform.scale,
      y: (pointer.y - transform.y) / transform.scale,
    }
    setTransform({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }

  // ── Stage drag (pan) ────────────────────────────────────────────────────────

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target as Konva.Stage
    setTransform(t => ({ ...t, x: stage.x(), y: stage.y() }))
  }

  // ── Aircraft drag end ───────────────────────────────────────────────────────

  const handleAircraftDragEnd = (e: Konva.KonvaEventObject<DragEvent>, p: AircraftPlacement) => {
    const node = e.target
    const x_ft = pxToFt(node.x())
    const y_ft = pxToFt(node.y())
    onMovePlacement(p.id, x_ft, y_ft, p.rotation_deg)
  }

  const handleAircraftClick = (p: AircraftPlacement) => {
    dispatch({
      type: 'SET_SELECTION',
      selection: { type: 'aircraft', id: p.aircraft_id },
    })
  }

  // ── Grid lines ──────────────────────────────────────────────────────────────

  const gridLines: React.ReactNode[] = []
  for (let x = 0; x <= activeHangar.width_ft; x += GRID_FT) {
    gridLines.push(
      <Line
        key={`gx${x}`}
        points={[ftToPx(x), 0, ftToPx(x), D]}
        stroke={x % 50 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}
        strokeWidth={x % 50 === 0 ? 1 : 0.5}
      />
    )
  }
  for (let y = 0; y <= activeHangar.depth_ft; y += GRID_FT) {
    gridLines.push(
      <Line
        key={`gy${y}`}
        points={[0, ftToPx(y), W, ftToPx(y)]}
        stroke={y % 50 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}
        strokeWidth={y % 50 === 0 ? 1 : 0.5}
      />
    )
  }

  // ── Violation ids for quick lookup ──────────────────────────────────────────

  const violationIds = new Set(
    state.violations.flatMap(v => [v.placement_id_a, v.placement_id_b ?? ''])
  )

  return (
    <div
      ref={containerCallback}
      style={{ flex: 1, overflow: 'hidden', position: 'relative', background: 'var(--bg-base)' }}
    >
      {/* Scale indicator */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '4px 10px',
        fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
      }}>
        {activeHangar.width_ft}′ × {activeHangar.depth_ft}′ · {Math.round(transform.scale * 100)}%
      </div>

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        draggable
        x={transform.x}
        y={transform.y}
        scaleX={transform.scale}
        scaleY={transform.scale}
        onWheel={handleWheel}
        onDragEnd={handleStageDragEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            dispatch({ type: 'SET_SELECTION', selection: { type: null, id: null } })
          }
        }}
      >
        {/* ── Floor layer ──────────────────────────────────────────────────── */}
        <Layer>
          {/* Hangar floor */}
          <Rect
            x={0} y={0} width={W} height={D}
            fill="#111820"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={2}
            cornerRadius={4}
          />
          {/* Grid */}
          {gridLines}

          {/* Dimension label top */}
          <Text
            x={W / 2 - 40} y={-22}
            text={`${activeHangar.width_ft}′ wide`}
            fontSize={11} fill="rgba(255,255,255,0.3)"
            fontFamily="DM Mono, monospace"
          />
          <Text
            x={-60} y={D / 2 - 8}
            text={`${activeHangar.depth_ft}′`}
            fontSize={11} fill="rgba(255,255,255,0.3)"
            fontFamily="DM Mono, monospace"
            rotation={-90}
          />

          {/* Obstructions */}
          {activeHangar.obstructions.map(obs => (
            <Group key={obs.id} x={ftToPx(obs.x_ft)} y={ftToPx(obs.y_ft)} rotation={obs.rotation_deg}>
              <Rect
                width={ftToPx(obs.width_ft)}
                height={ftToPx(obs.height_ft)}
                fill="rgba(251,146,60,0.1)"
                stroke="rgba(251,146,60,0.4)"
                strokeWidth={1}
                dash={[4, 3]}
                cornerRadius={2}
              />
              <Text
                x={4} y={4}
                text={obs.label}
                fontSize={9} fill="rgba(251,146,60,0.7)"
                fontFamily="DM Mono, monospace"
              />
            </Group>
          ))}

          {/* Doors */}
          {activeHangar.doors.map(door => {
            const doorW = ftToPx(door.width_ft)
            let x = 0, y = 0
            if (door.wall === 'top') { x = W * door.position_pct - doorW / 2; y = -4 }
            if (door.wall === 'bottom') { x = W * door.position_pct - doorW / 2; y = D }
            if (door.wall === 'left') { x = -4; y = D * door.position_pct - doorW / 2 }
            if (door.wall === 'right') { x = W; y = D * door.position_pct - doorW / 2 }
            const isHoriz = door.wall === 'top' || door.wall === 'bottom'
            return (
              <Group key={door.id}>
                <Rect
                  x={x} y={y}
                  width={isHoriz ? doorW : 8}
                  height={isHoriz ? 8 : doorW}
                  fill="rgba(96,165,250,0.3)"
                  stroke="rgba(96,165,250,0.8)"
                  strokeWidth={2}
                />
                <Text
                  x={x + 2} y={y - 14}
                  text={`▲ ${door.label}`}
                  fontSize={9} fill="rgba(96,165,250,0.8)"
                  fontFamily="DM Mono, monospace"
                />
              </Group>
            )
          })}
        </Layer>

        {/* ── Aircraft layer ───────────────────────────────────────────────── */}
        <Layer>
          {state.placements.map(p => {
            if (!p.aircraft) return null
            const ac = p.aircraft
            const cfg = STATUS_CONFIG[ac.status]
            const isSelected = state.selection.id === ac.id
            const hasViolation = violationIds.has(p.id)
            const hw = ftToPx(ac.wingspan_ft / 2)
            const hd = ftToPx(ac.length_ft / 2)

            return (
              <Group
                key={p.id}
                x={ftToPx(p.x_ft)}
                y={ftToPx(p.y_ft)}
                rotation={p.rotation_deg}
                draggable
                onClick={() => handleAircraftClick(p)}
                onDragEnd={(e) => handleAircraftDragEnd(e, p)}
              >
                {/* Clearance margin ring */}
                <Rect
                  x={-(hw + ftToPx(activeHangar.clearance_ft))}
                  y={-(hd + ftToPx(activeHangar.clearance_ft))}
                  width={(hw + ftToPx(activeHangar.clearance_ft)) * 2}
                  height={(hd + ftToPx(activeHangar.clearance_ft)) * 2}
                  fill="transparent"
                  stroke={hasViolation ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.04)'}
                  strokeWidth={1}
                  dash={[3, 3]}
                  cornerRadius={2}
                />

                {/* Aircraft footprint */}
                <Rect
                  x={-hw} y={-hd}
                  width={hw * 2}
                  height={hd * 2}
                  fill={hasViolation ? 'rgba(248,113,113,0.15)' : cfg.bgColor}
                  stroke={hasViolation ? 'rgba(248,113,113,0.8)' : cfg.color}
                  strokeWidth={isSelected ? 2 : 1}
                  cornerRadius={3}
                />

                {/* Nose indicator */}
                <Arrow
                  points={[0, -hd + 6, 0, -hd - ftToPx(3)]}
                  pointerLength={5}
                  pointerWidth={5}
                  fill={cfg.color}
                  stroke={cfg.color}
                  strokeWidth={1.5}
                />

                {/* Tail number */}
                <Text
                  text={ac.tail_number}
                  x={-hw + 3}
                  y={-7}
                  fontSize={Math.max(8, Math.min(12, hw / 3))}
                  fill={cfg.color}
                  fontFamily="DM Mono, monospace"
                  fontStyle="500"
                />

                {/* Model */}
                <Text
                  text={`${ac.manufacturer} ${ac.model}`.substring(0, 14)}
                  x={-hw + 3}
                  y={5}
                  fontSize={Math.max(7, Math.min(9, hw / 4))}
                  fill="rgba(255,255,255,0.4)"
                  fontFamily="DM Mono, monospace"
                />

                {/* Dispatch order badge */}
                {p.dispatch_order !== null && (
                  <Group x={hw - 14} y={-hd + 4}>
                    <Rect
                      x={0} y={0} width={14} height={14}
                      fill="rgba(250,204,21,0.9)"
                      cornerRadius={3}
                    />
                    <Text
                      text={String(p.dispatch_order)}
                      x={0} y={1}
                      width={14}
                      align="center"
                      fontSize={9}
                      fill="#000"
                      fontFamily="DM Mono, monospace"
                      fontStyle="bold"
                    />
                  </Group>
                )}

                {/* Selection ring */}
                {isSelected && (
                  <Rect
                    x={-hw - 4} y={-hd - 4}
                    width={hw * 2 + 8}
                    height={hd * 2 + 8}
                    fill="transparent"
                    stroke="rgba(96,165,250,0.6)"
                    strokeWidth={1.5}
                    dash={[4, 3]}
                    cornerRadius={5}
                  />
                )}
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}
