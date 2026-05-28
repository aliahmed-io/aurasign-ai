'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/appStore';
import CustomShaderMaterial from 'three-custom-shader-material';
import { snoise } from './shaders/noise';
import { Float } from '@react-three/drei';
import { useTheme } from 'next-themes';

export function LiquidBackground() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materialRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const uploadStatus = useAppStore((state) => state.uploadStatus);
  const isProcessing = uploadStatus === 'processing';
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const isDark = !mounted || resolvedTheme === 'dark';

  // Theme-aware colors
  // Dark: bright white/grey wireframe on black
  // Light: warm creamy-brown/gold wireframe on cream
  const color1 = isDark ? '#ffffff' : '#C8A882'; // white  vs warm gold-brown
  const color2 = isDark ? '#555555' : '#8B6F47'; // dark grey vs deep brown

  const vertexShader = `
    ${snoise}

    uniform float uTime;
    uniform float uSpeed;
    uniform float uNoiseDensity;
    uniform float uNoiseStrength;
    uniform float uProcessingFactor;

    varying float vDistortion;

    void main() {
      float noiseVal = snoise(csm_Position * uNoiseDensity + uTime * uSpeed);
      float secondaryNoise = snoise(csm_Position * (uNoiseDensity * 3.0) - uTime * (uSpeed * 2.0));

      float distortion = noiseVal * uNoiseStrength;
      distortion += (secondaryNoise * uNoiseStrength * 0.5) * uProcessingFactor;

      vec3 newPosition = csm_Position + normal * distortion;
      vDistortion = distortion;
      csm_Position = newPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uProcessingFactor;

    varying float vDistortion;

    void main() {
      float mixFactor = smoothstep(-0.2, 0.2, vDistortion);
      vec3 color = mix(uColor1, uColor2, mixFactor);
      float glow = 1.0 + (vDistortion * 2.0 * uProcessingFactor);
      csm_DiffuseColor = vec4(color * glow, 1.0);
    }
  `;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: 0.2 },
    uNoiseDensity: { value: 1.5 },
    uNoiseStrength: { value: 0.3 },
    uColor1: { value: new THREE.Color(color1) },
    uColor2: { value: new THREE.Color(color2) },
    uProcessingFactor: { value: 0.0 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Keep colors in sync when theme changes
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uColor1.value.set(color1);
    materialRef.current.uniforms.uColor2.value.set(color2);
  }, [isDark, color1, color2]);

  useFrame((_state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;

      const targetProcessing = isProcessing ? 1.0 : 0.0;
      materialRef.current.uniforms.uProcessingFactor.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uProcessingFactor.value,
        targetProcessing,
        0.05
      );

      if (meshRef.current) {
        meshRef.current.rotation.y += delta * (0.1 + materialRef.current.uniforms.uProcessingFactor.value * 0.5);
        meshRef.current.rotation.x += delta * (0.05 + materialRef.current.uniforms.uProcessingFactor.value * 0.2);
      }
    }

    // Subtle core pulse
    if (coreMeshRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.001) * (isProcessing ? 0.15 : 0.04);
      coreMeshRef.current.scale.setScalar(pulse);
    }
  });

  const coreColor = isDark ? '#111111' : '#F5E6D4';

  return (
    <group position={[0, 0, -5]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[3.9, 64]} />
          <CustomShaderMaterial
            ref={materialRef}
            baseMaterial={THREE.MeshStandardMaterial}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            wireframe={true}
            transparent={true}
            opacity={isDark ? 0.8 : 0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </Float>

      {/* Subtle soft-glow core */}
      <mesh ref={coreMeshRef} scale={3.12}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={coreColor} transparent opacity={isDark ? 0.04 : 0.15} />
      </mesh>

      <ambientLight intensity={isDark ? 0.5 : 0.8} />
      <directionalLight position={[10, 10, 5]} intensity={isDark ? 2 : 1.5} color={isDark ? '#ffffff' : '#D4A373'} />
    </group>
  );
}
