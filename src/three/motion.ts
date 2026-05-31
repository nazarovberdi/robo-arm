import * as THREE from 'three'
import { ARM, BASE_Z, HALF_PI, RAIL } from './config'

export interface ArmPose {
  railX: number
  base: number // yaw
  shoulder: number // pitch
  elbow: number // pitch (relative)
  wrist: number // pitch (relative)
}

// Elbow configuration: +1 elbow-down, -1 elbow-up. Tunable.
const ELBOW_SIGN = -1

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Hybrid analytic IK.
 * Given a desired gripper-tip world position, solve:
 *  - railX  = X of target (carriage aligns under the column)
 *  - base   = yaw to face the +Z or -Z row
 *  - 2-link planar IK (shoulder, elbow) in the vertical reach plane
 *  - wrist  = keep gripper pointing straight down (world -Y)
 * Rest pose convention: all pitch joints = 0 => arm points straight up (+Y).
 */
export function solveArm(eeX: number, eeY: number, eeZ: number): ArmPose {
  const { L1, L2, shoulderH, gripLen } = ARM
  const railX = clamp(eeX, RAIL.xMin, RAIL.xMax)

  const dzRaw = eeZ - BASE_Z
  const base = dzRaw >= 0 ? 0 : Math.PI
  const reach = Math.abs(dzRaw) // horizontal distance from base axis

  // wrist pivot sits gripLen above the tip (gripper hangs straight down)
  const wristY = eeY + gripLen
  const dz = reach
  const dy = wristY - shoulderH

  // clamp to reachable radius, preserving direction
  const dist = Math.hypot(dz, dy) || 1e-6
  const maxR = L1 + L2 - 1e-3
  const minR = Math.abs(L1 - L2) + 1e-3
  const r = clamp(dist, minR, maxR)
  const s = r / dist
  const dzc = dz * s
  const dyc = dy * s

  // law of cosines for the elbow interior angle
  const c2 = clamp((dzc * dzc + dyc * dyc - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1)
  const elbowRel = ELBOW_SIGN * Math.acos(c2)

  // psi = absolute link angle measured from +horizontal toward +up
  const psi1 =
    Math.atan2(dyc, dzc) -
    Math.atan2(L2 * Math.sin(elbowRel), L1 + L2 * Math.cos(elbowRel))
  const psi2 = psi1 + elbowRel

  // map absolute angles -> joint rotations about X (rest = +Y / straight up)
  const shoulder = HALF_PI - psi1
  const elbow = -elbowRel
  // forearm absolute pitch from +Y = shoulder + elbow = HALF_PI - psi2.
  // want gripper to point down (abs pitch = PI): wrist = HALF_PI + psi2
  const wrist = HALF_PI + psi2

  return { railX, base, shoulder, elbow, wrist }
}

// ---- Waypoints ----
export interface Waypoint {
  pose: ArmPose
  gripper: number // 1 open, 0 closed
  dur: number // seconds (before speed scaling)
}

export function smoothstep(t: number): number {
  t = clamp(t, 0, 1)
  return t * t * (3 - 2 * t)
}

export function lerpPose(a: ArmPose, b: ArmPose, t: number): ArmPose {
  const l = (x: number, y: number) => x + (y - x) * t
  return {
    railX: l(a.railX, b.railX),
    base: l(a.base, b.base),
    shoulder: l(a.shoulder, b.shoulder),
    elbow: l(a.elbow, b.elbow),
    wrist: l(a.wrist, b.wrist),
  }
}

const HOVER = 0.95
const LIFT = 1.05

/** Pick: hover -> descend -> close (attach) -> lift & hold over the column. */
export function buildPickWaypoints(o: THREE.Vector3): Waypoint[] {
  return [
    { pose: solveArm(o.x, o.y + HOVER, o.z), gripper: 1, dur: 0.8 },
    { pose: solveArm(o.x, o.y, o.z), gripper: 1, dur: 0.55 },
    { pose: solveArm(o.x, o.y, o.z), gripper: 0, dur: 0.45 }, // attach at end
    { pose: solveArm(o.x, o.y + LIFT, o.z), gripper: 0, dur: 0.6 },
  ]
}

/**
 * Place: raise -> sweep over bin -> descend -> release (detach at idx 2 boundary)
 * -> lift straight up out of the bin (so retracting fingers don't knock the
 * just-dropped object) -> retract to idle.
 */
export function buildPlaceWaypoints(o: THREE.Vector3, b: THREE.Vector3): Waypoint[] {
  return [
    { pose: solveArm(o.x, 1.75, o.z), gripper: 0, dur: 0.5 },
    { pose: solveArm(b.x, 1.75, b.z), gripper: 0, dur: 1.15 }, // base sweeps, carriage slides
    { pose: solveArm(b.x, b.y + 0.55, b.z), gripper: 0, dur: 0.55 },
    { pose: solveArm(b.x, b.y + 0.55, b.z), gripper: 1, dur: 0.45 }, // open + detach
    { pose: solveArm(b.x, 1.75, b.z), gripper: 1, dur: 0.5 }, // lift straight up, clear the bin
    { pose: idlePose(), gripper: 1, dur: 0.85 },
  ]
}

export function idlePose(): ArmPose {
  return solveArm(0, 1.7, 1.0)
}

// Dev-only expose for verification
if (import.meta.env.DEV) {
  ;(window as unknown as { __solveArm: typeof solveArm }).__solveArm = solveArm
}
