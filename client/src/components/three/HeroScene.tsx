'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import type { Group } from 'three';

/** A soft, slowly-rotating cluster of glossy shapes behind the hero text. Pure decoration. */
function Shapes({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<Group>(null);
  // Shapes sit in the empty corners around the photo (which is drawn on top of them).
  const { viewport } = useThree();
  const w = viewport.width / 2;
  const h = viewport.height / 2;
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
  const s = narrow ? 0.6 : 0.75;

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    // gentle parallax towards the mouse
    g.rotation.x += ((pointer.current?.y ?? 0) * 0.12 - g.rotation.x) * 0.05;
    g.rotation.y += ((pointer.current?.x ?? 0) * 0.18 - g.rotation.y) * 0.05;
    void dt;
  });

  return (
    <group ref={group} scale={s}>
      <Float speed={1.6} rotationIntensity={0.8} floatIntensity={1.2}>
        <mesh position={[(w - 0.9) / s, (h - 0.9) / s, 0]}>
          <icosahedronGeometry args={[0.7, 8]} />
          <MeshDistortMaterial color="#3f8fd6" roughness={0.15} metalness={0.3} distort={0.35} speed={1.6} />
        </mesh>
      </Float>
      <Float speed={1.2} rotationIntensity={1.2} floatIntensity={1}>
        <mesh position={[(w - 0.7) / s, -0.2 / s, -0.5]} rotation={[0.6, 0.2, 0]}>
          <torusGeometry args={[0.5, 0.18, 48, 96]} />
          <meshStandardMaterial color="#e3a283" roughness={0.25} metalness={0.4} />
        </mesh>
      </Float>
      <Float speed={2} rotationIntensity={0.6} floatIntensity={1.6}>
        <mesh position={[(-w + 0.7) / s, (h - 0.8) / s, -0.5]}>
          <sphereGeometry args={[0.4, 48, 48]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.1} clearcoat={1} transmission={0.4} thickness={0.5} />
        </mesh>
      </Float>
      <Float speed={1.4} rotationIntensity={1} floatIntensity={1.2}>
        <mesh position={[0, (h - 0.5) / s, -1]} rotation={[0.3, 0.5, 0.2]}>
          <octahedronGeometry args={[0.35, 0]} />
          <meshStandardMaterial color="#2f4a7a" roughness={0.3} metalness={0.6} />
        </mesh>
      </Float>
    </group>
  );
}

export default function HeroScene() {
  const pointer = useRef({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // The canvas only covers the right part of the hero, so shapes never sit behind the headline.
  return (
    <div className="pointer-events-none absolute right-0 bottom-0 h-[300px] w-full sm:top-0 sm:h-auto sm:w-[58%]" aria-hidden>
    <Canvas
      aria-hidden
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      frameloop={reduced ? 'demand' : 'always'}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 5]} intensity={1.6} />
      <pointLight position={[-4, -2, 3]} intensity={18} color="#9fcdf3" />
      <Shapes pointer={pointer} />
    </Canvas>
    </div>
  );
}
