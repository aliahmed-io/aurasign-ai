'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/appStore';
import CustomShaderMaterial from 'three-custom-shader-material';
import { snoise } from './shaders/noise';
import { Float } from '@react-three/drei';
import { useTheme } from 'next-themes';

export function LiquidBackground({ isDemo = false }: { isDemo?: boolean }) {
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
  const color1 = isDark ? '#ffffff' : '#C8A882';
  const color2 = isDark ? '#555555' : '#8B6F47';

  const vertexShader = `
    ${snoise}

    uniform float uTime;
    uniform float uSpeed;
    uniform float uNoiseDensity;
    uniform float uNoiseStrength;
    uniform float uProcessingFactor;
    uniform vec3 uMouse;
    uniform float uBurst;
    uniform float uIsDemo;

    varying float vDistortion;

    void main() {
      float noiseVal = snoise(csm_Position * uNoiseDensity + uTime * uSpeed);
      float secondaryNoise = snoise(csm_Position * (uNoiseDensity * 3.0) - uTime * (uSpeed * 2.0));

      float distortion = noiseVal * uNoiseStrength;
      distortion += (secondaryNoise * uNoiseStrength * 0.5) * uProcessingFactor;

      vec4 worldPos = modelMatrix * vec4(csm_Position, 1.0);
      float distToMouse = distance(worldPos.xyz, uMouse);
      
      // Gravity pull based on distance to mouse
      float pull = smoothstep(7.0, 0.0, distToMouse) * 2.5 * uIsDemo;
      
      // Safe normalization to prevent NaN
      vec3 diff = uMouse - worldPos.xyz;
      float diffLen = length(diff);
      vec3 directionToMouse = diffLen > 0.0001 ? diff / diffLen : vec3(0.0, 0.0, 1.0);

      vec3 newPosition = csm_Position + normal * distortion;
      
      // Apply burst shockwave
      float burstWave = sin(distToMouse * 3.0 - uTime * 15.0) * exp(-distToMouse * 0.5);
      newPosition += normal * (uBurst * 3.0 * uIsDemo * (1.0 + burstWave));
      
      // Apply intense gravity pull directly towards the mouse in 3D space
      newPosition += directionToMouse * pull;
      
      // Add subtle twist
      newPosition += cross(normal, directionToMouse) * (pull * 0.3);

      vDistortion = distortion + (pull * 0.8) + (uBurst * 1.5 * (1.0 + burstWave));
      csm_Position = newPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uProcessingFactor;

    varying float vDistortion;

    void main() {
      float mixFactor = smoothstep(-0.2, 0.5, vDistortion);
      vec3 color = mix(uColor1, uColor2, mixFactor);
      
      // Prevent negative glow which turns the mesh black
      float extraGlow = max(0.0, vDistortion) * 2.0 * max(uProcessingFactor, 0.4);
      float glow = 1.0 + extraGlow;
      
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
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uBurst: { value: 0.0 },
    uIsDemo: { value: 0.0 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Keep colors in sync when theme changes
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uColor1.value.set(color1);
    materialRef.current.uniforms.uColor2.value.set(color2);
  }, [isDark, color1, color2]);

  const burstTarget = useRef(0);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;

      const targetProcessing = isProcessing ? 1.0 : 0.0;
      materialRef.current.uniforms.uProcessingFactor.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uProcessingFactor.value,
        targetProcessing,
        0.05
      );
      
      // Interactive Mouse tracking adjusted for Z=-5 depth
      // Camera is at Z=12, Orb is at Z=-5. Total distance = 17. Target was Z=0 (dist 12).
      const scaleZ = 17.0 / 12.0;
      const x = (state.pointer.x * state.viewport.width * scaleZ) / 2;
      const y = (state.pointer.y * state.viewport.height * scaleZ) / 2;
      materialRef.current.uniforms.uMouse.value.lerp(new THREE.Vector3(x, y, -5), 0.15);
      
      burstTarget.current = THREE.MathUtils.lerp(burstTarget.current, 0, 0.05);
      materialRef.current.uniforms.uBurst.value = burstTarget.current;
      materialRef.current.uniforms.uIsDemo.value = isDemo ? 1.0 : 0.0;

      if (meshRef.current) {
        meshRef.current.rotation.y += delta * (0.1 + materialRef.current.uniforms.uProcessingFactor.value * 0.5);
        meshRef.current.rotation.x += delta * (0.05 + materialRef.current.uniforms.uProcessingFactor.value * 0.2);
      }
    }

    // Subtle core pulse and intense burst
    if (coreMeshRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.001) * (isProcessing ? 0.15 : 0.04) + (burstTarget.current * 0.8);
      coreMeshRef.current.scale.setScalar(pulse);
      coreMeshRef.current.rotation.y += delta * (burstTarget.current * 5.0);
    }
  });

  const coreColor = isDark ? '#111111' : '#F5E6D4';

  return (
    <group position={[0, 0, -5]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh 
          ref={meshRef}
          onClick={(e) => {
            if (isDemo) {
              e.stopPropagation();
              burstTarget.current = 1.0;
            }
          }}
          onPointerOver={() => {
            if (isDemo) document.body.style.cursor = 'crosshair';
          }}
          onPointerOut={() => {
            if (isDemo) document.body.style.cursor = 'auto';
          }}
        >
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
