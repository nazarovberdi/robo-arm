import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { ARM, HALF_PI, RAIL, rig } from './config'
import { telemetry, grip as gripChip } from './telemetry'
import {
  type ArmPose,
  type Waypoint,
  buildPickWaypoints,
  buildPlaceWaypoints,
  groundGuard,
  idlePose,
  lerpPose,
  smoothstep,
} from './motion'
import { useStore } from '../store'
import { SHAPES, SHAPE_BY_ID, slotPosition, binPosition } from '../data/objects'

interface SeqState {
  wps: Waypoint[]
  startPose: ArmPose
  startGrip: number
  idx: number
  t: number
  kind: 'pick' | 'place'
}

const pedH = ARM.shoulderH - (RAIL.y + ARM.carriageH)
const ALIGN_DIST = 0.8 // grasp anchor within this of an object -> "align"
const READY_DIST = 0.36 // within this -> graspable candidate ("ready")

// scratch (avoid per-frame allocations)
const _gp = new THREE.Vector3()
const _tmp = new THREE.Vector3()
const _tmpQ = new THREE.Quaternion()

export function RobotArm() {
  // joint refs
  const carriage = useRef<THREE.Group>(null!)
  const base = useRef<THREE.Group>(null!)
  const shoulder = useRef<THREE.Group>(null!)
  const elbow = useRef<THREE.Group>(null!)
  const wrist = useRef<THREE.Group>(null!)
  const fingerL = useRef<THREE.Group>(null!)
  const fingerR = useRef<THREE.Group>(null!)
  const tip = useRef<THREE.Object3D>(null!)
  // physics markers + kinematic bodies
  const markerL = useRef<THREE.Object3D>(null!)
  const markerR = useRef<THREE.Object3D>(null!)
  const graspMarker = useRef<THREE.Object3D>(null!)
  const bodyL = useRef<RapierRigidBody>(null!)
  const bodyR = useRef<RapierRigidBody>(null!)

  // playback state (non-reactive)
  const displayed = useRef<ArmPose>(idlePose())
  const grip = useRef(1)
  const seqRef = useRef<SeqState | null>(null)
  const lastMode = useRef<string>('init')
  const cycleStart = useRef(0)

  const mats = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({ color: '#d3d6db', metalness: 0.55, roughness: 0.38 }),
      bodyDark: new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: 0.6, roughness: 0.42 }),
      ring: new THREE.MeshStandardMaterial({ color: '#dd8a2e', metalness: 0.5, roughness: 0.4, emissive: '#5a3206', emissiveIntensity: 0.4 }),
      joint: new THREE.MeshStandardMaterial({ color: '#2c3037', metalness: 0.7, roughness: 0.35 }),
      finger: new THREE.MeshStandardMaterial({ color: '#23262c', metalness: 0.6, roughness: 0.4 }),
    }
  }, [])

  // ---- grasp helpers ----
  // Held state drives the object's RigidBody TYPE via the store (declarative),
  // so the wrapper and our intent agree — the object component switches to
  // kinematicPosition and snaps to the grasp anchor while held.
  function grab(id: string | null) {
    if (!id || rig.heldObjectId) return
    rig.heldObjectId = id
    useStore.getState().setHeld(id)
  }

  function release() {
    if (!rig.heldObjectId) return
    rig.heldObjectId = null
    useStore.getState().setHeld(null)
  }

  // Readiness is proximity-based (deterministic) — kinematic↔dynamic collision
  // EVENTS are unreliable; the colliders still provide the physical touch/stop.
  function updateReadiness() {
    graspMarker.current.getWorldPosition(_gp)
    let candidate: string | null = null
    let best = Infinity
    let near = false
    for (const s of SHAPES) {
      if (rig.heldObjectId === s.id) continue
      const b = rig.objectBodies[s.id]
      if (!b) continue
      const t = b.translation()
      const d = _gp.distanceTo(_tmp.set(t.x, t.y, t.z))
      if (d < ALIGN_DIST) near = true
      if (d < READY_DIST && d < best) {
        best = d
        candidate = s.id
      }
    }
    rig.candidateId = candidate
    gripChip.state = rig.heldObjectId ? 'gripping' : candidate ? 'ready' : near ? 'align' : 'none'
  }

  function driveFingerBodies() {
    if (!bodyL.current || !bodyR.current) return
    markerL.current.getWorldPosition(_tmp)
    markerL.current.getWorldQuaternion(_tmpQ)
    bodyL.current.setNextKinematicTranslation({ x: _tmp.x, y: _tmp.y, z: _tmp.z })
    bodyL.current.setNextKinematicRotation({ x: _tmpQ.x, y: _tmpQ.y, z: _tmpQ.z, w: _tmpQ.w })
    markerR.current.getWorldPosition(_tmp)
    markerR.current.getWorldQuaternion(_tmpQ)
    bodyR.current.setNextKinematicTranslation({ x: _tmp.x, y: _tmp.y, z: _tmp.z })
    bodyR.current.setNextKinematicRotation({ x: _tmpQ.x, y: _tmpQ.y, z: _tmpQ.z, w: _tmpQ.w })
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const st = useStore.getState()

    if (st.manualMode) {
      const m = st.manual
      const target = groundGuard({ railX: m.railX, base: m.base, shoulder: m.shoulder, elbow: m.elbow, wrist: m.wrist })
      const k = Math.min(1, dt * 6)
      displayed.current = lerpPose(displayed.current, target, k)
      grip.current += (m.gripper - grip.current) * k
      seqRef.current = null
      lastMode.current = 'manual'
      apply()
      driveFingerBodies()
      updateReadiness()
      // grab while closed once near a candidate; release while open
      if (m.gripper < 0.5 && !rig.heldObjectId && rig.candidateId) grab(rig.candidateId)
      else if (m.gripper >= 0.5 && rig.heldObjectId) release()
      return
    }

    // start sequences on mode change
    if (st.mode === 'picking' && lastMode.current !== 'picking') {
      const sd = SHAPES.find((s) => s.id === st.selectedId)
      if (sd) {
        const o = slotPosition(sd.slotIndex, sd.centerY)
        seqRef.current = { wps: buildPickWaypoints(o), startPose: { ...displayed.current }, startGrip: grip.current, idx: 0, t: 0, kind: 'pick' }
        cycleStart.current = performance.now()
      }
    } else if (st.mode === 'placing' && lastMode.current !== 'placing') {
      const sd = SHAPES.find((s) => s.id === st.selectedId)
      if (sd) {
        const o = slotPosition(sd.slotIndex, sd.centerY)
        const b = binPosition(sd.slotIndex)
        seqRef.current = { wps: buildPlaceWaypoints(o, b), startPose: { ...displayed.current }, startGrip: grip.current, idx: 0, t: 0, kind: 'place' }
      }
    }
    lastMode.current = st.mode

    const seq = seqRef.current
    if (seq) {
      const wp = seq.wps[seq.idx]
      const factor = st.speedPct / 60
      seq.t += (dt * factor) / wp.dur
      if (seq.t >= 1) {
        seq.t = 0
        const finished = seq.idx
        if (seq.kind === 'pick' && finished === 2) grab(st.selectedId)
        if (seq.kind === 'place' && finished === 2) {
          useStore.getState().onRelease()
          release()
        }
        seq.idx++
        if (seq.idx >= seq.wps.length) {
          displayed.current = { ...wp.pose }
          grip.current = wp.gripper
          if (seq.kind === 'pick') useStore.getState().onPickComplete()
          else useStore.getState().onPlaceComplete()
          seqRef.current = null
        }
      }
    }

    const active = seqRef.current
    if (active) {
      const wp = active.wps[active.idx]
      const from = active.idx === 0 ? active.startPose : active.wps[active.idx - 1].pose
      const fromG = active.idx === 0 ? active.startGrip : active.wps[active.idx - 1].gripper
      const e = smoothstep(active.t)
      displayed.current = lerpPose(from, wp.pose, e)
      grip.current = fromG + (wp.gripper - fromG) * e
      telemetry.cycleMs = performance.now() - cycleStart.current
    } else if (st.mode === 'idle') {
      const k = Math.min(1, dt * 2.5)
      displayed.current = lerpPose(displayed.current, idlePose(), k)
      grip.current += (1 - grip.current) * k
    } else if (st.mode === 'holding') {
      telemetry.cycleMs = performance.now() - cycleStart.current
    }

    apply()
    driveFingerBodies()
    updateReadiness()
  })

  function apply() {
    const p = displayed.current
    carriage.current.position.x = p.railX
    base.current.rotation.y = p.base
    shoulder.current.rotation.x = p.shoulder
    elbow.current.rotation.x = p.elbow
    wrist.current.rotation.x = p.wrist

    // finger gap from grip value (open ~0.45 clears the objects; closed ~0.12),
    // clamped so fingers rest on the held/candidate object's surface rather than
    // penetrating it.
    let gap = 0.12 + 0.30 * grip.current
    const onId = rig.heldObjectId ?? rig.candidateId
    if (onId) {
      const w = SHAPE_BY_ID[onId]?.grasp.width ?? 0
      gap = Math.max(gap, w / 2 + 0.03)
    }
    fingerL.current.position.x = -gap
    fingerR.current.position.x = gap

    wrist.current.updateWorldMatrix(true, true)
    tip.current.getWorldPosition(rig.gripperTip)
    graspMarker.current.getWorldPosition(rig.graspPoint)

    telemetry.base = p.base
    telemetry.shoulder = p.shoulder
    telemetry.elbow = p.elbow
    telemetry.wrist = p.wrist
    telemetry.railX = p.railX
    telemetry.gripper = grip.current
  }

  return (
    <>
      {/* kinematic finger colliders (driven each frame to match the IK fingers) */}
      <RigidBody ref={bodyL} type="kinematicPosition" colliders={false} ccd userData={{ finger: 'L' }}>
        <CuboidCollider args={[0.035, ARM.gripLen / 2, 0.085]} />
      </RigidBody>
      <RigidBody ref={bodyR} type="kinematicPosition" colliders={false} ccd userData={{ finger: 'R' }}>
        <CuboidCollider args={[0.035, ARM.gripLen / 2, 0.085]} />
      </RigidBody>

      <group>
        {/* carriage rides the rail along X */}
        <group ref={carriage} position={[0, RAIL.y, 0]}>
          <mesh position={[0, ARM.carriageH / 2, 0]} castShadow receiveShadow material={mats.joint}>
            <boxGeometry args={[0.95, ARM.carriageH, 1.0]} />
          </mesh>
          {[-0.4, 0.4].map((z) =>
            [-0.42, 0.42].map((x) => (
              <mesh key={`${x}_${z}`} position={[x, 0.06, z]} rotation={[0, 0, HALF_PI]} material={mats.bodyDark} castShadow>
                <cylinderGeometry args={[0.1, 0.1, 0.12, 20]} />
              </mesh>
            )),
          )}

          <group ref={base} position={[0, ARM.carriageH, 0]}>
            <mesh position={[0, 0.02, 0]} rotation={[-HALF_PI, 0, 0]}>
              <ringGeometry args={[0.34, 0.46, 48]} />
              <meshBasicMaterial color="#2b7fff" transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, pedH / 2, 0]} castShadow receiveShadow material={mats.body}>
              <cylinderGeometry args={[0.3, 0.36, pedH, 36]} />
            </mesh>

            <group ref={shoulder} position={[0, pedH, 0]}>
              <Knuckle mats={mats} />
              <mesh position={[0, ARM.L1 / 2, 0]} castShadow receiveShadow material={mats.body}>
                <capsuleGeometry args={[0.16, ARM.L1 - 0.32, 8, 20]} />
              </mesh>
              <AccentRing y={ARM.L1 * 0.32} mats={mats} />

              <group ref={elbow} position={[0, ARM.L1, 0]}>
                <Knuckle mats={mats} />
                <mesh position={[0, ARM.L2 / 2, 0]} castShadow receiveShadow material={mats.body}>
                  <capsuleGeometry args={[0.14, ARM.L2 - 0.28, 8, 20]} />
                </mesh>
                <AccentRing y={ARM.L2 * 0.34} mats={mats} />

                <group ref={wrist} position={[0, ARM.L2, 0]}>
                  <Knuckle mats={mats} small />
                  {/* gripper housing + wide slide rail: the fingers ride the rail,
                      so they always read as mounted to the gripper (no floating gap
                      when open). Cosmetic only — no colliders here. */}
                  <mesh position={[0, 0.06, 0]} castShadow material={mats.joint}>
                    <boxGeometry args={[0.32, 0.16, 0.24]} />
                  </mesh>
                  <mesh position={[0, 0.15, 0]} castShadow material={mats.bodyDark}>
                    <boxGeometry args={[0.98, 0.1, 0.2]} />
                  </mesh>
                  <group ref={fingerL} position={[-0.12, 0.16, 0]}>
                    <mesh position={[0, 0.02, 0]} castShadow material={mats.joint}>
                      <boxGeometry args={[0.12, 0.14, 0.18]} />
                    </mesh>
                    <mesh position={[0, ARM.gripLen / 2, 0]} castShadow material={mats.finger}>
                      <boxGeometry args={[0.06, ARM.gripLen, 0.16]} />
                    </mesh>
                    <object3D ref={markerL} position={[0, ARM.gripLen / 2, 0]} />
                  </group>
                  <group ref={fingerR} position={[0.12, 0.16, 0]}>
                    <mesh position={[0, 0.02, 0]} castShadow material={mats.joint}>
                      <boxGeometry args={[0.12, 0.14, 0.18]} />
                    </mesh>
                    <mesh position={[0, ARM.gripLen / 2, 0]} castShadow material={mats.finger}>
                      <boxGeometry args={[0.06, ARM.gripLen, 0.16]} />
                    </mesh>
                    <object3D ref={markerR} position={[0, ARM.gripLen / 2, 0]} />
                  </group>
                  {/* grasp anchor (between the pads) + finger-tip marker */}
                  <object3D ref={graspMarker} position={[0, 0.16 + ARM.gripLen * 0.5, 0]} />
                  <object3D ref={tip} position={[0, ARM.gripLen + 0.16, 0]} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  )
}

function Knuckle({ mats, small }: { mats: { joint: THREE.Material }; small?: boolean }) {
  const r = small ? 0.16 : 0.2
  return (
    <mesh rotation={[0, 0, HALF_PI]} castShadow material={mats.joint}>
      <cylinderGeometry args={[r, r, 0.44, 28]} />
    </mesh>
  )
}

function AccentRing({ y, mats }: { y: number; mats: { ring: THREE.Material } }) {
  return (
    <mesh position={[0, y, 0]} material={mats.ring} castShadow>
      <cylinderGeometry args={[0.175, 0.175, 0.1, 28]} />
    </mesh>
  )
}
