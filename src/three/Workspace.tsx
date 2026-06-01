import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody, CuboidCollider, CylinderCollider, ConeCollider, BallCollider, type RapierRigidBody } from '@react-three/rapier'
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
      {[-0.42, 0.42].map((z) => (
        <mesh key={z} position={[0, RAIL.y - 0.06, z]} castShadow receiveShadow>
          <boxGeometry args={[len, 0.12, 0.14]} />
          <meshStandardMaterial color="#3a4049" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
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
  const w = SLOT_XS[5] - SLOT_XS[0] + 1.4
  return (
    <RigidBody type="fixed" colliders={false} position={[0, -0.02, z]}>
      <mesh receiveShadow>
        <boxGeometry args={[w, 0.06, 1.2]} />
        <meshStandardMaterial color="#161a21" metalness={0.3} roughness={0.7} />
      </mesh>
      <CuboidCollider args={[w / 2, 0.03, 0.6]} />
    </RigidBody>
  )
}

/** Per-shape Rapier collider (rendered inside the object's RigidBody). */
function ShapeCollider({ kind }: { kind: ShapeKind }) {
  switch (kind) {
    case 'cube':
      return <CuboidCollider args={[0.275, 0.275, 0.275]} />
    case 'cylinder':
      return <CylinderCollider args={[0.3, 0.3]} />
    case 'sphere':
      return <BallCollider args={[0.32]} />
    case 'cone':
      return <ConeCollider args={[0.33, 0.36]} />
    default:
      return null // pyramid / hexagon use hull (colliders="hull")
  }
}

function TrayObject({ def }: { def: ShapeDef }) {
  const body = useRef<RapierRigidBody>(null!)
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  const [hovered, setHovered] = useState(false)
  const held = useStore((s) => s.heldId === def.id)
  const geom = useMemo(() => shapeGeometry(def.kind), [def.kind])
  const slot = useMemo(() => slotPosition(def.slotIndex, def.centerY), [def])
  const lastReset = useRef(0)
  const prevHeld = useRef(false)
  const isHull = def.kind === 'pyramid' || def.kind === 'hexagon'

  useEffect(() => {
    rig.objectBodies[def.id] = body.current
    return () => {
      rig.objectBodies[def.id] = null
    }
  }, [def.id])

  useFrame(() => {
    const st = useStore.getState()
    const b = body.current
    // reset: teleport back to slot
    if (st.resetNonce !== lastReset.current) {
      lastReset.current = st.resetNonce
      b.setTranslation({ x: slot.x, y: slot.y + 0.05, z: slot.z }, true)
      b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    // while held: kinematically snap to the grasp anchor (between the pads)
    if (held) {
      const g = rig.graspPoint
      b.setNextKinematicTranslation({ x: g.x, y: g.y, z: g.z })
    } else if (prevHeld.current) {
      // just released -> ensure a clean drop
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    prevHeld.current = held
    // selection / hover highlight
    const sel = st.selectedId === def.id || held
    const target = sel ? 0.55 : hovered && st.mode === 'idle' ? 0.3 : 0
    matRef.current.emissiveIntensity += (target - matRef.current.emissiveIntensity) * 0.2
  })

  return (
    <RigidBody
      ref={body}
      type={held ? 'kinematicPosition' : 'dynamic'}
      colliders={isHull ? 'hull' : false}
      position={[slot.x, slot.y + 0.05, slot.z]}
      mass={def.grasp.mass}
      friction={1}
      restitution={0.05}
      linearDamping={0.4}
      angularDamping={0.6}
      ccd
    >
      {!isHull && <ShapeCollider kind={def.kind} />}
      <mesh
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
    </RigidBody>
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
    <>
      {/* invisible physics catcher (open box) so dropped objects settle inside */}
      <RigidBody type="fixed" colliders={false} position={[pos.x, 0, pos.z]}>
        <CuboidCollider args={[0.46, 0.03, 0.46]} position={[0, 0.04, 0]} />
        <CuboidCollider args={[0.04, 0.22, 0.46]} position={[-0.48, 0.22, 0]} />
        <CuboidCollider args={[0.04, 0.22, 0.46]} position={[0.48, 0.22, 0]} />
        <CuboidCollider args={[0.46, 0.22, 0.04]} position={[0, 0.22, -0.48]} />
        <CuboidCollider args={[0.46, 0.22, 0.04]} position={[0, 0.22, 0.48]} />
      </RigidBody>

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
        <mesh position={[0, 0.04, 0]} rotation={[-HALF_PI, 0, 0]} receiveShadow>
          <circleGeometry args={[0.42, 40]} />
          <meshStandardMaterial color="#0d0f13" metalness={0.2} roughness={0.9} />
        </mesh>
      </group>
    </>
  )
}

function ContainerShape({ kind, color, highlight }: { kind: ShapeKind; color: string; highlight: boolean }) {
  const mat = (
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={highlight ? 0.6 : 0.25} metalness={0.3} roughness={0.5} side={THREE.DoubleSide} />
  )
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
      return (
        <mesh position={[0, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.46, 36, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          {mat}
        </mesh>
      )
    case 'pyramid':
      return wall(3, 0.55, 0.55, Math.PI)
    case 'cone':
      return wall(40, 0.52, 0.38)
    case 'hexagon':
      return wall(6, 0.48, 0.48)
  }
}
