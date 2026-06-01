import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { RobotArm } from './RobotArm'
import { Workspace } from './Workspace'

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [6.5, 5, 7.5], fov: 42 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <color attach="background" args={['#161c25']} />
      <fog attach="fog" args={['#161c25', 16, 34]} />

      {/* lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0002}
      />
      {/* cool rim */}
      <pointLight position={[-6, 4, -5]} intensity={40} color="#3b82f6" distance={25} />
      <Environment preset="warehouse" environmentIntensity={0.4} />

      <Physics gravity={[0, -9.81, 0]}>
        <RobotArm />
        <Workspace />
        {/* invisible ground collider (objects rest on trays, not here) */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[30, 0.05, 30]} position={[0, -0.13, 0]} />
        </RigidBody>
      </Physics>

      {/* dark floor + blue grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a212b" metalness={0.2} roughness={0.9} />
      </mesh>
      <Grid
        position={[0, -0.06, 0]}
        args={[60, 60]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#2c3c56"
        sectionSize={3}
        sectionThickness={1}
        sectionColor="#3b82f6"
        fadeDistance={26}
        fadeStrength={1.5}
        infiniteGrid
      />
      <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={20} blur={2.2} far={6} />

      <OrbitControls
        target={[0, 0.8, 0]}
        enablePan={false}
        minDistance={5}
        maxDistance={16}
        minPolarAngle={0.18}
        maxPolarAngle={1.4}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
