import { create } from 'zustand'
import { SHAPES, type ShapeKind } from './data/objects'

export type ObjectStatus = 'tray' | 'placed'
export type ArmMode = 'idle' | 'picking' | 'holding' | 'placing'

interface ObjState {
  id: string
  kind: ShapeKind
  status: ObjectStatus
}

export interface ManualTargets {
  base: number
  shoulder: number
  elbow: number
  wrist: number
  railX: number
  gripper: number // 0 closed .. 1 open
}

interface AppState {
  objects: Record<string, ObjState>
  mode: ArmMode
  selectedId: string | null // object being handled / held
  targetBinId: string | null // chosen destination bin
  completed: number
  speedPct: number

  // wrong-bin feedback
  rejectBinId: string | null
  rejectNonce: number

  // bumped on reset so physics bodies re-place themselves
  resetNonce: number

  // id of the object currently gripped (drives its RigidBody type)
  heldId: string | null

  // manual control
  manualMode: boolean
  manual: ManualTargets

  // --- actions (UI) ---
  selectObject: (id: string) => void
  tryPlaceInBin: (binKind: ShapeKind) => void
  setSpeed: (pct: number) => void
  resetWorkspace: () => void
  setManualMode: (on: boolean) => void
  setManual: (patch: Partial<ManualTargets>) => void

  // --- actions (arm controller callbacks) ---
  setHeld: (id: string | null) => void
  onPickComplete: () => void
  onRelease: () => void
  onPlaceComplete: () => void
}

const initialObjects = (): Record<string, ObjState> =>
  Object.fromEntries(
    SHAPES.map((s) => [s.id, { id: s.id, kind: s.kind, status: 'tray' as ObjectStatus }]),
  )

export const useStore = create<AppState>((set, get) => ({
  objects: initialObjects(),
  mode: 'idle',
  selectedId: null,
  targetBinId: null,
  completed: 0,
  speedPct: 60,

  rejectBinId: null,
  rejectNonce: 0,
  resetNonce: 0,
  heldId: null,

  manualMode: false,
  manual: { base: 0, shoulder: 0.6, elbow: -1.1, wrist: 0.5, railX: 0, gripper: 1 },

  selectObject: (id) => {
    const s = get()
    if (s.mode !== 'idle') return
    const obj = s.objects[id]
    if (!obj || obj.status !== 'tray') return
    set({ selectedId: id, mode: 'picking', targetBinId: null })
  },

  tryPlaceInBin: (binKind) => {
    const s = get()
    if (s.mode !== 'holding' || !s.selectedId) return
    const held = s.objects[s.selectedId]
    if (held.kind === binKind) {
      // bin id mirrors the shape id (one bin per shape)
      set({ mode: 'placing', targetBinId: binKind })
    } else {
      set({ rejectBinId: binKind, rejectNonce: s.rejectNonce + 1 })
    }
  },

  setSpeed: (pct) => set({ speedPct: Math.max(10, Math.min(100, pct)) }),

  resetWorkspace: () =>
    set((s) => ({
      objects: initialObjects(),
      mode: 'idle',
      selectedId: null,
      targetBinId: null,
      completed: 0,
      rejectBinId: null,
      resetNonce: s.resetNonce + 1,
      heldId: null,
    })),

  setManualMode: (on) => set({ manualMode: on }),
  setManual: (patch) => set((st) => ({ manual: { ...st.manual, ...patch } })),

  setHeld: (id) => set({ heldId: id }),

  onPickComplete: () => set({ mode: 'holding' }),

  // gripper opens over the bin: object visually drops in now
  onRelease: () => {
    const s = get()
    const id = s.selectedId
    if (!id) return
    set({ objects: { ...s.objects, [id]: { ...s.objects[id], status: 'placed' } } })
  },

  // arm has retracted: finish the cycle
  onPlaceComplete: () =>
    set((s) => ({
      mode: 'idle',
      selectedId: null,
      targetBinId: null,
      completed: s.completed + 1,
    })),
}))

// Expose for in-browser debugging / automated verification (dev only).
if (import.meta.env.DEV) {
  ;(window as unknown as { useStore: typeof useStore }).useStore = useStore
}
