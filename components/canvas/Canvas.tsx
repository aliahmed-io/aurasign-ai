'use client';

import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { ReactNode } from 'react';
import { SceneManager } from './SceneManager';

interface CanvasProviderProps {
  children?: ReactNode;
}

export function CanvasProvider({ children }: CanvasProviderProps) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 40 }}
        style={{ pointerEvents: 'auto' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <SceneManager />
        {children}
        <Preload all />
      </Canvas>
    </div>
  );
}
