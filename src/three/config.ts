import * as THREE from 'three'

// ---- World layout (units ~= meters) ----
// Rail runs along X. Two rows run parallel to it, offset in Z.
export const RAIL = {
  xMin: -3.4,
  xMax: 3.4,
  y: 0.18, // top surface of rail
  z: 0,
}

// The arm base pivot Z (it lives on the carriage, centered on the rail)
export const BASE_Z = 0

// Object slots (front row, +Z) and containers (back row, -Z) share X positions.
export const OBJ_ROW_Z = 2.25
export const BIN_ROW_Z = -2.25
export const SLOT_XS = [-3.0, -1.8, -0.6, 0.6, 1.8, 3.0]

export const TRAY_Y = 0 // ground plane

// ---- Arm dimensions ----
export const ARM = {
  carriageH: 0.34, // carriage block height (sits on rail)
  pedestalH: 0.55, // rotating base pedestal height
  shoulderH: 1.25, // shoulder pitch pivot height above ground
  L1: 1.45, // upper arm length (shoulder -> elbow)
  L2: 1.3, // forearm length (elbow -> wrist)
  gripLen: 0.42, // wrist pivot -> finger tip
}

export const HALF_PI = Math.PI / 2

// Colors per shape (match dashboard accents)
export const SHAPE_COLORS = {
  cube: '#3b82f6',
  cylinder: '#22c55e',
  sphere: '#ef4444',
  pyramid: '#8b5cf6',
  cone: '#f59e0b',
  hexagon: '#14b8a6',
} as const

// Shared mutable rig channel for per-frame comms (NOT React state).
// RobotArm writes gripperTip each frame; the held object reads it.
export const rig = {
  gripperTip: new THREE.Vector3(),
  heldObjectId: null as string | null,
}
