import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RAIL, OBJ_ROW_Z, BIN_ROW_Z, SLOT_XS, HALF_PI, rig } from './config'
import { SHAPES, type ShapeDef, type ShapeKind, shapeGeometry, slotPosition, binPosition } from '../data/objects'
import { useStore } from '../store'

export function Workspace() {
  return (
    <group>
      <Rail />
      <RowTray z={OBJ_ROW_Z} />
      <RowTray z={BIN_ROW_Z} />
      {SHAPES.map((s) => (
        <TrayObject key={s.id} def={s} />
      ))}
      {SHAPES.map((s) => (
        <Container key={s.id} def={s} />
      ))}
    </group>
  )
}

function Rail() {
  const len = RAIL.xMax - RAIL.xMin + 1.2
  return (
    <group>
      {/* twin rails */}
      {[-0.42, 0.42].map((z) => (
        <mesh key={z} position={[0, RAIL.y - 0.06, z]} castShadow receiveShadow>
          <boxGeometry args={[len, 0.12, 0.14]} />
          <meshStandardMaterial color="#3a4049" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* sleepers */}
      {Array.from({ length: 11 }).map((_, i) => {
        const x = RAIL.xMin + (i / 10) * (RAIL.xMax - RAIL.xMin)
        return (
          <mesh key={i} position={[x, RAIL.y - 0.12, 0]} receiveShadow>
            <boxGeometry args={[0.18, 0.06, 1.05]} />
            <meshStandardMaterial color="#23272e" metalness={0.4} roughness={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}

function RowTray({ z }: { z: number }) {
  return (
    <mesh position={[0, -0.02, z]} receiveShadow>
      <boxGeometry args={[SLOT_XS[5] - SLOT_XS[0] + 1.4, 0.06, 1.2]} />
      <meshStandardMaterial color="#161a21" metalness={0.3} roughness={0.7} />
    </mesh>
  )
}

function TrayObject({ def }: { def: ShapeDef }) {
  const ref = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  const [hovered, setHovered] = useState(false)
  const geom = useMemo(() => shapeGeometry(def.kind), [def.kind])
  const slot = useMemo(() => slotPosition(def.slotIndex, def.centerY), [def])
  const bin = useMemo(() => binPosition(def.slotIndex), [def])

  useFrame(() => {
    const st = useStore.getState()
    const status = st.objects[def.id].status
    if (rig.heldObjectId === def.id) {
      ref.current.position.copy(rig.gripperTip)
      ref.current.position.y += 0.12
    } else if (status === 'placed') {
      ref.current.position.set(bin.x, bin.y + 0.18, bin.z)
    } else {
      ref.current.position.copy(slot)
    }
    const sel = st.selectedId === def.id
    const target = sel ? 0.55 : hovered && st.mode === 'idle' && status === 'tray' ? 0.3 : 0
    matRef.current.emissiveIntensity += (target - matRef.current.emissiveIntensity) * 0.2
  })

  return (
    <mesh
      ref={ref}
      geometry={geom}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        useStore.getState().selectObject(def.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      <meshStandardMaterial ref={matRef} color={def.color} emissive={def.color} emissiveIntensity={0} metalness={0.15} roughness={0.5} />
    </mesh>
  )
}

function Container({ def }: { def: ShapeDef }) {
  const group = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  const pos = useMemo(() => binPosition(def.slotIndex), [def])
  const lastNonce = useRef(0)
  const shakeT = useRef(-1)

  useFrame((_, dt) => {
    const st = useStore.getState()
    // trigger shake on a fresh reject targeting this bin
    if (st.rejectBinId === def.kind && st.rejectNonce !== lastNonce.current) {
      lastNonce.current = st.rejectNonce
      shakeT.current = 0
    }
    if (shakeT.current >= 0) {
      shakeT.current += dt
      const d = shakeT.current
      group.current.position.x = pos.x + Math.sin(d * 50) * 0.08 * Math.max(0, 1 - d / 0.4)
      if (d > 0.4) {
        group.current.position.x = pos.x
        shakeT.current = -1
      }
    }
  })

  return (
    <group
      ref={group}
      position={[pos.x, 0, pos.z]}
      onClick={(e) => {
        e.stopPropagation()
        useStore.getState().tryPlaceInBin(def.kind)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      <ContainerShape kind={def.kind} color={def.color} highlight={hovered} />
      {/* dark inner floor */}
      <mesh position={[0, 0.04, 0]} rotation={[-HALF_PI, 0, 0]} receiveShadow>
        <circleGeometry args={[0.42, 40]} />
        <meshStandardMaterial color="#0d0f13" metalness={0.2} roughness={0.9} />
      </mesh>
    </group>
  )
}

function ContainerShape({ kind, color, highlight }: { kind: ShapeKind; color: string; highlight: boolean }) {
  const mat = (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={highlight ? 0.6 : 0.25}
      metalness={0.3}
      roughness={0.5}
      side={THREE.DoubleSide}
    />
  )
  // open "wall" rings; radialSegments encode silhouette
  const wall = (radial: number, rTop: number, rBot: number, rotY = 0, h = 0.42) => (
    <mesh position={[0, h / 2, 0]} rotation={[0, rotY, 0]} castShadow>
      <cylinderGeometry args={[rTop, rBot, h, radial, 1, true]} />
      {mat}
    </mesh>
  )
  switch (kind) {
    case 'cube':
      return wall(4, 0.5, 0.5, Math.PI / 4)
    case 'cylinder':
      return wall(40, 0.45, 0.45)
    case 'sphere':
      // bowl: lower hemisphere, open top
      return (
        <mesh position={[0, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.46, 36, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          {mat}
        </mesh>
      )
    case 'pyramid':
      return wall(3, 0.55, 0.55, Math.PI)
    case 'cone':
      return wall(40, 0.52, 0.38) // tapered ring
    case 'hexagon':
      return wall(6, 0.48, 0.48)
  }
}
