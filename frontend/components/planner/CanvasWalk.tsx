'use client';
import { Suspense, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useEditorStore } from '@/store/editorStore';
import RoomMesh from './three/RoomMesh';
import FurnitureMesh from './three/FurnitureMesh';
import Lights from './three/Lights';
import WalkControls from './three/WalkControls';
import CeilingLightingSystem from './three/CeilingLightingSystem';
import { MiniMapOverlay } from './three/MiniMap';
import ControlsHint from './ControlsHint';
import { updateSceneLOD } from '@/utils/three/GeometryOptimizer';
import * as THREE from 'three';

/**
 * LODUpdater component
 * 
 * Updates all LOD objects in the scene based on camera position.
 * This should be called every frame to ensure LOD objects switch
 * detail levels appropriately as the camera moves.
 * 
 * Requirements: 1.5, 2.5, 3.5
 */
function LODUpdater() {
  const { scene, camera } = useThree();
  
  useFrame(() => {
    // Update all LOD objects in the scene based on camera position
    updateSceneLOD(scene, camera);
  });
  
  return null;
}

function CameraTracker({ onUpdate }: { onUpdate: (pos: { x: number; z: number }, angle: number) => void }) {
  useFrame(({ camera }) => {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    onUpdate({ x: camera.position.x, z: camera.position.z }, (euler.y * 180) / Math.PI);
  });
  return null;
}

function WalkScene({
  active,
  onExit,
  onCamUpdate,
}: {
  active: boolean;
  onExit: () => void;
  onCamUpdate: (pos: { x: number; z: number }, angle: number) => void;
}) {
  const items = useEditorStore((s) => s.items);
  const timeOfDay = useEditorStore((s) => s.timeOfDay);
  return (
    <>
      <Lights />
      <Environment preset={timeOfDay === 'night' ? 'night' : 'apartment'} />
      {/* OutdoorEnvironment now lazy-loaded within RoomMesh */}
      {/* <CeilingLightingSystem /> */}
      <RoomMesh />
      {items.map((item) => (
        <FurnitureMesh key={item.id} item={item} isWalkMode />
      ))}
      <WalkControls active={active} onExit={onExit} />
      <CameraTracker onUpdate={onCamUpdate} />
      {/* Update LOD objects every frame based on camera position */}
      <LODUpdater />
    </>
  );
}

export default function CanvasWalk() {
  const [active, setActive] = useState(false);
  const [camPos, setCamPos]     = useState({ x: 0, z: 0 });
  const [camAngle, setCamAngle] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const { timeOfDay, setTimeOfDay } = useEditorStore();
  const isNight = timeOfDay === 'night';

  // Hard-release WebGL context on unmount (lihat catatan di Canvas3D)
  useEffect(() => () => {
    const gl = glRef.current;
    if (!gl) return;
    try {
      gl.dispose();
      const ext = gl.getContext().getExtension('WEBGL_lose_context');
      ext?.loseContext();
    } catch (err) {
      console.warn('[CanvasWalk] cleanup error:', err);
    }
    glRef.current = null;
  }, []);

  const handleEnter = useCallback(() => {
    setActive(true);
    // Coba pointer lock untuk mouse look penuh, tapi tidak wajib
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas) canvas.requestPointerLock?.();
  }, []);

  const handleExit = useCallback(() => {
    setActive(false);
    if (document.pointerLockElement) document.exitPointerLock?.();
  }, []);

  // Esc via pointer lock release
  useEffect(() => {
    const handler = () => {
      if (!document.pointerLockElement) setActive(false);
    };
    document.addEventListener('pointerlockchange', handler);
    return () => document.removeEventListener('pointerlockchange', handler);
  }, []);

  const handleCamUpdate = useCallback((pos: { x: number; z: number }, angle: number) => {
    setCamPos(pos);
    setCamAngle(angle);
  }, []);

  return (
    <div ref={canvasRef} className="relative flex-1 overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 75, near: 0.05, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: isNight ? '#0D1020' : '#E8E5E0' }}
        onCreated={(state) => { glRef.current = state.gl; }}
      >
        <Suspense fallback={null}>
          <WalkScene active={active} onExit={handleExit} onCamUpdate={handleCamUpdate} />
        </Suspense>
      </Canvas>

      {/* Crosshair saat aktif */}
      {active && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 relative opacity-60">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white shadow" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-white shadow" />
          </div>
        </div>
      )}

      {/* Overlay awal */}
      {!active && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm cursor-pointer"
          onClick={handleEnter}
        >
          <div className="text-center text-white select-none">
            <p className="text-5xl mb-4">🚶</p>
            <p className="text-lg font-semibold">Klik untuk masuk ke ruangan</p>
            <p className="text-sm mt-2 text-white/70">WASD atau ↑↓←→ untuk jalan</p>
            <p className="text-sm text-white/70">Tahan klik kiri + gerak mouse untuk lihat sekeliling</p>
            <p className="text-xs mt-2 text-white/50">Esc atau klik tombol keluar untuk berhenti</p>
          </div>
        </div>
      )}

      {/* Tombol keluar & panduan saat aktif */}
      {active && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-xs text-white flex gap-4 pointer-events-none">
            <span>WASD / ↑↓←→ — Jalan</span>
            <span>Klik kiri + mouse — Lihat</span>
          </div>
          <button
            onClick={handleExit}
            className="bg-white/90 text-stone-700 text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 hover:bg-white transition-colors shadow-sm"
          >
            Keluar
          </button>
        </div>
      )}

      {/* Day / Night toggle */}
      {!active && (
        <button
          onClick={() => setTimeOfDay(isNight ? 'day' : 'night')}
          className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-stone-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-white transition-colors shadow-sm flex items-center gap-1.5 z-10"
          title={isNight ? 'Mode Siang' : 'Mode Malam'}
        >
          {isNight ? '☀️ Siang' : '🌙 Malam'}
        </button>
      )}

      <ControlsHint mode="walk" walkActive={active} />

      {/* Mini-map */}
      <MiniMapOverlay cameraPos={camPos} cameraAngle={camAngle} />
    </div>
  );
}
