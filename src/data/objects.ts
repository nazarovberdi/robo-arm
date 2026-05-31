import * as THREE from 'three'
import { SLOT_XS, OBJ_ROW_Z, BIN_ROW_Z, SHAPE_COLORS } from '../three/config'

export type ShapeKind =
  | 'cube'
  | 'cylinder'
  | 'sphere'
  | 'pyramid'
  | 'cone'
  | 'hexagon'

export interface ShapeDef {
  id: string
  kind: ShapeKind
  label: string
  color: string
  slotIndex: number
  /** half-height of the object resting on the tray (object center Y) */
  centerY: number
}

// One of each shape, in slot order matching the mockup.
export const SHAPES: ShapeDef[] = [
  { id: 'cube', kind: 'cube', label: 'Cube', color: SHAPE_COLORS.cube, slotIndex: 0, centerY: 0.3 },
  { id: 'cylinder', kind: 'cylinder', label: 'Cylinder', color: SHAPE_COLORS.cylinder, slotIndex: 1, centerY: 0.3 },
  { id: 'sphere', kind: 'sphere', label: 'Sphere', color: SHAPE_COLORS.sphere, slotIndex: 2, centerY: 0.3 },
  { id: 'pyramid', kind: 'pyramid', label: 'Pyramid', color: SHAPE_COLORS.pyramid, slotIndex: 3, centerY: 0.32 },
  { id: 'cone', kind: 'cone', label: 'Cone', color: SHAPE_COLORS.cone, slotIndex: 4, centerY: 0.32 },
  { id: 'hexagon', kind: 'hexagon', label: 'Hexagon', color: SHAPE_COLORS.hexagon, slotIndex: 5, centerY: 0.26 },
]

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
