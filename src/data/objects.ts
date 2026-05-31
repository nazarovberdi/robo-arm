import * as THREE from 'three'
import { SLOT_XS, OBJ_ROW_Z, BIN_ROW_Z, SHAPE_COLORS } from '../three/config'

export type ShapeKind =
  | 'cube'
  | 'cylinder'
  | 'sphere'
  | 'pyramid'
  | 'cone'
  | 'hexagon'

/** Grasp affordance: where/how the gripper should grab this shape. */
export interface Grasp {
  /** horizontal width the closed fingers rest against (object surface-to-surface) */
  width: number
  /** Y (relative to object center) the finger pads should align to */
  height: number
  /** finger opening needed to clear the object before descending */
  clearance: number
  /** rigid-body mass (kg-ish) */
  mass: number
}

export interface ShapeDef {
  id: string
  kind: ShapeKind
  label: string
  color: string
  slotIndex: number
  /** half-height of the object resting on the tray (object center Y) */
  centerY: number
  grasp: Grasp
}

// One of each shape, in slot order matching the mockup.
export const SHAPES: ShapeDef[] = [
  { id: 'cube', kind: 'cube', label: 'Cube', color: SHAPE_COLORS.cube, slotIndex: 0, centerY: 0.3, grasp: { width: 0.55, height: 0, clearance: 0.85, mass: 1 } },
  { id: 'cylinder', kind: 'cylinder', label: 'Cylinder', color: SHAPE_COLORS.cylinder, slotIndex: 1, centerY: 0.3, grasp: { width: 0.6, height: 0, clearance: 0.9, mass: 1 } },
  { id: 'sphere', kind: 'sphere', label: 'Sphere', color: SHAPE_COLORS.sphere, slotIndex: 2, centerY: 0.3, grasp: { width: 0.64, height: 0, clearance: 0.95, mass: 1 } },
  { id: 'pyramid', kind: 'pyramid', label: 'Pyramid', color: SHAPE_COLORS.pyramid, slotIndex: 3, centerY: 0.32, grasp: { width: 0.5, height: -0.05, clearance: 0.85, mass: 1 } },
  { id: 'cone', kind: 'cone', label: 'Cone', color: SHAPE_COLORS.cone, slotIndex: 4, centerY: 0.32, grasp: { width: 0.48, height: -0.05, clearance: 0.82, mass: 1 } },
  { id: 'hexagon', kind: 'hexagon', label: 'Hexagon', color: SHAPE_COLORS.hexagon, slotIndex: 5, centerY: 0.26, grasp: { width: 0.62, height: 0, clearance: 0.92, mass: 1.2 } },
]

export const SHAPE_BY_ID: Record<string, ShapeDef> = Object.fromEntries(SHAPES.map((s) => [s.id, s]))

export function slotPosition(slotIndex: number, centerY: number): THREE.Vector3 {
  return new THREE.Vector3(SLOT_XS[slotIndex], centerY, OBJ_ROW_Z)
}

export function binPosition(slotIndex: number): THREE.Vector3 {
  // bin opening sits near ground; objects settle slightly inside
  return new THREE.Vector3(SLOT_XS[slotIndex], 0.18, BIN_ROW_Z)
}

/** Build the THREE geometry for an object of a given kind. */
export function shapeGeometry(kind: ShapeKind): THREE.BufferGeometry {
  switch (kind) {
    case 'cube':
      return new THREE.BoxGeometry(0.55, 0.55, 0.55)
    case 'cylinder':
      return new THREE.CylinderGeometry(0.3, 0.3, 0.6, 40)
    case 'sphere':
      return new THREE.SphereGeometry(0.32, 40, 32)
    case 'pyramid':
      return new THREE.ConeGeometry(0.4, 0.66, 4)
    case 'cone':
      return new THREE.ConeGeometry(0.36, 0.66, 48)
    case 'hexagon':
      return new THREE.CylinderGeometry(0.36, 0.36, 0.5, 6)
  }
}
