'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { MeshDistortMaterial, Html } from '@react-three/drei';

export function SimulatedCursors() {
  const cursor1 = useRef<THREE.Group>(null);
  const cursor2 = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    if (cursor1.current) {
      cursor1.current.position.x = Math.sin(t * 0.5) * 4;
      cursor1.current.position.y = Math.cos(t * 0.3) * 2;
      cursor1.current.position.z = Math.sin(t * 0.2) * 2 - 1;
    }
    if (cursor2.current) {
      cursor2.current.position.x = Math.cos(t * 0.4) * 5;
      cursor2.current.position.y = Math.sin(t * 0.6) * 3;
      cursor2.current.position.z = Math.cos(t * 0.3) * 2 - 1;
    }
  });

  return (
    <>
      <group ref={cursor1}>
        <pointLight color="#FF9500" intensity={2} distance={3} />
        <mesh scale={0.2}>
          <sphereGeometry args={[1, 16, 16]} />
          <MeshDistortMaterial color="#FF9500" distort={0.5} speed={4} transparent opacity={0.8} />
        </mesh>
        <Html position={[0.3, 0, 0]} center>
          <div className="px-2 py-1 rounded bg-[#FF9500]/20 text-[#FF9500] text-[10px] font-mono border border-[#FF9500]/50 backdrop-blur-md">
            Legal Team
          </div>
        </Html>
      </group>

      <group ref={cursor2}>
        <pointLight color="#34C759" intensity={2} distance={3} />
        <mesh scale={0.2}>
          <sphereGeometry args={[1, 16, 16]} />
          <MeshDistortMaterial color="#34C759" distort={0.5} speed={4} transparent opacity={0.8} />
        </mesh>
        <Html position={[0.3, 0, 0]} center>
          <div className="px-2 py-1 rounded bg-[#34C759]/20 text-[#34C759] text-[10px] font-mono border border-[#34C759]/50 backdrop-blur-md">
            Sales
          </div>
        </Html>
      </group>
    </>
  );
}
