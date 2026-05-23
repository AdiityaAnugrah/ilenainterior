'use client';
import { Suspense, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useEditorStore } from '@/store/editorStore';
import { useHasTouch } from '@/hooks/useIsMobile';
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

// Hard-release WebGL context saat Canvas unmount (gl per-canvas, gak race).
function GLContextDisposer() {
  const { gl } = useThree();
  useEffect(() => {
    return () => {
      try {
        const ext = gl.getContext().getExtension('WEBGL_lose_context');
        ext?.loseContext();
        gl.dispose();
      } catch (err) {
        console.warn('[CanvasWalk] GL cleanup error:', err);
      }
    };
  }, [gl]);
  return null;
}

function CameraTracker({ onUpdate }: { onUpdate: (pos: { x: number; z: number }, angle: number) => void }) {
  useFrame(({ camera }) => {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    onUpdate({ x: camera.position.x, z: camera.position.z }, (euler.y * 180) / Math.PI);
  });
  return null;
}

type MoveRef = React.RefObject<{ x: number; y: number }>;
type LookRef = React.RefObject<{ dx: number; dy: number }>;

function WalkScene({
  active,
  onExit,
  onCamUpdate,
  moveRef,
  lookRef,
}: {
  active: boolean;
  onExit: () => void;
  onCamUpdate: (pos: { x: number; z: number }, angle: number) => void;
  moveRef: MoveRef;
  lookRef: LookRef;
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
      <WalkControls active={active} onExit={onExit} moveRef={moveRef} lookRef={lookRef} />
      <CameraTracker onUpdate={onCamUpdate} />
      {/* Update LOD objects every frame based on camera position */}
      <LODUpdater />
    </>
  );
}

// Lapisan transparan full-screen: geser jari = lihat sekeliling (akumulasi delta).
function LookLayer({ lookRef }: { lookRef: LookRef }) {
  const last = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="absolute inset-0 z-10 touch-none"
      onTouchStart={(e) => {
        const t = e.touches[0];
        last.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (last.current) {
          lookRef.current.dx += t.clientX - last.current.x;
          lookRef.current.dy += t.clientY - last.current.y;
        }
        last.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={() => { last.current = null; }}
      onTouchCancel={() => { last.current = null; }}
    />
  );
}

// Joystick virtual untuk gerak (maju/mundur/strafe).
function Joystick({ moveRef }: { moveRef: MoveRef }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const center = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const RADIUS = 44;

  const apply = (t: React.Touch) => {
    let dx = t.clientX - center.current.x;
    let dy = t.clientY - center.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) { dx = (dx / dist) * RADIUS; dy = (dy / dist) * RADIUS; }
    setKnob({ x: dx, y: dy });
    moveRef.current.x = dx / RADIUS;       // kanan = strafe kanan
    moveRef.current.y = -dy / RADIUS;      // atas  = maju
  };

  const start = (e: React.TouchEvent) => {
    e.stopPropagation();
    const rect = baseRef.current!.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    apply(e.touches[0]);
  };
  const move = (e: React.TouchEvent) => { e.stopPropagation(); apply(e.touches[0]); };
  const end = (e: React.TouchEvent) => {
    e.stopPropagation();
    setKnob({ x: 0, y: 0 });
    moveRef.current.x = 0;
    moveRef.current.y = 0;
  };

  return (
    <div
      ref={baseRef}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      onTouchCancel={end}
      className="absolute left-5 bottom-8 z-20 w-28 h-28 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm touch-none flex items-center justify-center"
    >
      <div
        className="w-12 h-12 rounded-full bg-white/70 shadow-lg pointer-events-none"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}

export default function CanvasWalk() {
  const [active, setActive] = useState(false);
  const [camPos, setCamPos]     = useState({ x: 0, z: 0 });
  const [camAngle, setCamAngle] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { timeOfDay, setTimeOfDay } = useEditorStore();
  const isNight = timeOfDay === 'night';
  const hasTouch = useHasTouch();

  const moveRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ dx: 0, dy: 0 });
  // Cleanup WebGL context dipindah ke <GLContextDisposer /> di dalam <Canvas>.

  const handleEnter = useCallback(() => {
    setActive(true);
    // Pointer lock hanya untuk perangkat mouse; di sentuh pakai joystick + geser.
    if (!hasTouch) {
      const canvas = canvasRef.current?.querySelector('canvas');
      if (canvas) canvas.requestPointerLock?.();
    }
  }, [hasTouch]);

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
      >
        <GLContextDisposer />
        <Suspense fallback={null}>
          <WalkScene
            active={active}
            onExit={handleExit}
            onCamUpdate={handleCamUpdate}
            moveRef={moveRef}
            lookRef={lookRef}
          />
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

      {/* Kontrol sentuh: layer look (di belakang) + joystick (di depan) */}
      {active && hasTouch && (
        <>
          <LookLayer lookRef={lookRef} />
          <Joystick moveRef={moveRef} />
        </>
      )}

      {/* Overlay awal */}
      {!active && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm cursor-pointer"
          onClick={handleEnter}
        >
          <div className="text-center text-white select-none px-6">
            <p className="text-5xl mb-4">🚶</p>
            <p className="text-lg font-semibold">
              {hasTouch ? 'Ketuk untuk masuk ke ruangan' : 'Klik untuk masuk ke ruangan'}
            </p>
            {hasTouch ? (
              <>
                <p className="text-sm mt-2 text-white/70">Joystick kiri untuk jalan</p>
                <p className="text-sm text-white/70">Geser layar untuk melihat sekeliling</p>
              </>
            ) : (
              <>
                <p className="text-sm mt-2 text-white/70">WASD atau ↑↓←→ untuk jalan</p>
                <p className="text-sm text-white/70">Tahan klik kiri + gerak mouse untuk lihat sekeliling</p>
              </>
            )}
            <p className="text-xs mt-2 text-white/50">Tombol Keluar untuk berhenti</p>
          </div>
        </div>
      )}

      {/* Tombol keluar & panduan saat aktif */}
      {active && (
        <div className="absolute bottom-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-30 flex items-center gap-3">
          <div className="hidden sm:flex bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-xs text-white gap-4 pointer-events-none">
            {hasTouch ? (
              <>
                <span>Joystick — Jalan</span>
                <span>Geser layar — Lihat</span>
              </>
            ) : (
              <>
                <span>WASD / ↑↓←→ — Jalan</span>
                <span>Klik kiri + mouse — Lihat</span>
              </>
            )}
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
