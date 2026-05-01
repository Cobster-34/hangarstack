import { useRef, useCallback, useState } from 'react'
import { Stage, Layer, Rect, Group, Text, Line, Ellipse, Shape } from 'react-konva'
import type Konva from 'konva'
import { useAppState } from '../../lib/AppContext'
import { ftToPx, pxToFt } from '../../lib/clearance'
import { STATUS_CONFIG } from '../../lib/constants'
import { generateSilhouette, detectArchetype } from '../../lib/silhouette'
import { AircraftContextMenu } from './AircraftContextMenu'
import type { AircraftPlacement, AircraftStatus } from '../../types'

interface HangarCanvasProps {
  onMovePlacement: (id: string, x: number, y: number, rot: number) => void
  onRemovePlacement: (id: string) => void
  onUpdateStatus: (aircraftId: string, status: AircraftStatus) => void
  onUpdateDispatchOrder: (placementId: string, order: number | null) => void
}

const GRID_FT = 10
const MIN_SCALE = 0.2
const MAX_SCALE = 4

export function HangarCanvas({ onMovePlacement, onRemovePlacement, onUpdateStatus, onUpdateDispatchOrder }: HangarCanvasProps) {
  const { state, dispatch, activeHangar } = useAppState()
  const stageRef = useRef<Konva.Stage>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 1 })
  const [rotatingId, setRotatingId] = useState<string | null>(null)
  const rotStartAngle = useRef<number>(0)
  const rotStartRot = useRef<number>(0)
  const [contextMenu, setContextMenu] = useState<{
    placement: AircraftPlacement; x: number; y: number
  } | null>(null)

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

  const handleAircraftDragEnd = (e: Konva.KonvaEventObject<DragEvent>, p: AircraftPlacement) => {
    e.cancelBubble = true
    const node = e.target
    onMovePlacement(p.id, pxToFt(node.x()), pxToFt(node.y()), p.rotation_deg)
  }

  const handleAircraftClick = (p: AircraftPlacement) => {
    setContextMenu(null)
    dispatch({ type: 'SET_SELECTION', selection: { type: 'aircraft', id: p.aircraft_id } })
  }

  const handleAircraftRightClick = (e: Konva.KonvaEventObject<PointerEvent>, p: AircraftPlacement) => {
    e.evt.preventDefault()
    setContextMenu({ placement: p, x: e.evt.clientX, y: e.evt.clientY })
    dispatch({ type: 'SET_SELECTION', selection: { type: 'aircraft', id: p.aircraft_id } })
  }

  const handleRotateStart = (e: Konva.KonvaEventObject<MouseEvent>, p: AircraftPlacement) => {
    e.cancelBubble = true
    setRotatingId(p.id)
    const stage = stageRef.current!
    const pos = stage.getPointerPosition()!
    const placementPx = {
      x: ftToPx(p.x_ft) * transform.scale + transform.x,
      y: ftToPx(p.y_ft) * transform.scale + transform.y,
    }
    rotStartAngle.current = Math.atan2(pos.y - placementPx.y, pos.x - placementPx.x) * 180 / Math.PI
    rotStartRot.current = p.rotation_deg
  }

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (rotatingId) {
      const stage = stageRef.current!
      const pos = stage.getPointerPosition()!
      const placement = state.placements.find(p => p.id === rotatingId)
      if (!placement) return
      const placementPx = {
        x: ftToPx(placement.x_ft) * transform.scale + transform.x,
        y: ftToPx(placement.y_ft) * transform.scale + transform.y,
      }
      const currentAngle = Math.atan2(pos.y - placementPx.y, pos.x - placementPx.x) * 180 / Math.PI
      let newRot = rotStartRot.current + (currentAngle - rotStartAngle.current)
      if (e.evt.shiftKey) newRot = Math.round(newRot / 15) * 15
      dispatch({
        type: 'UPDATE_PLACEMENT',
        placement: { ...placement, rotation_deg: newRot },
      })
      return
    }
    if (isPanning.current) {
      const dx = e.evt.clientX - panStart.current.x
      const dy = e.evt.clientY - panStart.current.y
      setTransform(t => ({ ...t, x: panStart.current.tx + dx, y: panStart.current.ty + dy }))
    }
  }

  const handleStageMouseUp = () => {
    isPanning.current = false
    if (!rotatingId) return
    const placement = state.placements.find(p => p.id === rotatingId)
    if (placement) onMovePlacement(placement.id, placement.x_ft, placement.y_ft, placement.rotation_deg)
    setRotatingId(null)
  }

  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only pan when clicking directly on the stage background, not on aircraft
    if (e.target !== stageRef.current) return
    isPanning.current = true
    panStart.current = {
      x: e.evt.clientX,
      y: e.evt.clientY,
      tx: transform.x,
      ty: transform.y,
    }
  }
  for (let x = 0; x <= activeHangar.width_ft; x += GRID_FT) {
    gridLines.push(
      <Line key={`gx${x}`}
        points={[ftToPx(x), 0, ftToPx(x), D]}
        stroke={x % 50 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}
        strokeWidth={x % 50 === 0 ? 1 : 0.5}
      />
    )
  }
  for (let y = 0; y <= activeHangar.depth_ft; y += GRID_FT) {
    gridLines.push(
      <Line key={`gy${y}`}
        points={[0, ftToPx(y), W, ftToPx(y)]}
        stroke={y % 50 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}
        strokeWidth={y % 50 === 0 ? 1 : 0.5}
      />
    )
  }

  const violationIds = new Set(
    state.violations.flatMap(v => [v.placement_id_a, v.placement_id_b ?? ''])
  )

  const nextDispatchOrder = Math.max(0, ...state.placements.map(p => p.dispatch_order ?? 0)) + 1

  return (
    <div
      ref={containerCallback}
      style={{
        flex: 1, overflow: 'hidden', position: 'relative',
        background: 'var(--bg-base)',
        cursor: rotatingId ? 'crosshair' : isPanning.current ? 'grabbing' : 'grab',
      }}
    >
      {/* Scale indicator */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '4px 12px',
        fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <span>{activeHangar.width_ft}′ × {activeHangar.depth_ft}′</span>
        <span style={{ color: 'var(--border-strong)' }}>·</span>
        <span>{Math.round(transform.scale * 100)}%</span>
        <span style={{ color: 'var(--border-strong)' }}>·</span>
        <span style={{ color: 'var(--text-muted)' }}>scroll=zoom · drag=pan · right-click=menu · drag ↻=rotate · ⇧=snap</span>
      </div>

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={transform.x}
        y={transform.y}
        scaleX={transform.scale}
        scaleY={transform.scale}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            dispatch({ type: 'SET_SELECTION', selection: { type: null, id: null } })
            setContextMenu(null)
          }
        }}
      >
        {/* Floor + grid layer */}
        <Layer>
          <Rect x={0} y={0} width={W} height={D}
            fill="#0d1117"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={2}
            cornerRadius={3}
          />
          {gridLines}
          <Text x={W / 2 - 35} y={-20}
            text={`${activeHangar.width_ft}′ wide`}
            fontSize={10} fill="rgba(255,255,255,0.22)"
            fontFamily="DM Mono, monospace"
          />
          <Text x={-50} y={D / 2}
            text={`${activeHangar.depth_ft}′`}
            fontSize={10} fill="rgba(255,255,255,0.22)"
            fontFamily="DM Mono, monospace"
            rotation={-90}
          />

          {activeHangar.obstructions.map(obs => (
            <Group key={obs.id} x={ftToPx(obs.x_ft)} y={ftToPx(obs.y_ft)} rotation={obs.rotation_deg}>
              <Rect
                width={ftToPx(obs.width_ft)} height={ftToPx(obs.height_ft)}
                fill="rgba(251,146,60,0.08)"
                stroke="rgba(251,146,60,0.35)"
                strokeWidth={1} dash={[4, 3]} cornerRadius={2}
              />
              <Text x={3} y={3} text={obs.label}
                fontSize={9} fill="rgba(251,146,60,0.6)"
                fontFamily="DM Mono, monospace"
              />
            </Group>
          ))}

          {activeHangar.doors.map(door => {
            const doorW = ftToPx(door.width_ft)
            let x = 0, y = 0
            if (door.wall === 'top') { x = W * door.position_pct - doorW / 2; y = -5 }
            if (door.wall === 'bottom') { x = W * door.position_pct - doorW / 2; y = D }
            if (door.wall === 'left') { x = -5; y = D * door.position_pct - doorW / 2 }
            if (door.wall === 'right') { x = W; y = D * door.position_pct - doorW / 2 }
            const isHoriz = door.wall === 'top' || door.wall === 'bottom'
            return (
              <Group key={door.id}>
                <Rect x={x} y={y}
                  width={isHoriz ? doorW : 7}
                  height={isHoriz ? 7 : doorW}
                  fill="rgba(96,165,250,0.2)"
                  stroke="rgba(96,165,250,0.7)"
                  strokeWidth={2}
                />
                <Text x={x + 2} y={isHoriz ? y - 16 : y - 2}
                  text={`▲ ${door.label}`}
                  fontSize={9} fill="rgba(96,165,250,0.7)"
                  fontFamily="DM Mono, monospace"
                />
              </Group>
            )
          })}
        </Layer>

        {/* Aircraft layer */}
        <Layer>
          {state.placements.map(p => {
            if (!p.aircraft) return null
            const ac = p.aircraft
            const cfg = STATUS_CONFIG[ac.status]
            const isSelected = state.selection.id === ac.id
            const hasViolation = violationIds.has(p.id)
            const hw = ftToPx(ac.wingspan_ft / 2)
            const hl = ftToPx(ac.length_ft / 2)

            const archetype = detectArchetype(ac.manufacturer, ac.model, ac.wingspan_ft, ac.engine_type)
            const sil = generateSilhouette(ac.wingspan_ft, ac.length_ft, archetype)

            const fillColor = hasViolation ? 'rgba(248,113,113,0.15)' : cfg.bgColor
            const strokeColor = hasViolation ? 'rgba(248,113,113,0.9)' : cfg.color
            const sw = isSelected ? 1.8 : 1.2
            const handleDist = hl + ftToPx(8)

            const drawShape = (pts: number[]) => (ctx: any, shape: any) => {
              ctx.beginPath()
              ctx.moveTo(pts[0], pts[1])
              for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
              ctx.closePath()
              ctx.fillStrokeShape(shape)
            }

            return (
              <Group
                key={p.id}
                x={ftToPx(p.x_ft)}
                y={ftToPx(p.y_ft)}
                rotation={p.rotation_deg}
                draggable={!rotatingId}
                onClick={() => handleAircraftClick(p)}
                onContextMenu={(e) => handleAircraftRightClick(e, p)}
                onDragStart={(e) => { e.cancelBubble = true }}
                onDragEnd={(e) => handleAircraftDragEnd(e, p)}
              >
                {/* Clearance zone */}
                <Rect
                  x={-(hw + ftToPx(activeHangar.clearance_ft))}
                  y={-(hl + ftToPx(activeHangar.clearance_ft))}
                  width={(hw + ftToPx(activeHangar.clearance_ft)) * 2}
                  height={(hl + ftToPx(activeHangar.clearance_ft)) * 2}
                  fill="transparent"
                  stroke={hasViolation ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.03)'}
                  strokeWidth={1} dash={[3, 4]} cornerRadius={3}
                />

                {/* Wings */}
                <Shape sceneFunc={drawShape(sil.wingLeft)} fill={fillColor} stroke={strokeColor} strokeWidth={sw} />
                <Shape sceneFunc={drawShape(sil.wingRight)} fill={fillColor} stroke={strokeColor} strokeWidth={sw} />

                {/* Nacelles */}
                {sil.nacelles.map((n, i) => (
                  <Shape key={i} sceneFunc={drawShape(n)} fill={fillColor} stroke={strokeColor} strokeWidth={sw * 0.8} />
                ))}

                {/* Fuselage */}
                <Shape sceneFunc={drawShape(sil.fuselage)} fill={fillColor} stroke={strokeColor} strokeWidth={sw} />

                {/* Stabilizers */}
                <Shape sceneFunc={drawShape(sil.stabLeft)} fill={fillColor} stroke={strokeColor} strokeWidth={sw * 0.85} />
                <Shape sceneFunc={drawShape(sil.stabRight)} fill={fillColor} stroke={strokeColor} strokeWidth={sw * 0.85} />

                {/* Fin */}
                <Shape sceneFunc={drawShape(sil.fin)} fill={strokeColor + '35'} stroke={strokeColor} strokeWidth={sw * 0.85} />

                {/* Prop discs */}
                {sil.propDiscs.map((disc, i) => (
                  <Ellipse key={i}
                    x={disc.x} y={disc.y}
                    radiusX={disc.rx} radiusY={disc.ry}
                    fill="transparent"
                    stroke={strokeColor + '55'}
                    strokeWidth={1} dash={[2, 3]}
                  />
                ))}

                {/* Tail number */}
                <Text
                  text={ac.tail_number}
                  x={-hw + 2} y={-7}
                  fontSize={Math.max(7, Math.min(11, hw / 3.5))}
                  fill={cfg.color}
                  fontFamily="DM Mono, monospace"
                />

                {/* Model */}
                <Text
                  text={`${ac.manufacturer} ${ac.model}`.substring(0, 16)}
                  x={-hw + 2} y={6}
                  fontSize={Math.max(6, Math.min(8, hw / 5))}
                  fill="rgba(255,255,255,0.3)"
                  fontFamily="DM Mono, monospace"
                />

                {/* Dispatch order badge */}
                {p.dispatch_order !== null && (
                  <Group x={hw - 16} y={-hl + 4}>
                    <Rect x={0} y={0} width={14} height={14}
                      fill="rgba(250,204,21,0.92)" cornerRadius={3}
                    />
                    <Text text={String(p.dispatch_order)}
                      x={0} y={1} width={14} align="center"
                      fontSize={9} fill="#000"
                      fontFamily="DM Mono, monospace" fontStyle="bold"
                    />
                  </Group>
                )}

                {/* Selection ring */}
                {isSelected && (
                  <Rect
                    x={-hw - 5} y={-hl - 5}
                    width={hw * 2 + 10} height={hl * 2 + 10}
                    fill="transparent"
                    stroke="rgba(96,165,250,0.45)"
                    strokeWidth={1.5} dash={[4, 3]} cornerRadius={4}
                  />
                )}

                {/* Rotation handle */}
                {isSelected && (
                  <Group>
                    <Line
                      points={[0, -hl, 0, -handleDist + 7]}
                      stroke="rgba(96,165,250,0.35)"
                      strokeWidth={1} dash={[3, 3]}
                    />
                    <Ellipse
                      x={0} y={-handleDist}
                      radiusX={7} radiusY={7}
                      fill="rgba(96,165,250,0.12)"
                      stroke="rgba(96,165,250,0.8)"
                      strokeWidth={1.5}
                      onMouseDown={(e) => handleRotateStart(e, p)}
                    />
                    <Text x={-4} y={-handleDist - 5}
                      text="↻" fontSize={9}
                      fill="rgba(96,165,250,0.85)"
                      fontFamily="DM Mono, monospace"
                    />
                    <Text x={10} y={-handleDist - 4}
                      text={`${Math.round(((p.rotation_deg % 360) + 360) % 360)}°`}
                      fontSize={8} fill="rgba(96,165,250,0.65)"
                      fontFamily="DM Mono, monospace"
                    />
                  </Group>
                )}
              </Group>
            )
          })}
        </Layer>
      </Stage>

      {/* Context menu — rendered outside Stage so it's a normal DOM element */}
      {contextMenu && (
        <AircraftContextMenu
          placement={contextMenu.placement}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRemove={(id) => { onRemovePlacement(id); setContextMenu(null) }}
          onStatusChange={(aircraftId, status) => { onUpdateStatus(aircraftId, status); setContextMenu(null) }}
          onSetDispatch={(placementId, order) => { onUpdateDispatchOrder(placementId, order); setContextMenu(null) }}
          nextDispatchOrder={nextDispatchOrder}
        />
      )}
    </div>
  )
}
